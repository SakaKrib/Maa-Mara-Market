from django.apps import AppConfig


class OderConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'oder'


from django.apps import AppConfig

class YourAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'oder'

    def ready(self):
        import oder.signals
