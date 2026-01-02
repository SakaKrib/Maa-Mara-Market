# shop/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
#from .views import VendorAdminViewSet
from .views import *
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .users import *
from .vendors import *
from .items import vendor_item_growth_stats
from .ItemInventory import *

router = DefaultRouter()
router.register(r'items', ItemViewSet, basename='item')
router.register(r'items-vendor', vendorItemViewset, basename='item-vendor')
router.register(r'vendors', VendorAdminViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/vendor-net-payout/', vendor_net_payout_api, name='vendor_net_payout_api'),
    path("api/vendor/payouts/", vendor_recent_payouts_api, name="vendor-payouts-api"),

    #vendor profile
    path("api/vendor-profile/single-page/", VendorProfileView.as_view(), name="vendor-profile"),
    path("api/vendor-update-profile/<int:pk>/", VendorUpdateProfile.as_view(), name="vendor-profile-update"),

    
    path('api/token/refresh/', CookieRefreshView.as_view(), name='refresh'),
    #visitor token
    path('api/vistor-token/',VisitorTokenView.as_view(), name='visitor-token'),



    path('api/login/', login_view, name='login'),
    path('api/get-csrf-token/', get_csrf_token, name='get_csrf_token'),
    path('api/profile/', ProfileView.as_view(), name='profile'),
    path('api/check-auth/', HybridCheckAuthView.as_view()),
    path('api/logout/',logout_view),
    
    # item stats
    path('api/item-stats/', vendor_item_stats),
    path("api/vendor-item-growth/", vendor_item_growth_stats, name="vendor-item-growth"),

    path('api/callback/',google_login_callback),
    path('api/accounts/',include('allauth.urls')),
    path('api/google/validate_token/',validate_google_token),

    #vendor item update
    path(
    'api/item-post/update/',
    VendorItemViewSet.as_view({'get': 'list', 'post': 'create'}),
        name="vendor-items"
    ),
    path(
        'api/item-post/update/<int:pk>/',
        VendorItemViewSet.as_view({
            'get': 'retrieve',
            'put': 'update',
            'patch': 'partial_update',
            'delete': 'destroy',
        }),
        name="vendor-item-detail"
    ),

    path('api/vendor/profile/',get_vendor_profile),


    path('api/register/',register),

    # api for OTP
    path('api/verify-otp/',verify_otp_register_otp, name='verify_otp'),
    path('api/resend-otp/', resend_otp_register_otp, name='resend_otp'),

    #vendor request form submission
    path('api/vendor-request/', submit_vendor_request, name='submit_vendor_request'),

    #verify vendor otp
    path('api/verify-otp-vendor/', verify_otp_vendor, name='verify-otp'),
    path('api/resend-otp-vendor/', resend_vendor_otp, name='resend-otp'),

    #admin hale vendor aproval
    path('api/vendor/requests',list_verified_vendor_requests, name='list_verified_vendor_requests'),
    path('api/vendor-requests/<int:vendor_request_id>/approve/', approve_vendor, name='approve-vendor'),
    path('api/vendor/deny/<int:vendor_request_id>/', deny_vendor, name='deny_vendor'),

    # seen api
    path('api/vendor/mark-seen/<int:user_id>/', MarkVendorSeenView.as_view(), name='mark-vendor-seen'),
    path('api/vendor/requests/unseen-count/', UnseenVendorCountView.as_view(), name='unseen-vendor-count'),

    #test
    path('api/vendor-requests/<int:vendor_request_id>/update-item-list/', update_vendor_request_items, name='update_vendor_item_list'),
    path('api/vendor-requests/<int:vendor_request_id>/update-vendor-info/', update_vendor_info, name='update_vendor_info'),

    #vendor payouts
    path("api/vendor-payout-history/",vendor_payout_history_api, name="vendor-payout-history"),


   
    # inventory api
    path('api/low-stock-items/', low_stock_items, name='low-stock-items'),
    path('api/high-stock-items/', high_stock_items, name='high-stock-items'),
    path('api/items/<int:item_id>/update-stock/', update_item_stock, name='update-item-stock'),





]

