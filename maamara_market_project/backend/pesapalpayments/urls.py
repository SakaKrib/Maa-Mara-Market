from django.urls import path

from .checkout import checkout_status, checkout_view
from .views import pesapal_callback, pesapal_ipn

urlpatterns = [
    path("api/checkout/", checkout_view, name="pesapal-checkout"),
    path("api/checkout/<uuid:checkout_id>/status/", checkout_status, name="pesapal-checkout-status"),
    path("api/pesapal/ipn/", pesapal_ipn, name="pesapal-ipn"),
    path("api/pesapal/callback/", pesapal_callback, name="pesapal-callback"),
]
