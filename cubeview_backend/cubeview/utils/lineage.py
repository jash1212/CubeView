from django.db import connection, transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import (
    UserDatabaseConnection,
    DataTable,
    ColumnMetadata,
    LineageNode,
    LineageEdge,
)

@transaction.atomic
def sync_lineage_from_foreign_keys(user):
    """
    Sync lineage based on foreign key relationships from the active user's DB connection.
    Deletes existing lineage nodes and edges, recreates from current metadata + FK info.
    """
    db_conn = UserDatabaseConnection.objects.filter(user=user, is_active=True).first()
    if not db_conn:
        raise ValueError("No active DB connection found for user")

    # Clear old lineage data
    LineageEdge.objects.filter(
        from_node__user=user, from_node__connection=db_conn
    ).delete()
    LineageEdge.objects.filter(
        to_node__user=user, to_node__connection=db_conn
    ).delete()
    LineageNode.objects.filter(user=user, connection=db_conn).delete()

    # Create nodes for tables and columns
    tables = DataTable.objects.filter(user=user, connection=db_conn)
    table_nodes = {}
    for table in tables:
        tn = LineageNode.objects.create(
            user=user,
            connection=db_conn,
            table=table,
            node_type=LineageNode.TABLE,
            table_name=table.name,
        )
        table_nodes[table.name] = tn

        for column in table.columns.all():
            LineageNode.objects.create(
                user=user,
                connection=db_conn,
                table=table,
                column=column,
                node_type=LineageNode.FIELD,
                table_name=table.name,
                column_name=column.name,
            )

    # Connect to the actual DB and query foreign key constraints
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                tc.table_name AS from_table,
                kcu.column_name AS from_column,
                ccu.table_name AS to_table,
                ccu.column_name AS to_column
            FROM
                information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                 AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                 AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';
            """
        )
        fks = cursor.fetchall()

    # For each FK, create edges from referencing table to referenced table
    for from_table, from_col, to_table, to_col in fks:
        from_node = table_nodes.get(from_table)
        to_node = table_nodes.get(to_table)
        if not from_node or not to_node:
            continue

        # Find LineageNode for from_column and to_column
        try:
            from_col_node = LineageNode.objects.get(
                user=user,
                connection=db_conn,
                table__name=from_table,
                column__name=from_col,
                node_type=LineageNode.FIELD,
            )
        except LineageNode.DoesNotExist:
            from_col_node = None

        try:
            to_col_node = LineageNode.objects.get(
                user=user,
                connection=db_conn,
                table__name=to_table,
                column__name=to_col,
                node_type=LineageNode.FIELD,
            )
        except LineageNode.DoesNotExist:
            to_col_node = None

        # Create edge at column level if possible
        if from_col_node and to_col_node:
            LineageEdge.objects.get_or_create(
                from_node=from_col_node,
                to_node=to_col_node,
                source="foreign_key",
                detail=f"FK {from_table}.{from_col} → {to_table}.{to_col}",
            )
        else:
            # fallback to table level edge
            LineageEdge.objects.get_or_create(
                from_node=from_node,
                to_node=to_node,
                source="foreign_key",
                detail=f"FK {from_table} → {to_table}",
            )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_lineage_graph(request):
    """
    API endpoint to get lineage graph (nodes + edges) for active user connection.
    """
    user = request.user
    connection = UserDatabaseConnection.objects.filter(user=user, is_active=True).first()
    if not connection:
        return Response({"nodes": [], "edges": []})

    nodes_qs = LineageNode.objects.filter(user=user, connection=connection)
    edges_qs = LineageEdge.objects.filter(from_node__user=user, from_node__connection=connection)

    nodes = [
        {
            "id": node.id,
            "label": node.label(),
            "type": node.node_type,
            "table": node.table.name if node.table else node.table_name,
            "column": node.column.name if node.column else node.column_name,
        }
        for node in nodes_qs
    ]

    edges = [
        {
            "from": edge.from_node.id,
            "to": edge.to_node.id,
            "source": edge.source,
            "detail": edge.detail,
        }
        for edge in edges_qs
    ]

    return Response({"nodes": nodes, "edges": edges})
