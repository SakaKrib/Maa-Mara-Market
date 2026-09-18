from django.urls import path

from .Mpesa.C2BMpesaIntergration.c2butils import stk_callback, stk_push
from .Mpesa.mpesaUtils import mpesa_b2c_payment, mpesa_result, mpesa_timeout
from .capture_order import capture_paypal_order
from .dashboardSummery import DashboardSummaryView
from .orderStat import (
    vendor_completed_order_items,
    vendor_pending_order_items,
    vendor_pending_orders,
)
from .paypalApis import (
    admin_transactions,
    checkout_view,
    dashboard_stats,
    get_customers,
    paypal_webhook,
    transaction_totals,
    vendor_sales,
)
from .returns import (
    approve_return_request_api,
    get_pending_returns_api,
    return_request_handler_api,
)
from .shipping import get_shipping_rates
from .views import (
    add_to_cart_api,
    get_cart_view,
    remove_from_cart_api,
    update_cart_quantity,
    vendor_transactions,
)


urlpatterns = [
    path('api/cart/add/<int:pk>/', add_to_cart_api, name='api_add_to_cart'),
    path("api/cart/remove/<int:pk>/", remove_from_cart_api, name="remove_from_cart"),
    path("api/cart/",get_cart_view, name="cart_view"),
    path("api/cart/<int:pk>/update-quantity/",update_cart_quantity, name="update-cart-quantity"),

    # account summery
    path("api/dashboard/summary/", DashboardSummaryView.as_view()),

    #shipping rates
    path('api/shipping-rates', get_shipping_rates, name='shipping-rates'),

    #payment apis
    # path("api/payments/paypal/create-order/", paypal_create_order, name="paypal-create"),
    # path("api/payments/paypal/capture-order/<str:order_id>/", paypal_capture_order, name="paypal-capture"),

    #create order api
    path("api/checkout/", checkout_view, name="checkout"),
    

    #mpesa payment gateways (B2C)
    path("mpesa/b2c/", mpesa_b2c_payment, name="mpesa_b2c"),
    path("mpesa/result/", mpesa_result, name="mpesa_result"),
    path("mpesa/timeout/", mpesa_timeout, name="mpesa_timeout"),

    #mpesa payment gateways (B2C)
    path("api/mpesa/stk-push/", stk_push, name="mpesa-stk-push"),
    path("api/mpesa/stk-callback/", stk_callback, name="mpesa-stk-callback"),

    # fetch transactions
    path("api/vendor/transactions/", vendor_transactions, name="vendor-transactions"),
    # transaction totals
    path("api/transactions/totals/",transaction_totals, name="transaction-totals"),

    # paypal webhook
    path("api/paypal/webhook/", paypal_webhook, name="paypal-webhook"),
    path("api/paypal/capture-order/<str:order_id>/", capture_paypal_order, name="capture_paypal_order"),

    # shipping rates

    # handle returns
    # POST (and optionally GET if you add that later)
    path('api/returns-request/<int:item_id>/', return_request_handler_api, name='request-return'),
    # path('api/returns/<int:return_id>/handle-customer-preference/', handle_customer_preference_api),
     # 🛠 Admin approval or rejection
    path(
        "api/returns/<int:return_id>/approve/",
        approve_return_request_api,
        name="approve-return-request-api"
    ),
    path("api/returns/pending/", get_pending_returns_api, name="get-pending-returns-api"),
    
    # order stats
    path("api/pending-orders-stats/", vendor_pending_orders, name="vendor-pending-orders"),
    
    # pending oders
    path("api/vendor-pending-order/items/", vendor_pending_order_items, name="vendor-pending-order-items"),

    #complete orders
    path("api/vendor-complete-order/items/", vendor_completed_order_items, name="vendor-pending-order-items"),

    # customer api
    path('api/customers/', get_customers, name='get_customers'),

    # order fetch api
    # path('api/combined-orders/', vendor_orders_combined, name='get_orders'),

    # Sales dshboard stats
    path('api/sales/stats/', dashboard_stats),
    # stats page for admin
    path("api/admin/dashboard/vendor-sales/", vendor_sales),
    # monthly revenue ststistics
    path("api/revenue-analytics/", vendor_sales),
    
    # api for 
    path("api/admin-transactions/", admin_transactions),


]