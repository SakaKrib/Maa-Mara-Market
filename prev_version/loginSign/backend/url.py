from django.contrib import admin
from django.urls import path
from . import views

urlpatterns = [
    path('static/', views.static, ),
    path('contact/', views.contact, name="contact"),
    path('about/', views.about, name="about"),
    path('donate/', views.donate, name="donate"),
    path('community/', views.community, name="community"),
    path('policy/', views.returnPolicy, name="policy"),
    path('register/', views.register, name="register"),
    path('login/', views.login, name="login"),
    path('', views.home_view, name='home'),  # Point the home URL to the home_view
]