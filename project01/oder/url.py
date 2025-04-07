from django.urls import path
from . import views
from oder.views import CheckOutView,PaymentView,MpesaPaymentView

from django.conf import settings
from django.conf.urls.static import static
from core.views import home_view

app_name = 'order'

urlpatterns = [
    path('add-to-cart/<slug:slug>/', views.add_to_cart, name='add_to_cart'),
    path('payment-method-PayPal/<int:order_id>/', views.paypalPaymentIntegration, name='paypal_payment'),
    path('cart/', views.cart_view, name='cart_view'),
    path('checkout/', CheckOutView.as_view(), name = 'checkout'),
    path('payment/', PaymentView.as_view(), name = 'stripe_payment'),
    path('remove-from-cart/<slug:slug>/', views.remove_from_cart, name='remove_from_cart'),
    path('remove-from-cart-in-cart-view/<slug:slug>/', views.remove_from_cart_cart_view, name='remove_from_cart_in_cart_view'),
    path('decrement-item-qty/<slug:slug>/', views.remove_single_item_from_cart, name='decrement_item_qty'),
    path('increment-item-qty/<slug:slug>/', views.adding_single_item_to_cart, name='increment_item_qty'),
    path('payment-method/mpesa/', MpesaPaymentView.as_view(), name="mpesa_payment"),
    path('', home_view, name='home'),
]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
