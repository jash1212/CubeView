# cubeview/utils/check_data_quality.py

import psycopg2
from cubeview.models import (
    DataTable,
    Incident,
    DataQualityCheck,
    UserDatabaseConnection,
    ColumnMetadata,
)

def run_data_quality_checks(user):
    try:
        db_conn = UserDatabaseConnection.objects.get(user=user)
        conn = psycopg2.connect(
            host=db_conn.host,
            port=db_conn.port,
            dbname=db_conn.database_name,
            user=db_conn.username,
            password=db_conn.password,
            connect_timeout=5,
        )
        cursor = conn.cursor()

        # Get all public table names
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
        """)
        tables = cursor.fetchall()

        for (table_name,) in tables:
            related_table = DataTable.objects.filter(name=table_name, user=user).first()
            if not related_table:
                continue

            failed_checks = 0
            total_checks = 1  # Row count check

            # ROW COUNT CHECK
            cursor.execute(f'SELECT COUNT(*) FROM "{table_name}";')
            row_count = cursor.fetchone()[0]
            if row_count == 0:
                failed_checks += 1
                Incident.objects.create(
                    title=f"No rows in {table_name}",
                    description=f"{table_name} is empty.",
                    related_table=related_table,
                    status="ongoing",
                    severity="high",
                    incident_type="Volume"
                )

            # GET COLUMNS
            cursor.execute("""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = %s;
            """, [table_name])
            columns = cursor.fetchall()
            total_checks += len(columns)

            ColumnMetadata.objects.filter(table=related_table).delete()

            for (col, data_type) in columns:
                ColumnMetadata.objects.create(
                    table=related_table,
                    name=col,
                    data_type=data_type,
                )

                # NULL COUNT
                cursor.execute(f'SELECT COUNT(*) FROM "{table_name}" WHERE "{col}" IS NULL;')
                null_count = cursor.fetchone()[0]
                if null_count > 0:
                    failed_checks += 1
                    Incident.objects.create(
                        title=f"Nulls in {table_name}.{col}",
                        description=f"{null_count} nulls found in column '{col}'",
                        related_table=related_table,
                        status="ongoing",
                        severity="low",
                        incident_type="Field Health"
                    )

                # HIGH NULL RATIO (>30%)
                if row_count > 0:
                    null_ratio = null_count / row_count
                    if null_ratio > 0.3:
                        failed_checks += 1
                        Incident.objects.create(
                            title=f"High null ratio in {table_name}.{col}",
                            description=f"{col} has {null_ratio:.0%} nulls",
                            related_table=related_table,
                            status="ongoing",
                            severity="medium",
                            incident_type="Field Health"
                        )

                # CONSTANT VALUE COLUMN
                cursor.execute(f'SELECT COUNT(DISTINCT "{col}") FROM "{table_name}";')
                distinct_count = cursor.fetchone()[0]
                if distinct_count == 1:
                    failed_checks += 1
                    Incident.objects.create(
                        title=f"Constant column {table_name}.{col}",
                        description=f"{col} has the same value for all rows",
                        related_table=related_table,
                        status="ongoing",
                        severity="low",
                        incident_type="Field Health"
                    )

                # OUTLIER DETECTION
                if data_type in ["integer", "numeric", "double precision", "real"]:
                    cursor.execute(f'''
                        SELECT MIN("{col}"), MAX("{col}"), AVG("{col}"), STDDEV("{col}")
                        FROM "{table_name}"
                        WHERE "{col}" IS NOT NULL;
                    ''')
                    stats = cursor.fetchone()
                    if stats and all(val is not None for val in stats):
                        min_val, max_val, avg, stddev = stats
                        if stddev and (max_val > avg + 3 * stddev or min_val < avg - 3 * stddev):
                            failed_checks += 1
                            Incident.objects.create(
                                title=f"Outlier detected in {table_name}.{col}",
                                description=(
                                    f"{col} has outliers. Min: {min_val}, Max: {max_val}, "
                                    f"Mean: {avg:.2f}, Stddev: {stddev:.2f}"
                                ),
                                related_table=related_table,
                                status="ongoing",
                                severity="medium",
                                incident_type="Field Health"
                            )

            passed_percentage = ((total_checks - failed_checks) / total_checks) * 100
            DataQualityCheck.objects.create(
                table=related_table,
                passed_percentage=passed_percentage
            )

        conn.close()
        return "Check complete."

    except Exception as e:
        return f"Error: {str(e)}"
