import logging
from datetime import datetime, time, timedelta
from django.utils import timezone
from django.apps import apps
from django.db.models import Count
from django.db.models.functions import TruncDate
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)

# ---------- Helpers (dynamic model/field discovery) ----------

def get_model_by_name(name):
    """Return the first installed model whose class name matches `name`, or None."""
    for m in apps.get_models():
        if m.__name__ == name:
            return m
    return None


def find_field(model, candidates):
    """Return the first field name in `candidates` that exists on `model`, else None."""
    if model is None:
        return None
    for c in candidates:
        try:
            model._meta.get_field(c)
            return c
        except Exception:
            continue
    return None


def sniff_table_field(model):
    """
    Attempt to find a table-related field name on `model`.
    1) Try common explicit names.
    2) Scan all model fields for a name containing 'table' and return the first.
    """
    if model is None:
        return None

    common = ['table', 'table_name', 'data_table', 'data_table_id', 'table_id', 'table_ref', 'table_name_raw']
    for c in common:
        try:
            model._meta.get_field(c)
            return c
        except Exception:
            continue

    # fallback: scan all fields that contain 'table' in their name
    for f in model._meta.get_fields():
        if getattr(f, 'name', '').lower().find('table') != -1:
            return f.name

    return None


def make_aware(dt):
    if dt is None:
        return None
    if timezone.is_naive(dt):
        return timezone.make_aware(dt)
    return dt


def parse_date_params(params):
    """Parse start/end date or preset. Returns aware datetimes (start_dt, end_dt).

    Accepts:
      - start_date and end_date as YYYY-MM-DD
      - preset like '7d', '30d'
    Defaults to last 7 days (inclusive).
    """
    start_s = params.get('start_date')
    end_s = params.get('end_date')
    preset = params.get('preset')
    now = timezone.now()

    if start_s and end_s:
        try:
            start = datetime.strptime(start_s, '%Y-%m-%d').date()
            end = datetime.strptime(end_s, '%Y-%m-%d').date()
            # make aware and set full-day bounds
            return (timezone.make_aware(datetime.combine(start, time.min)),
                    timezone.make_aware(datetime.combine(end, time.max)))
        except Exception:
            logger.exception('Invalid start/end date format provided to report-summary')

    if preset:
        try:
            if preset.endswith('d'):
                days = int(preset[:-1])
                # include today, so start = today - (days - 1)
                end_date = now.date()
                start_date = end_date - timedelta(days=days - 1) if days > 0 else end_date
                return (make_aware(datetime.combine(start_date, time.min)),
                        make_aware(datetime.combine(end_date, time.max)))
        except Exception:
            logger.exception('Invalid preset provided to report-summary')

    # default last 7 days inclusive
    end_date = now.date()
    start_date = end_date - timedelta(days=6)  # last 7 days: today + previous 6
    return (make_aware(datetime.combine(start_date, time.min)),
            make_aware(datetime.combine(end_date, time.max)))


def apply_user_and_connection_filters(qs, model, user, connection):
    if model is None:
        return qs
    user_field = find_field(model, ['user', 'owner', 'created_by'])
    if user_field:
        qs = qs.filter(**{user_field: user})
    if connection is not None:
        conn_field = find_field(model, ['connection', 'db_connection', 'user_database_connection'])
        if conn_field:
            qs = qs.filter(**{conn_field: connection})
    return qs


def get_date_field_name(model):
    return find_field(model, ['created_at', 'timestamp', 'run_at', 'executed_at', 'date', 'created', 'created_on', 'checked_at', 'started_at'])


# ---------- API View ----------

class ReportSummaryAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            start_dt, end_dt = parse_date_params(request.GET)
            connection_id = request.GET.get('connection_id')

            # dynamically find models
            DataTable = get_model_by_name('DataTable')
            Incident = get_model_by_name('Incident')
            DataQualityRule = get_model_by_name('DataQualityRule')
            RuleExecutionHistory = get_model_by_name('RuleExecutionHistory')
            ExportedMetadata = get_model_by_name('ExportedMetadata')
            LineageNode = get_model_by_name('LineageNode')
            LineageEdge = get_model_by_name('LineageEdge')
            UserDatabaseConnection = get_model_by_name('UserDatabaseConnection')

            # fetch connection instance if provided
            connection = None
            if connection_id and UserDatabaseConnection:
                try:
                    connection = UserDatabaseConnection.objects.get(pk=connection_id, user=request.user)
                except Exception:
                    connection = None

            # Tables monitored
            tables_monitored = 0
            if DataTable:
                dt_qs = DataTable.objects.filter(user=request.user) if find_field(DataTable, ['user', 'owner']) else DataTable.objects.all()
                if connection and find_field(DataTable, ['connection', 'db_connection', 'user_database_connection']):
                    conn_field = find_field(DataTable, ['connection', 'db_connection', 'user_database_connection'])
                    dt_qs = dt_qs.filter(**{conn_field: connection})
                tables_monitored = dt_qs.count()

            # Rules active
            rules_active = 0
            if DataQualityRule:
                rq_qs = DataQualityRule.objects.filter(user=request.user) if find_field(DataQualityRule, ['user', 'owner', 'created_by']) else DataQualityRule.objects.all()
                enabled_field = find_field(DataQualityRule, ['enabled', 'is_active', 'active'])
                if enabled_field:
                    rq_qs = rq_qs.filter(**{enabled_field: True})
                if connection and find_field(DataQualityRule, ['connection', 'db_connection', 'user_database_connection']):
                    conn_field = find_field(DataQualityRule, ['connection', 'db_connection', 'user_database_connection'])
                    rq_qs = rq_qs.filter(**{conn_field: connection})
                rules_active = rq_qs.count()

            # Incidents and breakdowns
            total_incidents = 0
            resolved_incidents = 0
            incident_breakdown = {}
            incident_trend = []
            top_tables = []
            if Incident:
                inc_qs = Incident.objects.all()
                inc_qs = apply_user_and_connection_filters(inc_qs, Incident, request.user, connection)
                date_field = get_date_field_name(Incident)
                if date_field:
                    inc_qs = inc_qs.filter(**{f"{date_field}__range": (start_dt, end_dt)})
                total_incidents = inc_qs.count()

                # resolved counting
                resolved_field = find_field(Incident, ['resolved', 'is_resolved', 'is_resolved_by_user', 'status', 'state'])
                if resolved_field:
                    if resolved_field in ['status', 'state']:
                        resolved_incidents = inc_qs.filter(**{f"{resolved_field}__in": ['resolved', 'closed']}).count()
                    else:
                        resolved_incidents = inc_qs.filter(**{f"{resolved_field}": True}).count()

                # breakdown by type
                type_field = find_field(Incident, ['incident_type', 'type', 'kind'])
                if type_field:
                    breakdown_qs = inc_qs.values(type_field).annotate(count=Count('pk')).order_by('-count')
                    incident_breakdown = {str(item[type_field]): item['count'] for item in breakdown_qs}
                else:
                    incident_breakdown = {'unknown': total_incidents}

                # trend by day
                if date_field:
                    day_qs = inc_qs.annotate(day=TruncDate(date_field)).values('day').annotate(count=Count('pk')).order_by('day')
                    incident_trend = [{'day': item['day'].isoformat(), 'count': item['count']} for item in day_qs]

                # top tables by incident count (robust detection)
                table_field = sniff_table_field(Incident)
                if table_field:
                    # if it's a FK to another model, prefer the related object's 'name' or similar
                    try:
                        fld = Incident._meta.get_field(table_field)
                        related = getattr(fld, 'related_model', None)
                    except Exception:
                        related = None

                    if related:
                        # find a name-like field on related model
                        name_field = find_field(related, ['name', 'table_name', 'display_name', 'label'])
                        if name_field:
                            top_qs = inc_qs.values(f"{table_field}__{name_field}").annotate(count=Count('pk')).order_by('-count')[:5]
                            top_tables = [{'table': item[f"{table_field}__{name_field}"], 'count': item['count']} for item in top_qs]
                        else:
                            # fallback to reporting by related pk
                            top_qs = inc_qs.values(f"{table_field}").annotate(count=Count('pk')).order_by('-count')[:5]
                            top_tables = [{'table_id': item[f"{table_field}"], 'count': item['count']} for item in top_qs]
                    else:
                        # not a relation; assume string/char field contains table name
                        top_qs = inc_qs.values(table_field).annotate(count=Count('pk')).order_by('-count')[:5]
                        top_tables = [{'table': item[table_field], 'count': item['count']} for item in top_qs if item[table_field] is not None]

            # Health score & trend heuristic
            # ---- Fix: replace the previous linear clamp (which forced 0 for high rates)
            # Use incidents_per_table -> score = 100 * (1 / (1 + incidents_per_table))
            health_score = 100
            health_score_trend = []
            if tables_monitored > 0:
                incidents_per_table = total_incidents / float(max(1, tables_monitored))
                # smoother non-linear mapping, output in 0..100
                health_score = max(0, min(100, int(100 * (1.0 / (1.0 + incidents_per_table)))))
                # compute per-day health using incident_trend (if available)
                for item in incident_trend:
                    day_count = item['count']
                    day_inc_per_table = day_count / float(max(1, tables_monitored))
                    day_health = max(0, min(100, int(100 * (1.0 / (1.0 + day_inc_per_table)))))
                    health_score_trend.append({'day': item['day'], 'health_score': day_health})
            else:
                # no tables monitored -> define health as 0 so UI knows nothing is monitored
                health_score = 0

            # Rule compliance (uses RuleExecutionHistory if present)
            rule_compliance = []
            if DataQualityRule:
                if RuleExecutionHistory:
                    # try to find FK to rule and execution timestamp / result fields
                    rule_fk_field = None
                    for candidate in ['rule', 'data_quality_rule', 'dataqualityrule', 'rule_id']:
                        try:
                            if RuleExecutionHistory._meta.get_field(candidate):
                                rule_fk_field = candidate
                                break
                        except Exception:
                            continue
                    exec_date_field = get_date_field_name(RuleExecutionHistory)
                    result_field = find_field(RuleExecutionHistory, ['result', 'status', 'passed', 'is_success'])

                    rules = DataQualityRule.objects.filter(user=request.user) if find_field(DataQualityRule, ['user', 'owner']) else DataQualityRule.objects.all()
                    if find_field(DataQualityRule, ['connection', 'db_connection', 'user_database_connection']) and connection:
                        conn_field = find_field(DataQualityRule, ['connection', 'db_connection', 'user_database_connection'])
                        rules = rules.filter(**{conn_field: connection})

                    for r in rules:
                        q = RuleExecutionHistory.objects
                        if rule_fk_field:
                            q = q.filter(**{rule_fk_field: r})
                        if exec_date_field:
                            last = q.order_by(f"-{exec_date_field}").first()
                        else:
                            last = q.order_by('-pk').first()
                        if last:
                            last_run_val = getattr(last, exec_date_field) if exec_date_field and getattr(last, exec_date_field) else None
                            last_run_iso = last_run_val.isoformat() if last_run_val else None
                            res = {
                                'rule_id': getattr(r, 'id', None),
                                'rule_name': getattr(r, 'name', None) or str(r),
                                'last_run': last_run_iso,
                                'last_result': getattr(last, result_field) if result_field else None,
                            }
                            rule_compliance.append(res)
                        else:
                            rule_compliance.append({'rule_id': getattr(r, 'id', None), 'rule_name': getattr(r, 'name', None) or str(r), 'last_run': None, 'last_result': None})
                else:
                    rules = DataQualityRule.objects.filter(user=request.user) if find_field(DataQualityRule, ['user', 'owner']) else DataQualityRule.objects.all()
                    if find_field(DataQualityRule, ['connection', 'db_connection', 'user_database_connection']) and connection:
                        conn_field = find_field(DataQualityRule, ['connection', 'db_connection', 'user_database_connection'])
                        rules = rules.filter(**{conn_field: connection})
                    for r in rules:
                        rule_compliance.append({'rule_id': getattr(r, 'id', None), 'rule_name': getattr(r, 'name', None) or str(r), 'last_run': None, 'last_result': None})

            # Exported metadata
            metadata_export_info = {'last_export': None}
            if ExportedMetadata:
                date_field = get_date_field_name(ExportedMetadata)
                qs = ExportedMetadata.objects.filter(user=request.user) if find_field(ExportedMetadata, ['user', 'owner']) else ExportedMetadata.objects.all()
                if find_field(ExportedMetadata, ['connection', 'db_connection', 'user_database_connection']) and connection:
                    conn_field = find_field(ExportedMetadata, ['connection', 'db_connection', 'user_database_connection'])
                    qs = qs.filter(**{conn_field: connection})
                if date_field:
                    last = qs.order_by(f"-{date_field}").first()
                    if last:
                        val = getattr(last, date_field)
                        metadata_export_info['last_export'] = val.isoformat() if val else None
                else:
                    last = qs.order_by('-pk').first()
                    if last:
                        # prefer created_at if exists
                        created = getattr(last, 'created_at', None) or getattr(last, 'created', None)
                        metadata_export_info['last_export'] = created.isoformat() if created else None

            # Lineage snapshot
            lineage_data = {'nodes': [], 'edges': []}
            if LineageNode and LineageEdge:
                node_qs = LineageNode.objects.filter(user=request.user) if find_field(LineageNode, ['user', 'owner']) else LineageNode.objects.all()
                edge_qs = LineageEdge.objects.filter(user=request.user) if find_field(LineageEdge, ['user', 'owner']) else LineageEdge.objects.all()
                if connection:
                    if find_field(LineageNode, ['connection', 'db_connection', 'user_database_connection']):
                        conn_field = find_field(LineageNode, ['connection', 'db_connection', 'user_database_connection'])
                        node_qs = node_qs.filter(**{conn_field: connection})
                    if find_field(LineageEdge, ['connection', 'db_connection', 'user_database_connection']):
                        conn_field = find_field(LineageEdge, ['connection', 'db_connection', 'user_database_connection'])
                        edge_qs = edge_qs.filter(**{conn_field: connection})
                for n in node_qs:
                    lineage_data['nodes'].append({
                        'id': getattr(n, 'id', None),
                        'type': getattr(n, 'node_type', getattr(n, 'type', None)),
                        'label': getattr(n, 'name', None) or getattr(n, 'table_name', None) or str(n)
                    })
                for e in edge_qs:
                    src = getattr(e, 'source_id', None) or getattr(e, 'source', None)
                    tgt = getattr(e, 'target_id', None) or getattr(e, 'target', None)
                    lineage_data['edges'].append({'id': getattr(e, 'id', None), 'source': src, 'target': tgt})

            payload = {
                'health_score': health_score,
                'total_incidents': total_incidents,
                'resolved_incidents': resolved_incidents,
                'unresolved_incidents': total_incidents - resolved_incidents,
                'tables_monitored': tables_monitored,
                'rules_active': rules_active,
                'incident_breakdown': incident_breakdown,
                'health_score_trend': health_score_trend,
                'incident_trend': incident_trend,
                'top_tables': top_tables,
                'lineage_data': lineage_data,
                'rule_compliance': rule_compliance,
                'metadata_export_info': metadata_export_info,
            }

            return Response(payload, status=status.HTTP_200_OK)

        except Exception:
            logger.exception('Error building report summary')
            return Response({'detail': 'Internal server error building report summary'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
