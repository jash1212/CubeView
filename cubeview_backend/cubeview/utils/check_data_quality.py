# cubeview/utils/check_data_quality.py

import psycopg2
from cubeview.models import DataTable, Incident, UserDatabaseConnection

def run_data_quality_checks(user):
    try:
        db_conn = UserDatabaseConnection.objects.get(user=user)
        conn = psycopg2.connect(
            host=db_conn.host,
            port=db_conn.port,
            dbname=db_conn.database,
            user=db_conn.db_user,
            password=db_conn.db_password
        )
        cursor = conn.cursor()

        # Step 1: Get all table names
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
        """)
        tables = cursor.fetchall()

        for (table_name,) in tables:
            # Check 1: Row count
            cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
            row_count = cursor.fetchone()[0]
            if row_count == 0:
                Incident.objects.create(
                    title=f"No rows in {table_name}",
                    description=f"{table_name} is empty.",
                    related_table=DataTable.objects.filter(name=table_name, owner=user).first(),
                    status="ongoing"
                )

            # Check 2: Nulls in each column
            cursor.execute(f"""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = %s;
            """, [table_name])
            columns = cursor.fetchall()

            for (col,) in columns:
                cursor.execute(f"""
                    SELECT COUNT(*) FROM {table_name} WHERE "{col}" IS NULL;
                """)
                null_count = cursor.fetchone()[0]
                if null_count > 0:
                    Incident.objects.create(
                        title=f"Nulls in {table_name}.{col}",
                        description=f"{null_count} nulls found in column '{col}' of table '{table_name}'",
                        related_table=DataTable.objects.filter(name=table_name, owner=user).first(),
                        status="ongoing"
                    )

        conn.close()
        return "Check complete."

    except Exception as e:
        return f"Error: {str(e)}"
