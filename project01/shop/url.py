# urls.py

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path
from . import views
from .views import HomeView

app_name = 'shop'


urlpatterns = [
    path('', views.list_items, name='index'),
    path('', views.static, ),
    path('categories/', views.category_list, name='category_list'),
    path('categories/<slug:slug>/', views.category_detail, name='category_detail'),
    path('items/', views.item_list, name='item_list'),
    path('item-detai/<slug>/', views.item_detail, name='item_detail'),
    path('item/create-new-item/', views.create_item, name='create_item'),
    path('item-list/', views.item_list, name='item_list'),
    path('vendor-main-dashboard/', views.main_dashboard, name='main_dashboard'),
    path('join-chat/', views.react_app, name='chat_app'),
    path('api/chat-user-data/', views.user_data, name='chat_user_data'),
    path('', HomeView.as_view, name='home'),
] 
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)