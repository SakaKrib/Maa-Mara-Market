from django.contrib import admin
from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name="home"),
    path('', views.static, ),
    path('contact/', views.contact, name="contact"),
    path('about/', views.about, name="about"),
    path('donate/', views.donate, name="donate"),
    path('community/', views.community, name="community"),
    path('policy/', views.returnPolicy, name="policy"),
    path('register/', views.register, name="register"),
    path('login/', views.login, name="login"),


]