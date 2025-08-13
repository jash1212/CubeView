import psycopg2
from psycopg2 import sql
import datetime
from datetime import timedelta
from django.utils import timezone
from django.db import transaction

from .custom_rule_executor import execute_custom_rules
from ..models import (
    UserDatabaseConnection, DataTable, ColumnMetadata,
    Incident, MetricHistory, DataQualityCheck
)


def run_data_quality_checks(user):
    db_conn = UserDatabaseConnection.objects.filter(user=user).first()
    if not db_conn:
        return {"error": "No active database connection found."}

    try:
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

        execute_custom_rules(user)
        now = timezone.now()

        for table in tables:
            table_name = table.name

            # Fetch columns and types
            cursor.execute(
                sql.SQL("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = %s"),
                [table_name]
            )
            columns = cursor.fetchall()
            column_names = [col for col, _ in columns]

            # --- Volume Check ---
            cursor.execute(
                sql.SQL("SELECT COUNT(*) FROM {}").format(sql.Identifier(table_name))
            )
            row_count = cursor.fetchone()[0]
            total_checks += 1

            MetricHistory.objects.create(
                table=table,
                metric_type="volume",
                value=row_count,
                timestamp=now
            )

            last_7_days = MetricHistory.objects.filter(
                table=table,
                metric_type="volume",
                timestamp__gte=now - timedelta(days=7)
            ).exclude(value=0).values_list('value', flat=True)

            passed_volume = True
            if last_7_days:
                avg_volume = sum(last_7_days) / len(last_7_days)
                drop_ratio = (avg_volume - row_count) / avg_volume
                if drop_ratio > 0.5:
                    passed_volume = False
            elif row_count == 0:
                passed_volume = False

            if not passed_volume:
                failed_checks += 1
                if not Incident.objects.filter(
                    related_table=table,
                    incident_type="volume",
                    status="ongoing"
                ).exists():
                    Incident.objects.create(
                        title=f"Volume issue in {table_name}",
                        description=f"Row count is {row_count}.",
                        related_table=table,
                        status="ongoing",
                        severity="high",
                        incident_type="volume"
                    )
                    incidents_created += 1
            else:
                Incident.objects.filter(
                    related_table=table,
                    incident_type="volume",
                    status="ongoing"
                ).update(status="resolved", resolved_at=now)

            DataQualityCheck.objects.create(
                table=table,
                run_time=now,
                passed_percentage=100 if passed_volume else 0,
                check_type="volume"
            )

            # --- Field Health Checks ---
            for col, dtype in columns:
                total_checks += 1

                # Null check
                cursor.execute(
                    sql.SQL("SELECT COUNT(*) FROM {} WHERE {} IS NULL").format(
                        sql.Identifier(table_name), sql.Identifier(col)
                    )
                )
                null_count = cursor.fetchone()[0]
                null_ratio = null_count / row_count if row_count > 0 else 0
                passed_null = null_ratio <= 0.5

                # Constant check
                cursor.execute(
                    sql.SQL("SELECT COUNT(DISTINCT {}) FROM {}").format(
                        sql.Identifier(col), sql.Identifier(table_name)
                    )
                )
                distinct_count = cursor.fetchone()[0]
                passed_constant = distinct_count > 1

                score = 100 if passed_null and passed_constant else 50 if passed_null or passed_constant else 0
                if score < 100:
                    failed_checks += 1
                    if not Incident.objects.filter(
                        related_table=table,
                        incident_type="field_health",
                        status="ongoing"
                    ).exists():
                        Incident.objects.create(
                            title=f"Field health issue in {col} of {table_name}",
                            description="High nulls or constant values detected.",
                            related_table=table,
                            status="ongoing",
                            severity="medium",
                            incident_type="field_health"
                        )
                        incidents_created += 1
                else:
                    Incident.objects.filter(
                        related_table=table,
                        incident_type="field_health",
                        status="ongoing"
                    ).update(status="resolved", resolved_at=now)

                DataQualityCheck.objects.create(
                    table=table,
                    run_time=now,
                    passed_percentage=score,
                    check_type="field_health"
                )

            # --- Freshness ---
            timestamp_columns = [c for c in column_names if c in ['updated_at', 'created_at', 'event_time', 'timestamp']]
            for ts_col in timestamp_columns:
                try:
                    cursor.execute(
                        sql.SQL("SELECT MAX({}) FROM {}").format(
                            sql.Identifier(ts_col), sql.Identifier(table_name)
                        )
                    )
                    last_update = cursor.fetchone()[0]
                    if last_update:
                        time_diff = now - last_update
                        hours_old = time_diff.total_seconds() / 3600
                        freshness_score = max(0, 100 - min(hours_old, 48))

                        DataQualityCheck.objects.create(
                            table=table,
                            run_time=now,
                            passed_percentage=freshness_score,
                            check_type="freshness",
                        )

                        if hours_old > 24:
                            failed_checks += 1
                            if not Incident.objects.filter(
                                related_table=table,
                                incident_type="freshness",
                                status="ongoing"
                            ).exists():
                                Incident.objects.create(
                                    title=f"Stale data in {table_name}",
                                    description=f"Last update was {hours_old:.1f} hours ago via `{ts_col}`.",
                                    related_table=table,
                                    status="ongoing",
                                    severity="medium",
                                    incident_type="freshness"
                                )
                                incidents_created += 1
                        else:
                            Incident.objects.filter(
                                related_table=table,
                                incident_type="freshness",
                                status="ongoing"
                            ).update(status="resolved", resolved_at=now)
                        break
                except Exception:
                    continue

            # --- Schema Drift ---
            prev_columns = ColumnMetadata.objects.filter(table=table)
            prev_schema = {col.name: col.data_type for col in prev_columns}
            curr_schema = {col: dtype for col, dtype in columns}

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
                if not Incident.objects.filter(
                    related_table=table,
                    incident_type="schema_drift",
                    status="ongoing"
                ).exists():
                    Incident.objects.create(
                        title=f"Schema drift in {table_name}",
                        description=f"Added: {added_cols}, Removed: {removed_cols}, Changed: {changed_types}",
                        related_table=table,
                        status="ongoing",
                        severity="high",
                        incident_type="schema_drift"
                    )
                    incidents_created += 1
                score = 0
            else:
                Incident.objects.filter(
                    related_table=table,
                    incident_type="schema_drift",
                    status="ongoing"
                ).update(status="resolved", resolved_at=now)
                score = 100

            DataQualityCheck.objects.create(
                table=table,
                run_time=now,
                passed_percentage=score,
                check_type="schema_drift"
            )

            ColumnMetadata.objects.filter(table=table).delete()
            ColumnMetadata.objects.bulk_create([
                ColumnMetadata(table=table, name=col, data_type=dtype)
                for col, dtype in columns
            ])

        return {
            "status": "completed",
            "total_checks": total_checks,
            "failed_checks": failed_checks,
            "incidents_created": incidents_created
        }

    finally:
        if 'conn' in locals():
            conn.close()
