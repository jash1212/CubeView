from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    dashboard_summary,
    connect_db,
    collect_metadata,
    dashboard_data,
    fetch_user_tables,
    RegisterView,
    get_db_connection,
    run_quality_checks,
    get_user_incidents,
    dashboard_overview,
    health_score,
    incident_summary,
    recent_incidents,
    table_detail, list_incidents,list_user_tables,resolve_incident,incident_filter_options
)

urlpatterns = [
    # ✅ Auth
    path("register/", RegisterView.as_view(), name="register"),
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # ✅ Dashboard + Metadata
    path("dashboard-summary/", dashboard_summary, name="dashboard-summary"),
    path("dashboard-data/", dashboard_data, name="dashboard-data"),
    path("collect-metadata/", collect_metadata, name="collect-metadata"),
    path("fetch-tables/", fetch_user_tables, name="fetch-user-tables"),

    # ✅ User DB Connect
    path("connect-db/", connect_db, name="connect-db"),
    path("get-db/", get_db_connection, name="get-db-connection"),

    # ✅ Quality Checks + Incidents
    path("run-quality-checks/", run_quality_checks, name="run-quality-check"),
    path("incidents/", get_user_incidents, name="get-user-incidents"),
    path("overview/", dashboard_overview, name="dashboard-overview"),
    path("health-score/", health_score, name="health-score"),
    path("incident-summary/", incident_summary, name="incident-summary"),
    path("recent-incidents/", recent_incidents, name="recent-incidents"),
    
    path("user-tables/", fetch_user_tables),
    path("table/<int:table_id>/", table_detail),
    path("tables/", list_user_tables),
    path("incidents/", list_incidents),
    path("incidents/<int:pk>/resolve/", resolve_incident),
    path("incidents/filters/", incident_filter_options),




]
