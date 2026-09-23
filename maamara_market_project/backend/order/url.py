from django.urls import path

from .Mpesa.C2BMpesaIntergration.c2butils import stk_callback, stk_push
from .Mpesa.mpesaUtils import (
    mpesa_b2c_payment,
    mpesa_result,
    mpesa_timeout,
    mpesa_refund_result,
    mpesa_refund_timeout,
)
from .capture_order import capture_paypal_order
from .dashboardSummery import DashboardSummaryView
from .orderStat import (
    vendor_completed_order_items,
    vendor_pending_order_items,
    vendor_pending_orders,
)
from .paypalApis import checkout_view, checkout_status, get_customers
from .returns import (
    approve_return_request_api,
    get_pending_returns_api,
    process_refund_api,
    return_request_handler_api,
)
from .shipping import get_shipping_rates
from .views import (
    add_to_cart_api,
    get_cart_view,
    remove_from_cart_api,
    remove_all_from_cart_api,
    update_cart_quantity,
    vendor_transactions,
    dashboard_stats,
    revenue_area_chart,
    dashboard_chart_data,
    revenue_growth,
    transaction_totals,
    vendor_sales,
    admin_transactions,
    create_admin_transaction,
    admin_transaction_history,
    update_admin_transaction,
    delete_admin_transaction,
)
from .invoice_views import invoice_list


urlpatterns = [
    path('api/cart/add/<int:pk>/', add_to_cart_api, name='api_add_to_cart'),
    path("api/cart/remove/<int:pk>/", remove_from_cart_api, name="remove_from_cart"),
    path("api/cart/remove-all/", remove_all_from_cart_api, name="remove_all_from_cart"),
    path("api/cart/", get_cart_view, name="cart_view"),
    path("api/cart/<int:pk>/update-quantity/", update_cart_quantity, name="update-cart-quantity"),

    # account summary
    path("api/dashboard/summary/", DashboardSummaryView.as_view()),
    path("api/admin/dashboard-chart-data/", dashboard_chart_data, name="admin-dashboard-chart-data"),

    path("api/transactions/", create_admin_transaction, name="create-admin-transaction"),
    path("api/transactions/history/", admin_transaction_history, name="admin-transaction-history"),
    path("api/transactions/<int:transaction_id>/", update_admin_transaction, name="update-admin-transaction"),
    path("api/transactions/<int:transaction_id>/delete/", delete_admin_transaction, name="delete-admin-transaction"),

    # shipping rates
    path('api/shipping-rates', get_shipping_rates, name='shipping-rates'),

    # create order api
    path("api/checkout/", checkout_view, name="checkout"),
    path("api/checkout/<uuid:checkout_id>/status/", checkout_status, name="checkout-status"),
    path("api/customers/", get_customers, name="api-customers"),
    path("api/paypal/capture/<str:order_id>/", capture_paypal_order, name="paypal-capture"),

    # invoices
    path("api/invoices/", invoice_list, name="invoice-list"),

    # Returns / refunds
    path(
        "api/returns-request/<int:item_id>/",
        return_request_handler_api,
        name="return-request",
    ),
    path(
        "api/returns/pending/",
        get_pending_returns_api,
        name="pending-returns",
    ),
    path(
        "api/returns/<int:return_id>/approve/",
        approve_return_request_api,
        name="approve-return",
    ),
    path("api/refunds/<int:refund_id>/process/", process_refund_api, name="process-refund"),
    path("api/mpesa/refund/result/", mpesa_refund_result, name="mpesa-refund-result"),
    path("api/mpesa/refund/timeout/", mpesa_refund_timeout, name="mpesa-refund-timeout"),

    # mpesa payment gateways (B2C)
    path("mpesa/b2c/", mpesa_b2c_payment, name="mpesa_b2c"),
    path("mpesa/result/", mpesa_result, name="mpesa_result"),
    path("mpesa/timeout/", mpesa_timeout, name="mpesa_timeout"),

    # mpesa payment gateways (B2C)
    path("api/mpesa/stk-push/", stk_push, name="mpesa-stk-push"),
    path("api/mpesa/stk-callback/", stk_callback, name="mpesa-stk-callback"),
]
