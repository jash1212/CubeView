from datetime import timedelta
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.utils import timezone
from .utils.check_data_quality import run_data_quality_checks
from .serializers import IncidentSerializer
from .models import Incident, DataTable, ColumnMetadata, DataQualityCheck,Tag, DataTableTag
from cubeview.serializers import IncidentSerializer
from django.db.models import Q


from django.shortcuts import get_object_or_404

import psycopg2


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_user_incidents(request):
    user = request.user
    incidents = Incident.objects.filter(related_table__owner=user).order_by(
        "-created_at"
    )
    serializer = IncidentSerializer(incidents, many=True)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def run_quality_checks(request):
    user = request.user
    result = run_data_quality_checks(user)
    return Response({"result": result})


from .models import (
    DataQualityCheck,
    UserDatabaseConnection,
    DataTable,
    ColumnMetadata,
    Tag,
    Incident,
)

from .serializers import (
    UserDatabaseConnectionSerializer,
    UserSerializer,
    RegisterSerializer,
    DataTableSerializer,
)

User = get_user_model()

# ------------------ AUTH ------------------


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"message": "User registered successfully"},
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]


# ------------------ DASHBOARD ------------------


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_data(request):
    user = request.user

    # Fetch latest data quality check
    latest_check = (
        DataQualityCheck.objects.filter(table__owner=user).order_by("-run_time").first()
    )
    avg_pass = latest_check.passed_percentage if latest_check else None
    last_check = (
        latest_check.run_time.strftime("%Y-%m-%d %H:%M") if latest_check else "Never"
    )

    # Recent incidents
    recent_incidents = Incident.objects.filter(related_table__owner=user).order_by(
        "-created_at"
    )[:5]
    incident_data = [
        {"id": i.id, "title": i.title, "status": i.status} for i in recent_incidents
    ]

    # Recent tags
    tags = (
        Tag.objects.filter(datatabletag__table__owner=user)
        .distinct()
        .values_list("name", flat=True)[:5]
    )
    
    
    return Response(
        {
            
            "database": "NeonDB",  # Optional: you can fetch from UserDatabaseConnection
            "connected_tables": DataTable.objects.filter(owner=user).count(),
            "data_quality": {
                "avg_pass": avg_pass,
                "last_check": last_check,
            },
            "recent_incidents": incident_data,
            "recent_tags": list(tags),
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_summary(request):
    data = {
        "datasets": DataTable.objects.count(),
        "tags": Tag.objects.count(),
        "incidents": Incident.objects.filter(status="ongoing").count(),
    }
    return Response(data)


# ------------------ DB CONNECTION ------------------


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def connect_db(request):
    user = request.user
    data = request.data

    try:
        # ✅ Use correct keys from frontend
        conn = psycopg2.connect(
            host=data["host"],
            port=int(data.get("port", 5432)),
            dbname=data["database_name"],
            user=data["username"],
            password=data["password"],
            connect_timeout=5,
            sslmode="require",
        )
        conn.close()

        # ✅ Save DB connection
        UserDatabaseConnection.objects.update_or_create(
            user=user,
            defaults={
                "name": data.get("name", "Default Connection"),
                "db_type": data.get("db_type", "PostgreSQL"),
                "host": data["host"],
                "port": int(data.get("port", 5432)),
                "username": data["username"],
                "password": data["password"],
                "database_name": data["database_name"],
                "check_frequency": data.get("check_frequency", "hourly"),
                "is_active": True,
            },
        )

        return Response(
            {"message": "Database connected and saved successfully!"}, status=200
        )

    except Exception as e:
        print("🔴 DB Connection Error:", str(e))
        return Response({"error": str(e)}, status=400)

# ------------------ METADATA COLLECTION ------------------


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def collect_metadata(request):
    user = request.user

    try:
        db_conn = UserDatabaseConnection.objects.get(user=user)

        conn = psycopg2.connect(
            host=db_conn.host,
            port=db_conn.port,
            dbname=db_conn.database,
            user=db_conn.db_user,
            password=db_conn.db_password,
            connect_timeout=5,
            
        )
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
        """
        )
        tables = cursor.fetchall()

        for (table_name,) in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            row_count = cursor.fetchone()[0]

            dt = DataTable.objects.create(
                name=table_name, source="PostgreSQL", owner=user, description=""
            )

            cursor.execute(
                """
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = %s
            """,
                [table_name],
            )
            columns = cursor.fetchall()

            for column_name, data_type in columns:
                ColumnMetadata.objects.create(
                    table=dt, name=column_name, data_type=data_type
                )

        cursor.close()
        conn.close()

        return Response({"message": "Metadata collected and stored."})

    except UserDatabaseConnection.DoesNotExist:
        return Response({"error": "No DB connection found for this user."}, status=404)

    except Exception as e:
        return Response({"error": str(e)}, status=500)


# ------------------ FETCH USER TABLES ------------------


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def fetch_user_tables(request):
    user = request.user

    try:
        db_conn = UserDatabaseConnection.objects.get(user=user)

        conn = psycopg2.connect(
            host=db_conn.host,
            port=db_conn.port,
            dbname=db_conn.database,
            user=db_conn.db_user,
            password=db_conn.db_password,
            connect_timeout=5,
        )
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """
        )
        tables = [row[0] for row in cursor.fetchall()]

        cursor.close()
        conn.close()

        return Response({"tables": tables}, status=200)

    except UserDatabaseConnection.DoesNotExist:
        return Response(
            {"error": "No database connection found for this user."}, status=404
        )

    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_db_connection(request):
    try:
        conn = UserDatabaseConnection.objects.get(user=request.user)
        serializer = UserDatabaseConnectionSerializer(conn)
        return Response(serializer.data)
    except UserDatabaseConnection.DoesNotExist:
        return Response({})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_overview(request):
    user = request.user

    tables = DataTable.objects.filter(user=user)
    total_tables = tables.count()
    total_fields = sum([table.column_count or 0 for table in tables])
    total_tags = Tag.objects.filter(user=user).count()

    return Response(
        {
            "data_sources": 1,  # You can update this once DB connections are modeled
            "tables": total_tables,
            "fields": total_fields,
            "jobs": 0,  # Can be added later
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def health_score(request):
    user = request.user
    checks = DataQualityCheck.objects.filter(table__owner=user)

    if not checks.exists():
        return Response({"score": 100, "status": "No checks run yet."})

    passed = checks.filter(passed_percentage__gte=95).count()  # threshold = 95%
    total = checks.count()
    score = int((passed / total) * 100)

    if score >= 90:
        message = "Your data health is excellent."
    elif score >= 75:
        message = "Your data health is good."
    elif score >= 50:
        message = "Your data health needs improvement."
    else:
        message = "Critical data health issues detected."

    return Response({"score": score, "status": message})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def incident_summary(request):
    user = request.user
    incidents = Incident.objects.filter(related_table__owner=user)

    categories = {
        "Volume": 0,
        "Freshness": 0,
        "Schema Drift": 0,
        "Field Health": 0,
        "Custom": 0,
        "Job Failure": 0,
    }

    for incident in incidents:
        type_ = getattr(incident, "incident_type", "Custom")
        if type_ in categories:
            categories[type_] += 1
        else:
            categories["Custom"] += 1

    return Response(categories)



@api_view(["GET"])
@permission_classes([IsAuthenticated])
def recent_incidents(request):
    user = request.user
    days = int(request.GET.get("days", 7))
    since = timezone.now() - timedelta(days=days)

    incidents = Incident.objects.filter(
        related_table__owner=user,
        created_at__gte=since
    ).order_by("-created_at")[:10]

    data = []
    for incident in incidents:
        data.append(
            {
                "table": incident.related_table.name if incident.related_table else "N/A",
                "type": getattr(incident, "incident_type", "Custom"),
                "time": incident.created_at,
                "count": 1,
            }
        )

    return Response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def fetch_user_tables(request):
    user = request.user
    tables = DataTable.objects.filter(owner=user).prefetch_related("columns")

    data = []
    for table in tables:
        tags = table.datatabletag_set.select_related("tag").values_list("tag__name", flat=True)
        data.append({
            "id": table.id,
            "name": table.name,
            "source": table.source,
            "description": table.description,
            "created_at": table.created_at,
            "last_updated": table.last_updated,
            "tags": list(tags),
        })

    return Response(data)



@api_view(["GET"])
@permission_classes([IsAuthenticated])
def table_detail(request, table_id):
    try:
        table = DataTable.objects.get(id=table_id, owner=request.user)
        columns = ColumnMetadata.objects.filter(table=table).values("name", "data_type")
        checks = DataQualityCheck.objects.filter(table=table).order_by("-run_time")[:10]
        incidents = Incident.objects.filter(related_table=table).order_by("-created_at")[:10]

        return Response({
            "id": table.id,
            "name": table.name,
            "source": table.source,
            "description": table.description,
            "created_at": table.created_at,
            "last_updated": table.last_updated,
            "columns": list(columns),
            "checks": [
                {
                    "run_time": c.run_time,
                    "passed_percentage": c.passed_percentage,
                } for c in checks
            ],
            "incidents": [
                {
                    "title": i.title,
                    "status": i.status,
                    "created_at": i.created_at,
                } for i in incidents
            ]
        })

    except DataTable.DoesNotExist:
        return Response({"error": "Table not found"}, status=404)
    

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def table_detail_view(request, id):
    user = request.user
    table = get_object_or_404(DataTable, id=id, owner=user)

    # Basic info
    data = {
        "id": table.id,
        "name": table.name,
        "description": table.description,
        "source": table.source,
        "created_at": table.created_at,
        "last_updated": table.last_updated,
        "owner": table.owner.username,
    }

    # Tags
    tags = Tag.objects.filter(datatabletag__table=table).values_list("name", flat=True)
    data["tags"] = list(tags)

    # Columns
    columns = ColumnMetadata.objects.filter(table=table).values("name", "data_type")
    data["columns"] = list(columns)

    # Quality checks
    checks = DataQualityCheck.objects.filter(table=table).order_by("-run_time")[:5]
    data["quality_checks"] = [
        {"run_time": c.run_time, "passed_percentage": c.passed_percentage}
        for c in checks
    ]

    # Incidents
    incidents = Incident.objects.filter(related_table=table).order_by("-created_at")[:10]
    data["incidents"] = [
        {
            "title": i.title,
            "description": i.description,
            "status": i.status,
            "created_at": i.created_at,
        }
        for i in incidents
    ]

    return Response(data)

# views.py
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_user_tables(request):
    user = request.user
    tables = DataTable.objects.filter(owner=user)
    data = []
    for table in tables:
        data.append({
            "id": table.id,
            "name": table.name,
            "description": table.description,
            "last_updated": table.last_updated,
            "tags": list(table.datatabletag_set.all().values_list("tag__name", flat=True)),
        })
    return Response(data)



@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_incidents(request):
    user = request.user
    status_filter = request.GET.get("status")
    table_filter = request.GET.get("table")
    type_filter = request.GET.get("type")

    try:
        incidents = Incident.objects.filter(related_table__owner=user)

        if status_filter:
            incidents = incidents.filter(status=status_filter)

        if table_filter and table_filter.isdigit():
            incidents = incidents.filter(related_table__id=int(table_filter))

        if type_filter:
            incidents = incidents.filter(incident_type=type_filter)

        data = [
            {
                "id": i.id,
                "title": i.title,
                "status": i.status,
                "type": getattr(i, "incident_type", "Unknown"),
                "table": i.related_table.name if i.related_table else "N/A",
                "created_at": i.created_at,
            }
            for i in incidents.order_by("-created_at")
        ]

        return Response(data)
    
    except Exception as e:
        print("🔴 Incident Fetch Error:", str(e))
        return Response({"error": str(e)}, status=500)

@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def resolve_incident(request, pk):
    try:
        incident = Incident.objects.get(id=pk, related_table__owner=request.user)
        incident.status = "resolved"
        incident.save()
        return Response({"message": "Incident resolved."}, status=200)
    except Incident.DoesNotExist:
        return Response({"error": "Incident not found."}, status=404)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def incident_filter_options(request):
    user = request.user
    tables = (
        Incident.objects.filter(related_table__owner=user)
        .values_list("related_table__name", flat=True)
        .distinct()
    )
    types = (
        Incident.objects.filter(related_table__owner=user)
        .values_list("type", flat=True)
        .distinct()
    )
    return Response({
        "tables": list(tables),
        "types": list(types),
    })
