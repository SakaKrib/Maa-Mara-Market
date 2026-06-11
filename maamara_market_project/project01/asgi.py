import os
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.core.asgi import get_asgi_application
import oder.chanels  # <-- now this has websocket_urlpatterns
from .middleware.jwt_auth import JWTAuthMiddleware

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "project01.settings")

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": JWTAuthMiddleware(
        URLRouter(
            oder.chanels.websocket_urlpatterns
        )
    ),
})



#application = ProtocolTypeRouter({
#    "http": get_asgi_application(),
#    "websocket": JWTAuthMiddleware(
#        URLRouter(
#            oder.chanels.websocket_urlpatterns
#        )
#    ),
#})
