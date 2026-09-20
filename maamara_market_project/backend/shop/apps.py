from django.apps import AppConfig


class LoginsignConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'shop'

    def ready(self):
        from . import realtime_signals  # noqa: F401
