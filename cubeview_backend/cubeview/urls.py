from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    DataQualityRuleDetailView,
    generate_rule_from_prompt,
    DataQualityRuleListCreateView,
    calculate_metrics,
    dashboard_summary,
    connect_db,
    collect_metadata,
    dashboard_data,
    fetch_user_tables,
    RegisterView,
    field_metrics,
    get_db_connection,
    health_score_trend,
    incident_detail,
    incident_trend,
    run_bulk_anomaly_check,
    
    run_quality_checks,
    get_user_incidents,
    dashboard_overview,
    health_score,
    incident_summary,
    recent_incidents,
    table_detail,
    list_incidents,
    list_user_tables,
    resolve_incident,
    incident_filter_options,
    generate_docs,  # ✅ Correct view
)

urlpatterns = [
    
    # ✅ Auth
    path("register/", RegisterView.as_view(), name="register"),
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("generate-rule/", generate_rule_from_prompt, name="generate_rule"),
    # ✅ Dashboard + Metadata
    path("dashboard-summary/", dashboard_summary, name="dashboard-summary"),
    path("dashboard-data/", dashboard_data, name="dashboard-data"),
    path("collect-metadata/", collect_metadata, name="collect-metadata"),
    path("user-tables/", fetch_user_tables, name="fetch-user-tables"),  # ✅ Only one
    # ✅ User DB Connect
    path("connect-db/", connect_db, name="connect-db"),
    path("get-db/", get_db_connection, name="get-db-connection"),
    # ✅ Quality Checks + Incidents
    path("run-quality-checks/", run_quality_checks, name="run-quality-check"),
    path("incidents/", list_incidents, name="list-incidents"),  # now supports filters
    path("incidents/all/", get_user_incidents, name="get-user-incidents"),
    path("overview/", dashboard_overview, name="dashboard-overview"),
    path("health-score/", health_score, name="health-score"),
    path("incident-summary/", incident_summary, name="incident-summary"),
    path("recent-incidents/", recent_incidents, name="recent-incidents"),
    # ✅ Tables & Incidents
    path("table/<int:table_id>/", table_detail),
    path("tables/", list_user_tables),
    path("incidents/list/", list_incidents),
    path("incidents/<int:pk>/resolve/", resolve_incident),
    path("incidents/filters/", incident_filter_options),
    path("incidents/<int:pk>/", incident_detail, name="incident-detail"),
    # ✅ Documentation Generation
    path("generate-docs/<int:table_id>/", generate_docs, name="generate-docs"),
    path("calculate-metrics/<int:table_id>/", calculate_metrics),
    path("metrics/<int:table_id>/", field_metrics, name="field-metrics"),    path("incident-trend/", incident_trend, name="incident-trend"),
    path("health-score-trend/", health_score_trend, name="health-score-trend"),
    path("anomaly-check-all/", run_bulk_anomaly_check),
    path("rules/", DataQualityRuleListCreateView.as_view(), name="rule-list-create"),
    path("rules/<int:pk>/", DataQualityRuleDetailView.as_view(), name="rule-detail"),
    



]
