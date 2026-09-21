from django.urls import re_path

from .realtime_consumers import FAQConsumer

websocket_urlpatterns = [
    re_path(r"ws/faq/$", FAQConsumer.as_asgi()),
]
