"""Celery application for scheduled and background Maa Mara Market tasks."""
import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "project01.settings")

app = Celery("project01")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
