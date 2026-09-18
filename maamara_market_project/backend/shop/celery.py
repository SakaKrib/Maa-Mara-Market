import os
from celery import Celery
from celery.schedules import crontab

# Set the default Django settings module
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "project01.settings")

# Create Celery app
app = Celery("project01")

# Load settings from Django settings.py using CELERY_ namespace
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks from all installed apps
app.autodiscover_tasks()

# Schedule periodic tasks
app.conf.beat_schedule = {
    "delete-expired-banners-daily": {
        "task": "shop.tasks.delete_expired_banners",  # Replace 'yourapp' with your app name
        "schedule": crontab(hour=0, minute=0),  # run daily at midnight
        "args": (),  # optional: arguments to pass to the task
    },
}

app.conf.timezone = "UTC"  # Or your local timezone
