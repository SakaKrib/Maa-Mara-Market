from django.apps import AppConfig


class OrderConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "order"
    # Keep the historical Django app label so existing migration history
    # and database tables remain compatible during the package rename.
    label = "oder"
