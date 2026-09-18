import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "project01.settings")

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter

django_asgi_app = get_asgi_application()

# Import Django/DRF-dependent middleware and routing only after Django's
# application registry has been initialized. Importing JWTAuthentication
# before get_asgi_application() raises AppRegistryNotReady during Daphne startup.
from project01.middleware.jwt_auth import JWTAuthMiddleware
from core.routing import websocket_urlpatterns as core_websocket_urlpatterns
from oder.routing import websocket_urlpatterns as order_websocket_urlpatterns

websocket_urlpatterns = core_websocket_urlpatterns + order_websocket_urlpatterns

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": JWTAuthMiddleware(URLRouter(websocket_urlpatterns)),
})
