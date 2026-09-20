from django.apps import AppConfig


class VendordashboardConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "vendorDashboard"

    def ready(self):
        from . import signals  # noqa: F401
