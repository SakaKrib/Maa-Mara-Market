from django.urls import path

from .Mpesa.mpesaCheckout import mpesa_stk_push, mpesa_stk_callback, mpesa_stk_timeout
from .Mpesa.mpesaUtils import (
    mpesa_b2c_payment,
    mpesa_result,
    mpesa_timeout,
    mpesa_refund_result,
    mpesa_refund_timeout,
)
from .dashboardSummery import DashboardSummaryView
from .orderStat import (
    vendor_all_order_items,
    vendor_completed_order_items,
    vendor_pending_order_items,
    vendor_pending_orders,
)
from .paypalApis import get_customers, paypal_webhook
from .returns import (
    approve_return_request_api,
    get_pending_returns_api,
    get_my_return_requests_api,
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
    path("api/sales/stats/", dashboard_stats, name="sales-stats"),
    path("api/admin/dashboard/vendor-sales/", vendor_sales, name="admin-vendor-sales"),
    path("api/admin-transactions/", admin_transactions, name="admin-transactions"),
    path("api/revenue-analytics/", revenue_area_chart, name="revenue-analytics"),

    path("api/transactions/", create_admin_transaction, name="create-admin-transaction"),
    path("api/transactions/history/", admin_transaction_history, name="admin-transaction-history"),
    path("api/transactions/<int:transaction_id>/", update_admin_transaction, name="update-admin-transaction"),
    path("api/transactions/<int:transaction_id>/delete/", delete_admin_transaction, name="delete-admin-transaction"),

    # shipping rates
    path('api/shipping-rates', get_shipping_rates, name='shipping-rates'),

    # create order api
    path("api/customers/", get_customers, name="api-customers"),

    # invoices
    path("api/invoices/", invoice_list, name="invoice-list"),

    # Customer return history (scoped to the authenticated user or visitor cookie)
    path("api/returns/my/", get_my_return_requests_api, name="my-return-requests"),

    # Vendor export includes pending, paid, processing, shipped and completed order lines.
    path("api/vendor-order-items/", vendor_all_order_items, name="vendor-all-order-items"),

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

    # PayPal checkout webhook must remain reachable during maintenance.
    path("api/paypal/webhook/", paypal_webhook, name="paypal-checkout-webhook"),

    # mpesa payment gateways (B2C)
    path("mpesa/b2c/", mpesa_b2c_payment, name="mpesa_b2c"),
    path("mpesa/result/", mpesa_result, name="mpesa_result"),
    path("mpesa/timeout/", mpesa_timeout, name="mpesa_timeout"),
    path("api/mpesa/stk-push/", mpesa_stk_push, name="mpesa_stk_push"),
    path("api/mpesa/stk-callback/", mpesa_stk_callback, name="mpesa_stk_callback"),
    path("api/mpesa/stk-timeout/", mpesa_stk_timeout, name="mpesa_stk_timeout"),

]

  
# Durable fulfilment, dispatch inspection, and shipment-tracking workflow.
from .fulfillment import (
    admin_fulfillment_queue,
    carrier_tracking_webhook,
    confirm_carrier_handover,
    create_shipment,
    customer_accept_item,
    customer_fulfillment_detail,
    customer_report_item_issue,
    dispatch_inspection,
    manual_shipment_event,
    refresh_shipment_tracking,
    resolve_fulfillment_issue,
    vendor_advance_fulfillment,
    vendor_fulfillment_list,
)

urlpatterns += [
    path("api/fulfillment/vendor/", vendor_fulfillment_list, name="vendor-fulfillment-list"),
    path("api/fulfillment/customer/<int:order_id>/", customer_fulfillment_detail, name="customer-fulfillment-detail"),
    path("api/fulfillment/admin/", admin_fulfillment_queue, name="admin-fulfillment-queue"),
    path("api/fulfillment/items/<int:order_item_id>/advance/", vendor_advance_fulfillment, name="vendor-advance-fulfillment"),
    path("api/fulfillment/items/<int:order_item_id>/dispatch-inspection/", dispatch_inspection, name="dispatch-inspection"),
    path("api/fulfillment/shipments/", create_shipment, name="create-shipment"),
    path("api/fulfillment/shipments/<int:shipment_id>/handover/", confirm_carrier_handover, name="confirm-carrier-handover"),
    path("api/fulfillment/shipments/<int:shipment_id>/refresh/", refresh_shipment_tracking, name="refresh-shipment-tracking"),
    path("api/fulfillment/shipments/<int:shipment_id>/events/", manual_shipment_event, name="manual-shipment-event"),
    path("api/fulfillment/items/<int:order_item_id>/accept/", customer_accept_item, name="customer-accept-item"),
    path("api/fulfillment/items/<int:order_item_id>/report-issue/", customer_report_item_issue, name="customer-report-item-issue"),
    path("api/fulfillment/items/<int:order_item_id>/resolve-issue/", resolve_fulfillment_issue, name="resolve-fulfillment-issue"),
    path("api/fulfillment/carriers/<str:carrier>/webhook/", carrier_tracking_webhook, name="carrier-tracking-webhook"),
]
