import psycopg2
import datetime
from django.utils import timezone
from django.db import transaction
from ..models import UserDatabaseConnection, DataTable, ColumnMetadata, Incident, MetricHistory, DataQualityCheck  # ⬅️ Added DataQualityCheck
from psycopg2 import sql
from datetime import timedelta

def run_data_quality_checks(user):
    db_conn = UserDatabaseConnection.objects.filter(user=user).first()
    if not db_conn:
        return {"error": "No active database connection found."}

    conn = psycopg2.connect(
        host=db_conn.host,
        port=db_conn.port,
        user=db_conn.username,
        password=db_conn.password,
        dbname=db_conn.database_name,
    )
    cursor = conn.cursor()

    tables = DataTable.objects.filter(user=user)

    total_checks = 0
    failed_checks = 0
    incidents_created = 0

    for table in tables:
        table_name = table.name
        related_table = table
        cursor.execute(sql.SQL("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = %s"), [table_name])
        columns = cursor.fetchall()

        column_names = [col for col, _ in columns]

        ### ✅ 1. Volume Check with Historical Trend
        cursor.execute(sql.SQL("SELECT COUNT(*) FROM {}").format(sql.Identifier(table_name)))
        row_count = cursor.fetchone()[0]
        total_checks += 1

        # Save volume to MetricHistory
        MetricHistory.objects.create(
            table=related_table,
            metric_type="volume",
            value=row_count,
            timestamp=timezone.now()
        )

        # Compare with 7-day average
        last_7_days = MetricHistory.objects.filter(
            table=related_table,
            metric_type="volume",
            timestamp__gte=timezone.now() - timedelta(days=7)
        ).exclude(value=0).values_list('value', flat=True)

        passed_volume = True

        if last_7_days:
            avg_volume = sum(last_7_days) / len(last_7_days)
            drop_ratio = (avg_volume - row_count) / avg_volume

            if drop_ratio > 0.5:
                failed_checks += 1
                passed_volume = False
                Incident.objects.create(
                    title=f"Significant volume drop in {table_name}",
                    description=f"Expected ~{int(avg_volume)} rows, found {row_count} ({drop_ratio*100:.1f}% drop).",
                    related_table=related_table,
                    status="ongoing",
                    severity="high",
                    incident_type="volume"
                )
                incidents_created += 1
        elif row_count == 0:
            failed_checks += 1
            passed_volume = False
            Incident.objects.create(
                title=f"No data in table {table_name}",
                description="This table contains 0 rows.",
                related_table=related_table,
                status="ongoing",
                severity="high",
                incident_type="volume"
            )
            incidents_created += 1

        # ✅ Save DataQualityCheck for volume
        DataQualityCheck.objects.create(
            table=related_table,
            run_time=timezone.now(),
            passed_percentage=100 if passed_volume else 0,
            check_type="volume"
        )

        ### ✅ 2. Field Health Checks
        for col, dtype in columns:
            total_checks += 1

            # Null Check
            cursor.execute(sql.SQL("SELECT COUNT(*) FROM {} WHERE {} IS NULL").format(
                sql.Identifier(table_name),
                sql.Identifier(col)
            ))
            null_count = cursor.fetchone()[0]

            null_ratio = 0
            passed_null = True

            if row_count > 0:
                null_ratio = null_count / row_count
                if null_ratio > 0.5:
                    failed_checks += 1
                    passed_null = False
                    Incident.objects.create(
                        title=f"High null ratio in {col} of {table_name}",
                        description=f"{null_ratio*100:.2f}% values are NULL.",
                        related_table=related_table,
                        status="ongoing",
                        severity="medium",
                        incident_type="field_health"
                    )
                    incidents_created += 1

            # Constant Value Check
            cursor.execute(sql.SQL("SELECT COUNT(DISTINCT {}) FROM {}").format(
                sql.Identifier(col),
                sql.Identifier(table_name)
            ))
            distinct_count = cursor.fetchone()[0]

            passed_constant = True
            if distinct_count == 1:
                failed_checks += 1
                passed_constant = False
                Incident.objects.create(
                    title=f"Field {col} has constant value in {table_name}",
                    description=f"All rows have same value in {col}.",
                    related_table=related_table,
                    status="ongoing",
                    severity="low",
                    incident_type="field_health"
                )
                incidents_created += 1

            # ✅ Save DataQualityCheck for field health (average of null and constant score)
            passed_score = 100
            if not passed_null and not passed_constant:
                passed_score = 0
            elif not passed_null or not passed_constant:
                passed_score = 50

            DataQualityCheck.objects.create(
                table=related_table,
                run_time=timezone.now(),
                passed_percentage=passed_score,
                check_type="field_health"
            )


        ### ✅ 3. Freshness Check (detect timestamp column dynamically)
        timestamp_columns = [col for col in column_names if col in ['updated_at', 'created_at', 'event_time', 'timestamp']]

        if timestamp_columns:
            freshness_checked = False
            for ts_col in timestamp_columns:
                try:
                    cursor.execute(sql.SQL("SELECT MAX({}) FROM {}").format(
                        sql.Identifier(ts_col),
                        sql.Identifier(table_name)
                    ))
                    last_update = cursor.fetchone()[0]
                    if last_update:
                        time_diff = datetime.datetime.now() - last_update
                        hours_old = time_diff.total_seconds() / 3600
                        freshness_score = max(0, 100 - min(hours_old, 48))  # Decay logic

                        DataQualityCheck.objects.create(
                            table=related_table,
                            run_time=timezone.now(),
                            passed_percentage=freshness_score,
                            check_type="freshness",
                        )

                        if hours_old > 24:
                            total_checks += 1
                            failed_checks += 1
                            Incident.objects.create(
                                title=f"Stale data in {table_name}",
                                description=f"Last update was {hours_old:.1f} hours ago via `{ts_col}`.",
                                related_table=related_table,
                                status="ongoing",
                                severity="medium",
                                incident_type="freshness"
                            )
                            incidents_created += 1
                        else:
                            total_checks += 1
                        freshness_checked = True
                        break
                except Exception:
                    continue

            if not freshness_checked:
                total_checks += 1
                DataQualityCheck.objects.create(
                    table=related_table,
                    run_time=timezone.now(),
                    passed_percentage=0,
                    check_type="freshness",
                )
                Incident.objects.create(
                    title=f"Freshness check skipped for {table_name}",
                    description="No valid timestamp column available.",
                    related_table=related_table,
                    status="ongoing",
                    severity="low",
                    incident_type="freshness"
                )
                incidents_created += 1

        ### ✅ 4. Schema Drift Check (Improved)
        prev_columns = ColumnMetadata.objects.filter(table=related_table)
        prev_schema = {col.name: col.data_type for col in prev_columns}
        curr_schema = {col: dtype for col, dtype in columns}

        if prev_schema:
            added_cols = set(curr_schema.keys()) - set(prev_schema.keys())
            removed_cols = set(prev_schema.keys()) - set(curr_schema.keys())
            changed_types = {
                col: (prev_schema[col], curr_schema[col])
                for col in curr_schema
                if col in prev_schema and curr_schema[col] != prev_schema[col]
            }

            drift_detected = bool(added_cols or removed_cols or changed_types)

            if drift_detected:
                failed_checks += 1
                total_checks += 1
                score = 0
            else:
                total_checks += 1
                score = 100

            DataQualityCheck.objects.create(
                table=related_table,
                run_time=timezone.now(),
                passed_percentage=score,
                check_type="schema_drift",
            )

            if drift_detected:
                drift_msgs = []
                if added_cols:
                    drift_msgs.append(f"➕ Columns added: {', '.join(added_cols)}")
                if removed_cols:
                    drift_msgs.append(f"➖ Columns removed: {', '.join(removed_cols)}")
                if changed_types:
                    for col, (old, new) in changed_types.items():
                        drift_msgs.append(f"🔄 `{col}` changed: {old} → {new}")

                Incident.objects.create(
                    title=f"Schema drift detected in {table_name}",
                    description="\n".join(drift_msgs),
                    related_table=related_table,
                    status="ongoing",
                    severity="high",
                    incident_type="schema_drift"
                )

        # Save current schema for next drift check
        ColumnMetadata.objects.filter(table=related_table).delete()
        ColumnMetadata.objects.bulk_create([
            ColumnMetadata(table=related_table, name=col, data_type=dtype)
            for col, dtype in columns
        ])

    conn.close()

    return {
        "status": "completed",
        "total_checks": total_checks,
        "failed_checks": failed_checks,
        "incidents_created": incidents_created
    }
