# Standard Library
import datetime
import json
import os
import re
import traceback
from datetime import timedelta

# Django
from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, Q
from django.db.models.functions import TruncDate
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.timezone import now
import requests
from .ml.utils import detect_anomalies  # ✅ Import from updated utils
from .utils.constants import HEALTH_SCORE_WEIGHTS


# REST Framework
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

# Third-Party
import psycopg2

# Local App: Models
from .models import (
    DataTable,
    ColumnMetadata,
    FieldMetric,
    Incident,
    DataQualityCheck,
    MetricHistory,
    RuleEngine,
    RuleExecutionHistory,
    UserDatabaseConnection,
    Tag,
    DataTableTag,
    DataQualityRule,
)

# Local App: Serializers
from .serializers import (
    DataQualityRuleSerializer,
    UserSerializer,
    RegisterSerializer,
    DataTableSerializer,
    UserDatabaseConnectionSerializer,
    IncidentSerializer,
    ExportedMetadataSerializer,
    DataQualityCheckSerializer,
)

# Local App: Utils

from .utils.check_data_quality import run_data_quality_checks
from .utils.generate_documentation import (
    generate_table_documentation as generate_doc_for_table,
)

# ML
from .ml.utils import detect_anomalies


User = get_user_model()


# Utils
def get_active_connection(user):
    return UserDatabaseConnection.objects.filter(user=user, is_active=True).first()


class IncidentPagination(PageNumberPagination):
    page_size = 20


# ---------------- AUTH ----------------


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


# ---------------- INCIDENTS ----------------


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_user_incidents(request):
    user = request.user
    incidents = Incident.objects.filter(related_table__user=user).order_by(
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


# ---------------- DASHBOARD ----------------


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_data(request):
    user = request.user
    conn = get_active_connection(user)
    if not conn:
        return Response({"error": "No active connection found."}, status=404)

    total_tables = DataTable.objects.filter(user=user, connection=conn).count()
    total_fields = ColumnMetadata.objects.filter(
        table__user=user, table__connection=conn
    ).count()
    total_sources = UserDatabaseConnection.objects.filter(user=user).count()
    total_jobs = 0  # Future: add job tracking

    checks = DataQualityCheck.objects.filter(table__user=user, table__connection=conn)
    last_check = checks.order_by("-run_time").first()
    avg_pass = (
        checks.aggregate(Avg("passed_percentage")).get("passed_percentage__avg", 0) or 0
    )

    recent_tags = (
        Tag.objects.filter(
            datatabletag__table__user=user, datatabletag__table__connection=conn
        )
        .values_list("name", flat=True)
        .distinct()[:5]
    )

    return Response(
        {
            "connected_tables": total_tables,
            "data_overview": {
                "sources": total_sources,
                "tables": total_tables,
                "fields": total_fields,
                "jobs": total_jobs,
            },
            "data_quality": {
                "last_check": last_check.run_time if last_check else None,
                "avg_pass": avg_pass,
            },
            "recent_tags": list(recent_tags),
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


# ---------------- DATABASE CONNECTION ----------------


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def connect_db(request):
    user = request.user
    data = request.data

    try:
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
                "is_active": True,
            },
        )

        return Response(
            {"message": "Database connected and saved successfully!"}, status=200
        )

    except Exception as e:
        print("🔴 DB Connection Error:", str(e))
        return Response({"error": str(e)}, status=400)


# ---------------- METADATA COLLECTION ----------------


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def collect_metadata(request):
    user = request.user

    try:
        db_conn = UserDatabaseConnection.objects.get(user=user, is_active=True)

        conn = psycopg2.connect(
            host=db_conn.host,
            port=db_conn.port,
            dbname=db_conn.database_name,
            user=db_conn.username,
            password=db_conn.password,
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
        current_tables = set(row[0] for row in cursor.fetchall())

        existing_tables = DataTable.objects.filter(user=user, connection=db_conn)
        for t in existing_tables:
            if t.name not in current_tables:
                print("🗑️ Removing:", t.name)
                t.delete()

        for table_name in current_tables:
            existing = DataTable.objects.filter(
                name=table_name, user=user, connection=db_conn
            )
            if existing.count() > 1:
                existing.delete()

            dt = existing.first()
            if not dt:
                dt = DataTable.objects.create(
                    name=table_name,
                    user=user,
                    connection=db_conn,
                    source=db_conn.name,
                    description="",
                    last_updated=timezone.now(),
                )
            else:
                dt.last_updated = timezone.now()
                dt.save()

            ColumnMetadata.objects.filter(table=dt).delete()
            cursor.execute(
                """
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = %s;
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
        return Response({"message": "Metadata synced with DB."})

    except UserDatabaseConnection.DoesNotExist:
        return Response(
            {"error": "No active DB connection found for this user."}, status=404
        )
    except Exception as e:
        print("🔴 Metadata Collection Error:")
        traceback.print_exc()
        return Response({"error": str(e)}, status=500)


# ------------------ USER DB CONNECTION ------------------


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_db_connection(request):
    try:
        conn = get_active_connection(request.user)
        serializer = UserDatabaseConnectionSerializer(conn)
        return Response(serializer.data)
    except:
        return Response({})


# ------------------ DASHBOARD OVERVIEW ------------------


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_overview(request):
    user = request.user
    conn = get_active_connection(user)
    tables = DataTable.objects.filter(user=user, connection=conn)

    total_tables = tables.count()
    total_fields = sum([table.column_count or 0 for table in tables])
    total_tags = Tag.objects.filter(user=user).count()

    return Response(
        {
            "data_sources": 1,
            "tables": total_tables,
            "fields": total_fields,
            "jobs": 0,
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def health_score(request):
    user = request.user
    conn = get_active_connection(user)

    if not conn:
        return Response({"error": "No active DB connection."}, status=404)

    # Fetch all checks for current user and connection
    checks = DataQualityCheck.objects.filter(table__user=user, table__connection=conn)

    if not checks.exists():
        return Response({"score": 100, "status": "No checks run yet."})

    total_score = 0
    total_weight = 0

    for check_type, weight in HEALTH_SCORE_WEIGHTS.items():
        check_group = checks.filter(check_type=check_type)
        if not check_group.exists():
            continue

        passed = check_group.filter(passed_percentage__gte=95).count()
        total = check_group.count()

        if total == 0:
            continue  # Avoid divide-by-zero

        type_score = (passed / total) * 100
        weighted_score = type_score * weight

        total_score += weighted_score
        total_weight += weight

    # Normalize score by total weight to avoid underestimation
    final_score = round(total_score / total_weight) if total_weight else 0

    # Optional penalty for unresolved incidents
    ongoing = Incident.objects.filter(
        related_table__user=user,
        related_table__connection=conn,
        status="ongoing"
    ).count()

    if ongoing:
        final_score = max(final_score - 5, 0)  # Deduct 5 points for unresolved issues

    # Status message
    if final_score >= 90:
        message = "Your data health is excellent."
    elif final_score >= 75:
        message = "Your data health is good."
    elif final_score >= 50:
        message = "Your data health needs improvement."
    else:
        message = "Critical data health issues detected."

    return Response({
        "score": final_score,
        "status": message,
        "ongoing_incidents": ongoing
    })


# ------------------ INCIDENTS ------------------


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def incident_summary(request):
    user = request.user
    conn = get_active_connection(user)
    incidents = Incident.objects.filter(
        related_table__user=user, related_table__connection=conn
    )

    categories = [
        "volume",
        "freshness",
        "schema_drift",
        "field_health",
        "job_failure",
        "custom",
    ]
    counts = {cat: 0 for cat in categories}

    for i in incidents:
        itype = (i.incident_type or "custom").strip().lower().replace(" ", "_")

        if itype in counts:
            counts[itype] += 1
        else:
            counts["custom"] += 1

    return Response(counts)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def recent_incidents(request):
    user = request.user
    days = int(request.GET.get("days", 7))
    since = timezone.now() - timedelta(days=days)

    incidents = (
        Incident.objects.filter(related_table__user=user, created_at__gte=since)
        .select_related("related_table")
        .order_by("-created_at")[:10]
    )

    data = [
        {
            "table": i.related_table.name if i.related_table else "N/A",
            "type": i.incident_type or "Custom",
            "time": i.created_at,
            "count": 1,
        }
        for i in incidents
    ]

    return Response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_incidents(request):
    user = request.user
    status_filter = request.GET.get("status")
    table_filter = request.GET.get("table")
    type_filter = request.GET.get("type")

    incidents = Incident.objects.filter(related_table__user=user)

    if status_filter:
        incidents = incidents.filter(status=status_filter)
    if table_filter:
        incidents = incidents.filter(related_table__name=table_filter)
    if type_filter:
        incidents = incidents.filter(incident_type=type_filter)

    incidents = incidents.select_related("related_table").order_by("-created_at")

    paginator = PageNumberPagination()
    paginator.page_size = 10
    result_page = paginator.paginate_queryset(incidents, request)

    data = [
        {
            "id": i.id,
            "title": i.title,
            "status": i.status,
            "type": i.incident_type or "Unknown",
            "severity": i.severity,
            "table": i.related_table.name if i.related_table else "N/A",
            "created_at": i.created_at,
            "description": i.description,
            "resolved_at": i.resolved_at,
        }
        for i in result_page
    ]

    return paginator.get_paginated_response(data)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def resolve_incident(request, pk):
    try:
        incident = Incident.objects.get(id=pk, related_table__user=request.user)
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
        Incident.objects.filter(related_table__user=user)
        .values_list("related_table__name", flat=True)
        .distinct()
    )
    types = (
        Incident.objects.filter(related_table__user=user)
        .values_list("incident_type", flat=True)
        .distinct()
    )
    return Response({"tables": list(tables), "types": list(types)})


# ------------------ TABLE VIEWS ------------------


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def fetch_user_tables(request):
    user = request.user
    conn = get_active_connection(user)
    tables = DataTable.objects.filter(user=user, connection=conn).prefetch_related(
        "datatabletag_set", "columns"
    )

    data = []
    for t in tables:
        tags = t.datatabletag_set.select_related("tag").values_list(
            "tag__name", flat=True
        )
        data.append(
            {
                "id": t.id,
                "name": t.name,
                "source": t.source,
                "description": t.description,
                "created_at": t.created_at,
                "last_updated": t.last_updated,
                "tags": list(tags),
            }
        )
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_user_tables(request):
    user = request.user
    conn = get_active_connection(user)
    tables = DataTable.objects.filter(user=user, connection=conn)

    data = []
    for t in tables:
        tags = t.datatabletag_set.values_list("tag__name", flat=True)
        data.append(
            {
                "id": t.id,
                "name": t.name,
                "description": t.description,
                "last_updated": t.last_updated,
                "tags": list(tags),
            }
        )
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def table_detail(request, table_id):
    user = request.user
    table = get_object_or_404(DataTable, id=table_id, user=user)

    columns = ColumnMetadata.objects.filter(table=table).values("name", "data_type")
    checks = DataQualityCheck.objects.filter(table=table).order_by("-run_time")[:10]
    incidents = Incident.objects.filter(related_table=table).order_by("-created_at")[
        :10
    ]

    return Response(
        {
            "id": table.id,
            "name": table.name,
            "source": table.source,
            "description": table.description,
            "created_at": table.created_at,
            "last_updated": table.last_updated,
            "columns": list(columns),
            "quality_checks": [
                {"run_time": c.run_time, "passed_percentage": c.passed_percentage}
                for c in checks
            ],
            "incidents": [
                {"title": i.title, "status": i.status, "created_at": i.created_at}
                for i in incidents
            ],
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def table_detail_view(request, id):
    user = request.user
    table = get_object_or_404(DataTable, id=id, user=user)

    tags = Tag.objects.filter(datatabletag__table=table).values_list("name", flat=True)
    columns = ColumnMetadata.objects.filter(table=table).values("name", "data_type")
    checks = DataQualityCheck.objects.filter(table=table).order_by("-run_time")[:5]
    incidents = Incident.objects.filter(related_table=table).order_by("-created_at")[
        :10
    ]

    return Response(
        {
            "id": table.id,
            "name": table.name,
            "description": table.description,
            "source": table.source,
            "created_at": table.created_at,
            "last_updated": table.last_updated,
            "owner": table.user.username,
            "tags": list(tags),
            "columns": list(columns),
            "quality_checks": [
                {"run_time": c.run_time, "passed_percentage": c.passed_percentage}
                for c in checks
            ],
            "incidents": [
                {
                    "title": i.title,
                    "description": i.description,
                    "status": i.status,
                    "created_at": i.created_at,
                }
                for i in incidents
            ],
        }
    )


# ------------------ DOC GENERATION ------------------


def generate_table_documentation(table_id):
    table = get_object_or_404(DataTable, id=table_id)
    db_conn = get_active_connection(table.user)
    if not db_conn:
        raise Exception("Active DB connection not found.")

    conn = psycopg2.connect(
        host=db_conn.host,
        port=db_conn.port,
        user=db_conn.username,
        password=db_conn.password,
        dbname=db_conn.database_name,
    )

    cursor = conn.cursor()
    cursor.execute(f'SELECT * FROM "{table.name}" LIMIT 0')
    column_names = [desc[0] for desc in cursor.description]
    conn.close()

    return generate_doc_for_table(table, column_names)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_docs(request, table_id):
    try:
        doc = generate_table_documentation(table_id)
        return Response({"documentation": doc}, status=200)
    except Exception as e:
        traceback.print_exc()
        return Response({"error": str(e)}, status=500)


# ------------------ FIELD METRICS ------------------


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def calculate_metrics(request, table_id):
    user = request.user
    table = get_object_or_404(DataTable, id=table_id, user=user)
    db_conn = get_active_connection(user)
    if not db_conn:
        return Response({"error": "No active DB connection."}, status=404)

    from .utils.field_metrics import calculate_field_metrics

    results = calculate_field_metrics(table, db_conn)

    for metric in results:
        FieldMetric.objects.update_or_create(
            table=table, column=metric["column"], defaults=metric
        )

    return Response({"message": "Field-level metrics calculated!"})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def field_metrics(request, table_id):
    user = request.user
    table = get_object_or_404(DataTable, id=table_id, user=user)
    db_conn = get_active_connection(user)
    if not db_conn:
        return Response({"error": "No active DB connection."}, status=404)

    try:
        conn = psycopg2.connect(
            host=db_conn.host,
            port=db_conn.port,
            dbname=db_conn.database_name,
            user=db_conn.username,
            password=db_conn.password,
        )
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = %s
        """,
            [table.name],
        )
        columns = [row[0] for row in cursor.fetchall()]

        metrics = {}
        for col in columns:
            query = f"""
                SELECT 
                    COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE "{col}" IS NULL) AS nulls,
                    COUNT(DISTINCT "{col}") AS distincts
                FROM "{table.name}";
            """
            cursor.execute(query)
            total, nulls, distincts = cursor.fetchone()

            null_pct = round((nulls / total) * 100, 2) if total else 0
            distinct_pct = round((distincts / total) * 100, 2) if total else 0

            metrics[col] = {
                "null_percentage": null_pct,
                "distinct_percentage": distinct_pct,
            }

        conn.close()
        return Response(metrics)

    except Exception as e:
        traceback.print_exc()
        return Response({"error": str(e)}, status=500)


# ------------------ INCIDENT TREND ------------------


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def incident_trend(request):
    user = request.user
    days = int(request.GET.get("days", 7))
    start_date = now().date() - timedelta(days=days)

    category_keys = [
        "volume",
        "freshness",
        "schema_drift",
        "job_failure",
        "custom",
        "field_health",
    ]

    incidents = (
        Incident.objects.filter(
            created_at__date__gte=start_date,
            related_table__user=user,
        )
        .annotate(day=TruncDate("created_at"))
        .values("day", "incident_type")
        .annotate(count=Count("id"))
        .order_by("day")
    )

    trend_map = {}

    for entry in incidents:
        date_str = entry["day"].isoformat()
        raw_type = (
            (entry["incident_type"] or "custom").strip().lower().replace(" ", "_")
        )

        if date_str not in trend_map:
            trend_map[date_str] = {k: 0 for k in category_keys}
            trend_map[date_str]["date"] = date_str

        if raw_type in trend_map[date_str]:
            trend_map[date_str][raw_type] += entry["count"]
        else:
            trend_map[date_str]["custom"] += entry["count"]

    # Fill in missing dates
    for i in range(days):
        d = (start_date + timedelta(days=i)).isoformat()
        if d not in trend_map:
            trend_map[d] = {k: 0 for k in category_keys}
            trend_map[d]["date"] = d

    trend_data = list(sorted(trend_map.values(), key=lambda x: x["date"]))
    return Response({"trend": trend_data})


# ------------------ HEALTH SCORE TREND ------------------


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def health_score_trend(request):
    user = request.user
    days = int(request.GET.get("days", 7))
    start_date = now().date() - timedelta(days=days)

    db_conn = get_active_connection(user)
    if not db_conn:
        return Response({"error": "No active DB connection."}, status=404)

    # Get all tables for this user and connection
    tables = DataTable.objects.filter(user=user, connection=db_conn)

    # Filter health scores from checks on these tables
    checks = (
        DataQualityCheck.objects.filter(
            table__in=tables, run_time__date__gte=start_date
        )
        .annotate(day=TruncDate("run_time"))
        .values("day")
        .annotate(avg_score=Avg("passed_percentage"))
        .order_by("day")
    )

    response_data = [
        {
            "date": entry["day"].isoformat(),
            "avg_health_score": (
                round(entry["avg_score"], 2) if entry["avg_score"] else 0.0
            ),
        }
        for entry in checks
    ]

    return Response(response_data)


# ------------------ ML BULK ANOMALY CHECK ------------------


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def run_bulk_anomaly_check(request):
    user = request.user
    tables = DataTable.objects.filter(user=user)
    results = []
    anomalies = 0

    for table in tables:
        # Extract feature values
        null_percent = getattr(table, "null_percent", 0)
        volume = getattr(table, "row_count", 0)
        schema_change = 1 if getattr(table, "schema_changed_recently", False) else 0

        # Save metrics to MetricHistory
        for metric_type, value in [
            ("null_percent", null_percent),
            ("volume", volume),
            ("schema_change", schema_change),
        ]:
            MetricHistory.objects.create(
                table=table,
                column=None,
                metric_type=metric_type,
                value=value,
            )

        try:
            is_anomaly = detect_anomalies(null_percent, volume, schema_change)
        except Exception as e:
            return Response(
                {"error": f"⚠️ ML model failed to load or predict: {str(e)}"}, status=500
            )

        # Save anomaly result
        MetricHistory.objects.create(
            table=table,
            column=None,
            metric_type="ml_anomaly",
            value=float(is_anomaly),
        )

        # If anomaly, create Incident
        if is_anomaly:
            anomalies += 1

            # Determine root cause
            if schema_change:
                incident_type = "schema_drift"
            elif volume < 100:
                incident_type = "volume"
            elif null_percent > 20:
                incident_type = "freshness"
            else:
                incident_type = "field_health"

            Incident.objects.create(
                related_table=table,
                incident_type=incident_type,
                severity="high",
                status="ongoing",
                title=f"ML Anomaly Detected in {table.name}",
                description=(
                    f"Anomaly detected in table '{table.name}'\n"
                    f"Root cause: {incident_type.replace('_', ' ').title()}"
                ),
            )

        # Collect result
        results.append(
            {
                "table_name": table.name,
                "anomaly": is_anomaly,
                "null_percent": null_percent,
                "volume": volume,
                "schema_change": schema_change,
            }
        )

    return Response(
        {
            "total_checked": len(tables),
            "anomalies": anomalies,
            "results": results,
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def incident_detail(request, pk):
    try:
        incident = Incident.objects.get(id=pk, related_table__user=request.user)
        serializer = IncidentSerializer(incident)
        return Response(serializer.data)
    except Incident.DoesNotExist:
        return Response(
            {"detail": "Incident not found."}, status=status.HTTP_404_NOT_FOUND
        )


class DataQualityRuleListCreateView(generics.ListCreateAPIView):
    serializer_class = DataQualityRuleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return DataQualityRule.objects.filter(user=self.request.user).order_by(
            "-created_at"
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class DataQualityRuleDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DataQualityRuleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return DataQualityRule.objects.filter(user=self.request.user)


GEMINI_API_KEY = os.getenv("API_KEY")
MODEL = "gemini-2.5-pro"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_rule_from_prompt(request):
    table_id = request.data.get("table")
    table_name = DataTable.objects.filter(id=table_id, user=request.user).first()

    description = request.data.get("description")

    if not table_name or not description:
        return Response(
            {"error": "Missing 'table' or 'description' field."}, status=400
        )

    prompt = f"""
Act as a data quality assistant.

A user works with a table named '{table_name}' and described a rule:
'{description}'

You must extract and return a JSON like:

{{
  "rule_type": "null_check | regex_check | threshold | freshness | custom_sql",
  "column": "column_name",
  "rule_logic": "SQL that returns number of violations (SELECT COUNT(*))",
  "natural_language": "summary of what the rule does"
}}

Rules:
- SQL must be PostgreSQL-compatible.
- Only 1 rule per request.
- SQL must count rows violating the rule.
- JSON only. No explanation.
"""

    headers = {
        "Content-Type": "application/json",
        "X-goog-api-key": GEMINI_API_KEY,
    }

    data = {"contents": [{"role": "user", "parts": [{"text": prompt.strip()}]}]}

    try:
        response = requests.post(URL, headers=headers, json=data)
        response.raise_for_status()
        result = response.json()
        print("🌐 Gemini API response:", result)

        raw_text = result["candidates"][0]["content"]["parts"][0]["text"]

        # Strip markdown fences like ```json ... ```
        raw_text = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_text.strip())

        # No additional escaping needed — Gemini output is JSON-valid
        parsed = json.loads(raw_text)

    except Exception as parse_err:
        print("❌ Failed to parse Gemini response:", raw_text)
        return Response(
            {
                "error": f"Gemini response parsing failed: {str(parse_err)}",
                "raw_response": raw_text,
            },
            status=500,
        )

    # Validate table exists for user
    table = DataTable.objects.filter(name=table_name, user=request.user).first()
    if not table:
        return Response({"error": "Table not found for this user"}, status=404)

    # Save rule
    rule = DataQualityRule.objects.create(
        user=request.user,
        table=table,
        rule_type=parsed.get("rule_type", "custom_sql"),
        column=parsed.get("column"),
        rule_logic=parsed.get("rule_logic"),
        natural_language=parsed.get("natural_language"),
        severity="info",
        schedule="daily",
        is_critical=False,
    )

    return Response(
        {
            "message": "✅ Rule generated and saved.",
            "rule": {
                "id": rule.id,
                "type": rule.rule_type,
                "column": rule.column,
                "sql": rule.rule_logic,
                "summary": rule.natural_language,
            },
        }
    )
