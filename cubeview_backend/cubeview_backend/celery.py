# project_name/celery.py
import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cubeview_backend.settings')

app = Celery('cubeview_backend')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
