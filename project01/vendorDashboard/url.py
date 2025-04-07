from django.urls import path
from . import views
from .views import vendor_dashboard

app_name = 'vendor'

urlpatterns = [
    path('login-vendor/', views.vendor_login, name='vendor_login'),
    path('logout/', views.vendor_logout, name='logout'),
    path('save-info/', views.save_vendor_info, name='save_vendor_info'),
    path('vendor-dashboard/', vendor_dashboard, name='vendor_dashboard'),
    path('vendor-registration-form/', views.vendor_registration, name='register_vendor'),
    path('vendor/profile/', views.vendor_profile, name='vendor_profile'),

]
