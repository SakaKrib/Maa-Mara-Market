from django.urls import path
from .views import cart_add, cart_detail

App_name = 'cart'

urlpatterns = [
    path('add/<int:product_id>/', cart_add, name='cart_add'),
    path('cart_detail/', cart_detail, name='cart_detail'),
]
