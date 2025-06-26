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
from .models import Incident


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
    checks = DataQualityCheck.objects.filter(user=user)

    if not checks.exists():
        return Response({"score": 100, "status": "No checks run yet."})

    passed = checks.filter(passed=True).count()
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
    incidents = Incident.objects.filter(user=user)

    categories = {
        "Volume": 0,
        "Freshness": 0,
        "Schema Drift": 0,
        "Field Health": 0,
        "Custom": 0,
        "Job Failure": 0,
    }

    for incident in incidents:
        type_ = incident.incident_type  # assuming field `incident_type`
        if type_ in categories:
            categories[type_] += 1
        else:
            categories["Custom"] += 1  # fallback

    return Response(categories)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def recent_incidents(request):
    user = request.user
    days = int(request.GET.get("days", 7))
    since = timezone.now() - timedelta(days=days)

    incidents = Incident.objects.filter(user=user, created_at__gte=since).order_by(
        "-created_at"
    )[:10]

    data = []
    for incident in incidents:
        data.append(
            {
                "table": (
                    incident.table.name if incident.table else "N/A"
                ),  # assuming FK
                "type": incident.incident_type,
                "time": incident.created_at,
                "count": 1,  # or total events if stored
            }
        )

    return Response(data)
