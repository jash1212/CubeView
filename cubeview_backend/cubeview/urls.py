from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    dashboard_summary,
    connect_db,
    collect_metadata,
    dashboard_data,
    fetch_user_tables,
    RegisterView,get_db_connection
)
from . import views


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
    
    path("run-quality-check/", views.run_quality_checks, name="run-quality-check"),
    path('incidents/', views.get_user_incidents, name='get-user-incidents'),
    
    path("dashboard/overview/", views.dashboard_overview, name="dashboard-overview"),
    path("dashboard/health-score/", views.health_score, name="health-score"),
    path("dashboard/incident-summary/", views.incident_summary, name="incident-summary"),
    path("dashboard/incidents/", views.recent_incidents, name="recent-incidents"),
]
