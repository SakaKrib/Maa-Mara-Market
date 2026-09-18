from django.urls import path
from . import views  # Make sure views.py exists
from .VendorRequests import *
from .views import AdminPayoutAPIView, monthly_sales_report
from .payout.services.vendor_monthly_payout_runner import process_payouts_by_group, pay_single_vendor_payout, generate_monthly_payouts, reconcile_single_vendor_payout, reconcile_bank_vendor_payout
from .calback import *
from . GlobalSearchEngine import GlobalSearchView
urlpatterns = [
    path('', views.dashboard, name='vendor-dashboard'),  # Replace with your actual view

    # search engine, global
    path("api/search-all/", GlobalSearchView.as_view(), name="global-search"),

    # requests
    # Vendor creates request
    path("api/vendor/item-requests/create/", VendorItemRequestCreateView.as_view(), name="VendorItemCreateRequests"),

    # Admin: list all vendor requests (pending/approved/denied)
    path("api/vendor/requests/", VendorItemRequestListView.as_view(), name="VendorItemRequestsList"),
    path("api/admin/vendorDashboard/vendoritemrequest/<int:pk>/", VendorItemRequestDetailView.as_view(), name="VendorItemRequestDetail"),

    # Admin: approve/deny request
    path("api/vendor/requests/<int:pk>/approve/", approve_request, name="VendorItemApproveRequest"),
    #save item in the draft
    path("api/vendor-requests/<int:pk>/save-draft/", VendorItemRequestDraftUpdateView.as_view(), name="vendor-request-save-draft"),

    #price change
    path(
        "api/item-post/price-change/",
        CreatePriceChangeRequestView.as_view(),
        name="create-price-change-request"
    ),
    #price change notification
     path(
        "api/admin/vendorDashboard/vendoritemrequest/price-change/request/<int:pk>/",
        PriceChangeRequestDetailView.as_view(),
        name="price-change-request-detail"
    ),

    #fetch
    path('api/price-change-requests/', PriceChangeRequestListView.as_view(), name='price-change-requests'),

    # Admin: approve a price change request
    path(
        "api/item-price-change/approve/<int:request_id>/price-change/",
        ApprovePriceChangeRequestView.as_view(),
        name="approve-price-change-request"
    ),

    # admin payouts fetch
    path('api/admin-payouts/', AdminPayoutAPIView.as_view(), name='admin-payouts'),

    # generate payout
    path("api/payout/generate-monthly-payouts/", generate_monthly_payouts, name="generate_monthly_payouts"),

    # group payment
    path("api/payout/process-payouts-by-group/", process_payouts_by_group, name="process_payouts_by_group"),

    # pay single vendor
    path(
        "api/vendor/payout/<str:reference>/pay/",
        pay_single_vendor_payout,
        name="pay_single_vendor_payout",
    ),
    path(
        "api/vendor/payout/<str:reference>/reconcile/",
        reconcile_single_vendor_payout,
        name="reconcile_single_vendor_payout",
    ),
    path(
        "api/vendor/payout/<str:reference>/bank-reconcile/",
        reconcile_bank_vendor_payout,
        name="reconcile_bank_vendor_payout",
    ),

    # mpesa callbacks
    path("mpesa/result", mpesa_result, name="mpesa_result"),
    path("mpesa/timeout", mpesa_timeout, name="mpesa_timeout"),

    # bank
    path('kcb/callback/',kcb_oauth_callback, name='kcb_oauth_callback'),

    # paypal
    path('paypal-payout/webhook/', paypal_payout_webhook, name='paypal-payout-webhook'),
    
    # sakes report url
    path('api/monthly-sales-report/', monthly_sales_report, name='monthly_sales_report'),

    # draft item api
    path(
        "api/vendor-item-create-requests/<int:pk>/save-draft/",
        save_vendor_item_draft,
        name="vendor-item-draft"
    ),

]


