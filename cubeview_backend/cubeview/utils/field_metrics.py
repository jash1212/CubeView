import psycopg2
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from cubeview.models import DataTable, UserDatabaseConnection


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_field_metrics(request, table_id):
    user = request.user

    try:
        table = DataTable.objects.get(id=table_id, owner=user)
        db_conn = UserDatabaseConnection.objects.get(user=user)

        # Direct psycopg2 connection (inline)
        conn = psycopg2.connect(
            host=db_conn.host,
            port=db_conn.port,
            dbname=db_conn.database_name,
            user=db_conn.username,
            password=db_conn.password,
            connect_timeout=5,
            sslmode="require"
        )
        cursor = conn.cursor()

        # Get column names
        cursor.execute(f'SELECT * FROM "{table.name}" LIMIT 0')
        columns = [desc[0] for desc in cursor.description]

        metrics = {}

        for col in columns:
            # Total rows
            cursor.execute(f'SELECT COUNT(*) FROM "{table.name}"')
            total_rows = cursor.fetchone()[0] or 1  # prevent division by zero

            # Null count
            cursor.execute(f'SELECT COUNT(*) FROM "{table.name}" WHERE "{col}" IS NULL')
            nulls = cursor.fetchone()[0]

            # Distinct count
            cursor.execute(f'SELECT COUNT(DISTINCT "{col}") FROM "{table.name}"')
            distinct = cursor.fetchone()[0]

            metrics[col] = {
                "null_percentage": round((nulls / total_rows) * 100, 2),
                "distinct_percentage": round((distinct / total_rows) * 100, 2),
                "total_rows": total_rows
            }

        cursor.close()
        conn.close()

        return Response(metrics)

    except DataTable.DoesNotExist:
        return Response({"error": "Table not found"}, status=404)
    except UserDatabaseConnection.DoesNotExist:
        return Response({"error": "No DB connection found for this user"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)
