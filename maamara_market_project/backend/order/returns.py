from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from vendorDashboard.models import ReturnRequest, Vendor, VendorAdjustment
from django.contrib.auth import get_user_model
from order.models import OrderItem  
from .views import IsAuthenticatedOrVisitor
from vendorDashboard.serializers import ReturnRequestSerializer
from decimal import Decimal
from core.models import Notification, ActivityLog
from rest_framework.permissions import BasePermission
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
import uuid
import bleach
from django.db.models import Q
from django.db import transaction
import logging
from django.conf import settings
from .refund_tasks import process_refund_task
from .models import Order, Refund

User = get_user_model()
logger = logging.getLogger(__name__)

# -------------------------------
# Sanitizer
# -------------------------------
def sanitize(value):
    if isinstance(value, str):
        return bleach.clean(value)
    return value


@api_view(["POST"])
@permission_classes([IsAuthenticatedOrVisitor])
@parser_classes([MultiPartParser, FormParser])
@transaction.atomic
def return_request_handler_api(request, item_id):
    """
    Handles:
    1️⃣ Creating a return request
    2️⃣ Processing customer preference (refund or exchange)
    ✅ Logs and notifies User, Visitor, Vendor, and Admin.
    """
    try:
        # --- Identify user or visitor ---
        if request.user and request.user.is_authenticated:
            user = request.user
            visitor_id = None
            actor_type = "user"
            actor_name = user.username
        else:
            visitor_id = request.COOKIES.get("visitorId")
            if not visitor_id:
                try:
                    token = sanitize(request.COOKIES.get("visitorAccessToken"))
                    validated = JWTAuthentication().get_validated_token(token)
                    visitor_id = sanitize(str(validated.get("visitor_id") or validated.get("jti")))
                except (InvalidToken, TokenError):
                    return Response({"error": "Invalid or expired visitor token"}, status=401)
            user = None
            actor_type = "visitor"
            actor_name = f"Guest ({visitor_id[:8]})"

        # --- Find ordered item ---
        item = (
            OrderItem.objects.select_for_update().filter(id=item_id, user=user).first()
            if user
            else OrderItem.objects.select_for_update().filter(id=item_id, visitor_id=visitor_id).first()
        )

        if not item:
            return Response({
                "success": False,
                "error": "No matching ordered item found for this user or visitor."
            }, status=status.HTTP_404_NOT_FOUND)

        # --- Get the order containing this item ---
        order = (
            Order.objects
            .select_for_update()
            .select_related("payment")
            .filter(order_items=item)
            .first()
        )
        if not order:
            return Response({
                "success": False,
                "error": "The ordered item is not attached to an order.",
            }, status=status.HTTP_409_CONFLICT)

        # Returns/refunds are only valid for paid, completed orders.
        if order.status != "completed" or not order.payment or order.payment.status != "completed":
            return Response({
                "success": False,
                "error": "Only completed, paid orders can be returned.",
            }, status=status.HTTP_409_CONFLICT)

        # A line can only be returned/exchanged once.
        if item.refunded or item.is_returned or item.is_exchanged:
            return Response({
                "success": False,
                "error": "This order item has already been returned, exchanged, or refunded.",
            }, status=status.HTTP_409_CONFLICT)

        # --- Check if a return already exists ---
        existing_return = (
            ReturnRequest.objects
            .select_for_update()
            .filter(item=item)
            .first()
        )

        # Step 1️⃣ — Create a new return request if not exists
        if not existing_return:
            serializer = ReturnRequestSerializer(data=request.data)
            if serializer.is_valid():
                return_request = serializer.save(
                    customer=user,
                    visitor_id=visitor_id,
                    item=item,
                )

                product_name = item.item.name
                vendor = Vendor.objects.get(user=item.item.created_by)

                # ✅ Log & notify all parties
                # -- User or Visitor activity
                ActivityLog.objects.create(
                    user=user,
                    actor_type=actor_type,
                    action="return_requested",
                    item=item.item,
                    description=f"{actor_name} submitted a return request for '{product_name}'.",
                    related_url=f"/orders/{order.id}/returns/"
                )

                if user:
                    Notification.objects.create(
                        user=user,
                        title="Return Request Created",
                        message=f"We’ve received your return request for '{product_name}'.",
                        url=f"/orders/{order.id}/returns/"
                    )
                else:
                    # ✅ Visitor notification
                    Notification.objects.create(
                        visitor_id=visitor_id,
                        title="Return Request Created",
                        message=f"We’ve received your return request for '{product_name}'.",
                        url=f"/visitor/returns/{item.id}/"
                    )

                # -- Vendor activity & notification
                ActivityLog.objects.create(
                    user=vendor.user,
                    actor_type="vendor",
                    action="return_requested",
                    item=item.item,
                    description=f"A return request was made for your item '{product_name}'.",
                    related_url=f"/vendor/orders/{order.id}/returns/"
                )

                Notification.objects.create(
                    user=vendor.user,
                    title="New Return Request",
                    message=f"A customer requested a return for '{product_name}'.",
                    url=f"/vendor/orders/{order.id}/returns/"
                )

                # -- Admin activity & notification
                for admin in User.objects.filter(is_staff=True):
                    ActivityLog.objects.create(
                        user=admin,
                        actor_type="admin",
                        action="return_requested",
                        item=item.item,
                        description=f"{actor_name} requested a return for '{product_name}'.",
                        related_url=f"/admin/returns/{item.id}/"
                    )
                    Notification.objects.create(
                        user=admin,
                        title="New Return Request",
                        message=f"{actor_name} submitted a return request for '{product_name}'.",
                        url=f"/admin/returns/{item.id}/"
                    )

            else:
                return Response({
                    "success": False,
                    "errors": serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
        else:
            return_request = existing_return
            if return_request.status in {"approved_refund", "approved_exchange", "rejected"}:
                return Response({
                    "success": False,
                    "error": "This return request has already been decided.",
                    "return_request": ReturnRequestSerializer(return_request).data,
                }, status=status.HTTP_409_CONFLICT)

        # Step 2️⃣ — Handle customer preference. Once chosen, it cannot silently change.
        requested_pref = request.data.get("customer_preference")
        customer_pref = return_request.customer_preference or requested_pref
        if requested_pref and return_request.customer_preference and requested_pref != return_request.customer_preference:
            return Response({
                "success": False,
                "error": "This return request already has a different customer preference.",
            }, status=status.HTTP_409_CONFLICT)

        if not customer_pref:
            return Response({
                "success": True,
                "message": "Return request created successfully. Waiting for customer preference.",
                "return_request": ReturnRequestSerializer(return_request).data
            }, status=status.HTTP_201_CREATED)

        if return_request.start_refund:
            return Response({
                "message": "This return has already been processed."
            }, status=status.HTTP_400_BAD_REQUEST)

        # --- Process refund or exchange ---
        order_item = return_request.item
        product = order_item.item
        vendor = Vendor.objects.get(user=product.created_by)
        product_name = product.name
        quantity = order_item.quantity

        # Refund/exchange credit must use the immutable purchase price, not
        # today's catalog price. This prevents price changes after checkout
        # from changing the customer's refund amount.
        purchase_unit_price = Decimal(str(order_item.price_at_purchase))
        total_refund = (purchase_unit_price * quantity).quantize(Decimal("0.01"))

        # ✅ REFUND
        if customer_pref == "refund":

            vendor_adjustment = VendorAdjustment.objects.create(
                vendor=vendor,
                order_item=order_item,
                amount=total_refund,
                reason=f"Customer refund for {product_name} (OrderItem ID: {order_item.id})",
                customer_preference="refund",
            )
            return_request.vendor_adjustment = vendor_adjustment
            if not return_request.customer_preference:
                return_request.customer_preference = "refund"

            return_request.start_refund = True
            return_request.refund_issued = False
            return_request.save()

            # 🧾 Notify all parties
            if user:
                Notification.objects.create(
                    user=user,
                    title="Refund Request Submitted",
                    message=f"Your refund request for '{product_name}' worth {total_refund} has been received.",
                    url=f"/orders/{order.id}/returns/"
                )
            else:
                Notification.objects.create(
                    visitor_id=visitor_id,
                    title="Refund Request Submitted",
                    message=f"Your refund request for '{product_name}' worth {total_refund} has been received.",
                    url=f"/visitor/returns/{item.id}/"
                )

            Notification.objects.create(
                user=vendor.user,
                title="Refund Requested",
                message=f"A refund has been requested for your product '{product_name}'.",
                url=f"/vendor/orders/{order.id}/returns/"
            )

            for admin in User.objects.filter(is_staff=True):
                Notification.objects.create(
                    user=admin,
                    title="Refund Pending Approval",
                    message=f"{actor_name} requested a refund for '{product_name}' worth {total_refund}.",
                    url=f"/admin-returns/{return_request.id}/"
                )

            response = Response({
                "success": True,
                "message": f"Refund prepared: {total_refund}. Awaiting admin approval.",
                "refund_amount": str(total_refund)
            }, status=status.HTTP_200_OK)

            response.set_cookie(
                key="refund_amount",
                value=str(total_refund),
                httponly=True,
                secure=not settings.DEBUG,
                samesite="Lax",
                max_age=7 * 24 * 60 * 60,
            )
            return response

        # ✅ EXCHANGE
        elif customer_pref == "exchange":
            total_exchange_credit = total_refund

            vendor_adjustment =  VendorAdjustment.objects.create(
                vendor=vendor,
                order_item=order_item,
                amount=total_exchange_credit,
                reason=f"Exchange credit for {product_name} x{quantity} (OrderItem ID: {order_item.id})",
                customer_preference='exchange'
            )
            
            return_request.vendor_adjustment = vendor_adjustment
            return_request.start_refund = True
            return_request.save()

            # 🧾 Notify all parties
            if user:
                Notification.objects.create(
                    user=user,
                    title="Exchange Request Created",
                    message=f"Your exchange request for '{product_name}' has been received. You can now select a replacement item.",
                    url=f"/orders/{order.id}/returns/"
                )
            else:
                Notification.objects.create(
                    visitor_id=visitor_id,
                    title="Exchange Request Created",
                    message=f"Your exchange request for '{product_name}' has been received. You can now select a replacement item.",
                    url=f"/visitor/returns/{item.id}/"
                )

            Notification.objects.create(
                user=vendor.user,
                title="Exchange Requested",
                message=f"A customer requested an exchange for '{product_name}'.",
                url=f"/vendor/orders/{order.id}/returns/"
            )

            for admin in User.objects.filter(is_staff=True):
                Notification.objects.create(
                    user=admin,
                    title="Exchange Pending Approval",
                    message=f"{actor_name} requested an exchange for '{product_name}'.",
                    url=f"/admin-returns/{return_request.id}/"
                )

            # ✅ Respond with exchange credit cookie
            response = Response({
                "success": True,
                "message": "Exchange credit created. You can now select a replacement item.",
                "exchange_credit": str(total_exchange_credit)
            }, status=status.HTTP_200_OK)

            response.set_cookie(
                key="exchange_credit",
                value=str(float(total_exchange_credit)),
                httponly=True,
                secure=not settings.DEBUG,
                samesite="Lax",
                max_age=7 * 24 * 60 * 60,  # 7 days
            )

            return response

        return Response({
            "success": False,
            "message": "Invalid customer preference."
        }, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        logger.exception("Return request handler failed")
        return Response({
            "success": False,
            "error": "Unable to process the return request."
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


    



# Admin approval rejecction


@api_view(["POST"])
@permission_classes([IsAdminUser])
@transaction.atomic
def approve_return_request_api(request, return_id):
    """
    Admin-only endpoint to approve or reject a refund or exchange request.
    Also notifies the customer, vendor, and all admins.
    """
    try:
        # 🔍 Fetch the return request
        return_request = get_object_or_404(
            ReturnRequest.objects.select_related("item__item", "customer"),
            id=return_id,
        )
        admin = request.user

        action = request.data.get("action")  # expected: "approve" or "reject"
        admin_note = request.data.get("admin_note", "").strip()

        if action not in ["approve", "reject"]:
            return Response({
                "success": False,
                "error": "Invalid action. Must be 'approve' or 'reject'."
            }, status=status.HTTP_400_BAD_REQUEST)

        return_request = (
            ReturnRequest.objects
            .select_for_update()
            .select_related("item__item", "customer")
            .get(pk=return_id)
        )

        # Terminal states are idempotent: a repeated admin request must
        # not create another adjustment or mutate an already-decided return.
        if return_request.status in {"approved_refund", "approved_exchange", "rejected"}:
            return Response({
                "success": True,
                "message": "Return request has already been decided.",
                "return_request": ReturnRequestSerializer(return_request).data,
            }, status=status.HTTP_200_OK)

        item = return_request.item
        product = item.item
        vendor = Vendor.objects.get(user=product.created_by)
        order = Order.objects.select_for_update().filter(order_items=item).select_related("payment").first()
        if not order or not order.payment or order.payment.status != "completed":
            return Response({
                "success": False,
                "error": "The return is not linked to a completed payment.",
            }, status=status.HTTP_409_CONFLICT)
        customer = return_request.customer
        visitor_id = return_request.visitor_id
        pref = return_request.customer_preference or "unspecified"

        # ✅ APPROVAL FLOW
        if action == "approve":
            if pref == "refund":
                adjustment = return_request.vendor_adjustment
                if not adjustment:
                    return Response({
                        "success": False,
                        "error": "Refund adjustment is missing for this return request.",
                    }, status=status.HTTP_409_CONFLICT)

                payment = order.payment
                provider = payment.payment_method
                if provider not in {"PayPal", "Mpesa"}:
                    return Response({
                        "success": False,
                        "error": "Automatic refunds are currently supported only for PayPal and M-Pesa payments.",
                    }, status=status.HTTP_409_CONFLICT)

                # The adjustment is created from the immutable purchase price
                # and must agree with the return ledger amount.
                expected_amount = (
                    Decimal(str(order_item.price_at_purchase)) * order_item.quantity
                ).quantize(Decimal("0.01"))
                if adjustment.amount != expected_amount:
                    return Response({
                        "success": False,
                        "error": "The refund adjustment does not match the purchased item amount.",
                    }, status=status.HTTP_409_CONFLICT)

                # Vendor adjustments are recorded in KES. PayPal settles in USD,
                # so the refund ledger must store the provider-currency amount.
                refund_amount = adjustment.amount
                refund_currency = "KES"
                if provider == "PayPal":
                    if not payment.provider_amount or payment.amount <= Decimal("0.00"):
                        return Response({
                            "success": False,
                            "error": "The PayPal settlement amount is unavailable for refund conversion.",
                        }, status=status.HTTP_409_CONFLICT)
                    refund_amount = (
                        adjustment.amount * Decimal(str(payment.provider_amount)) / Decimal(str(payment.amount))
                    ).quantize(Decimal("0.01"))
                    if refund_amount <= Decimal("0.00"):
                        return Response({
                            "success": False,
                            "error": "The calculated PayPal refund amount is invalid.",
                        }, status=status.HTTP_409_CONFLICT)
                    refund_currency = (payment.provider_currency or "USD").upper()

                refund, created = Refund.objects.get_or_create(
                    return_request=return_request,
                    defaults={
                        "payment": payment,
                        "amount": refund_amount,
                        "currency": refund_currency,
                        "provider": provider,
                        "status": "approved",
                    },
                )
                if not created:
                    # Never silently change a completed/processing refund's
                    # financial terms during a repeated approval request.
                    if refund.status in {"completed", "processing"}:
                        return Response({
                            "success": True,
                            "message": "Refund processing is already in progress or completed.",
                            "return_request": ReturnRequestSerializer(return_request).data,
                        }, status=status.HTTP_200_OK)

                    if refund.status == "failed":
                        refund.status = "approved"
                        refund.failure_reason = None
                        refund.amount = refund_amount
                        refund.currency = refund_currency
                        refund.provider = provider
                        refund.payment = payment
                        refund.save(update_fields=[
                            "status", "failure_reason", "amount", "currency", "provider",
                            "payment", "updated_at",
                        ])

                # Only mutate the return/adjustment approval state after every
                # provider and refund-ledger precondition has passed.
                return_request.approved = True
                return_request.approved_by_admin = True
                return_request.admin_action = "approved"
                return_request.refund_issued = False
                return_request.status = "approved_refund"
                return_request.admin_note = admin_note
                return_request.save(update_fields=[
                    "approved", "approved_by_admin", "admin_action",
                    "refund_issued", "status", "admin_note",
                ])

                adjustment.is_approved = True
                adjustment.save(update_fields=["is_approved"])

                if refund.provider in {"PayPal", "Mpesa"} and refund.status == "approved":
                    transaction.on_commit(lambda refund_id=refund.id: process_refund_task.delay(refund_id))

                # --- 🔔 Notifications ---
                msg = f"Refund approved for '{product.name}'. Amount will be refunded shortly."

                # Customer / Visitor Notification
                if customer:
                    ActivityLog.objects.create(
                        user=customer,
                        actor_type="user",
                        action="refund_approved",
                        item=product,
                        description=msg,
                        related_url=f"/orders/returns/{return_request.id}/"
                    )

                    # notifications
                    Notification.objects.create(
                        user=customer,
                        title="Refund Requested",
                        message=f"You have requested for a refund on  product '{product.name}'.",
                        url=f"/orders/returns/{return_request.id}/"
                    )
                elif visitor_id:
                    ActivityLog.objects.create(
                        visitor_id=visitor_id,
                        actor_type="visitor",
                        action="refund_approved",
                        item=product,
                        description=msg,
                        related_url=f"/orders/returns/{return_request.id}/"
                    )

                    # notify visitor
                    Notification.objects.create(
                        visitor_id=visitor_id,
                        title="Refund Requested",
                        message=f"You have requested for a refund on  product '{product.name}'.",
                        url=f"/orders/returns/{return_request.id}/"
                    )

                # Vendor Notification
                ActivityLog.objects.create(
                    user=vendor.user,
                    actor_type="vendor",
                    action="refund_approved_vendor",
                    item=product,
                    description=f"Admin approved refund for '{product.name}'.",
                    related_url=f"/vendor/returns/{return_request.id}/"
                )

                # notifications
                Notification.objects.create(
                    user=vendor.user,
                    title="Refund Request Approved",
                    message=f"A refund has been Approved by Admin for your product '{product.name} your account will be affected for the adjustments will be made in the following moth payouts'.",
                    url=f"/vendor/orders/{order.id}/returns/"
                )

                # Notify all Admins
                for admin_user in User.objects.filter(is_staff=True):
                    ActivityLog.objects.create(
                        user=admin_user,
                        actor_type="admin",
                        action="refund_approved_admin",
                        item=product,
                        description=f"Refund approved for '{product.name}' by {admin.username}.",
                        related_url=f"/admin/vendorDashboard/returns/{return_request.id}/"
                    )

                return Response({
                    "success": True,
                    "message": f"Refund approved successfully for item {item.id}.",
                    "return_request": ReturnRequestSerializer(return_request).data
                }, status=status.HTTP_200_OK)

            elif pref == "exchange":
                return_request.approved = True
                return_request.approved_by_admin = True
                return_request.admin_action = "approved"
                return_request.status = "approved_exchange"
                return_request.admin_note = admin_note
                return_request.save()

                adjustment = return_request.vendor_adjustment
                if adjustment:
                    adjustment.is_approved = True
                    adjustment.save(update_fields=["is_approved"])

                # --- 🔔 Notifications ---
                msg = f"Exchange approved for '{product.name}'. You can now redeem your exchange credit."

                # Customer / Visitor Notification
                if customer:
                    ActivityLog.objects.create(
                        user=customer,
                        actor_type="user",
                        action="exchange_approved",
                        item=product,
                        description=msg,
                        related_url=f"/orders/returns/{return_request.id}/"
                    )

                    # notifications
                    Notification.objects.create(
                        user=customer,
                        title="Exchange Request",
                        message=f"You have requested for an exchange on  product '{product.name}'.",
                        url=f"/vendor/orders/{product.user.order.id}/returns/"
                    )

                elif visitor_id:
                    ActivityLog.objects.create(
                        visitor_id=visitor_id,
                        actor_type="visitor",
                        action="exchange_approved",
                        item=product,
                        description=msg,
                        related_url=f"/orders/returns/{return_request.id}/"
                    )

                     # notify visitor
                    Notification.objects.create(
                        visitor_id=visitor_id,
                        title="Exchange Request",
                        message=f"You have requested for an exchange on  product '{product.name}'.",
                        url=f"/vendor/orders/{product.user.order.id}/returns/"
                    )

                # Vendor Notification
                ActivityLog.objects.create(
                    user=vendor.user,
                    actor_type="vendor",
                    action="exchange_approved_vendor",
                    item=product,
                    description=f"Admin approved exchange for '{product.name}'.",
                    related_url=f"/vendor/returns/{return_request.id}/"
                )

                 # notifications for vendor
                Notification.objects.create(
                    user=vendor.user,
                    title="Exchange Request Approved",
                    message=f"An Exchange has been Approved by Admin for your product '{product.name} your account will be affected for the adjustments will be made in the following moth payouts'.",
                    url=f"/vendor/orders/{product.user.order.id}/returns/"
                )

                # Notify all Admins
                for admin_user in User.objects.filter(is_staff=True):
                    ActivityLog.objects.create(
                        user=admin_user,
                        actor_type="admin",
                        action="exchange_approved_admin",
                        item=product,
                        description=f"Exchange approved for '{product.name}' by {admin.username}.",
                        related_url=f"/admin/vendorDashboard/returns/{return_request.id}/"
                    )

                return Response({
                    "success": True,
                    "message": f"Exchange approved successfully for item {item.id}.",
                    "return_request": ReturnRequestSerializer(return_request).data
                }, status=status.HTTP_200_OK)

        # ❌ REJECTION FLOW
        elif action == "reject":
            return_request.status = "rejected"
            return_request.approved = False
            return_request.approved_by_admin = False
            return_request.admin_action = "rejected"
            return_request.admin_note = admin_note
            return_request.save()

            msg = f"Your return request for '{product.name}' was rejected. {admin_note or ''}"

            # Customer / Visitor Notification
            if customer:
                ActivityLog.objects.create(
                    user=customer,
                    actor_type="user",
                    action="return_rejected",
                    item=product,
                    description=msg,
                    related_url=f"/orders/returns/{return_request.id}/"
                )
            elif visitor_id:
                ActivityLog.objects.create(
                    visitor_id=visitor_id,
                    actor_type="visitor",
                    action="return_rejected",
                    item=product,
                    description=msg,
                    related_url=f"/orders/returns/{return_request.id}/"
                )

            # Vendor Notification
            ActivityLog.objects.create(
                user=vendor.user,
                actor_type="vendor",
                action="return_rejected_vendor",
                item=product,
                description=f"Return request for '{product.name}' was rejected by admin.",
                related_url=f"/vendor/returns/{return_request.id}/"
            )

            # Notify all Admins
            for admin_user in User.objects.filter(is_staff=True):
                ActivityLog.objects.create(
                    user=admin_user,
                    actor_type="admin",
                    action="return_rejected_admin",
                    item=product,
                    description=f"Return for '{product.name}' rejected by {admin.username}.",
                    related_url=f"/admin/vendorDashboard/returns/{return_request.id}/"
                )

            return Response({
                "success": True,
                "message": "Return request rejected.",
                "return_request": ReturnRequestSerializer(return_request).data
            }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.exception("Return approval handler failed")
        return Response({
            "success": False,
            "error": "Unable to process the return decision."
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# get pending returns
@api_view(["GET"])
@permission_classes([IsAdminUser])
def get_pending_returns_api(request):
    """
    🧾 Admin-only endpoint:
    Retrieve all return requests that are NOT yet approved or rejected.
    """
    try:
        # 🔍 Get unapproved returns
        pending_returns = ReturnRequest.objects.filter(
            Q(approved_by_admin=False) & Q(status__in=["pending", "requested", "awaiting_approval"])
        ).order_by("-created_at")

        if not pending_returns.exists():
            return Response({
                "success": True,
                "message": "No pending return requests at the moment.",
                "count": 0,
                "results": []
            }, status=status.HTTP_200_OK)

        serializer = ReturnRequestSerializer(pending_returns, many=True)

        return Response({
            "success": True,
            "message": "Pending return requests fetched successfully.",
            "count": pending_returns.count(),
            "results": serializer.data
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.exception("Pending returns lookup failed")
        return Response({
            "success": False,
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(["POST"])
@permission_classes([IsAdminUser])
@transaction.atomic
def process_refund_api(request, refund_id):
    """Admin-only retry/dispatch endpoint for a PayPal refund ledger entry."""
    try:
        refund = Refund.objects.select_for_update().get(pk=refund_id)

        if refund.provider not in {"PayPal", "Mpesa"}:
            return Response(
                {"success": False, "error": "This refund provider is not implemented."},
                status=status.HTTP_409_CONFLICT,
            )

        if refund.status == "completed":
            return Response(
                {"success": True, "message": "Refund is already completed."},
                status=status.HTTP_200_OK,
            )

        if refund.status == "failed":
            refund.status = "approved"
            refund.failure_reason = None
            refund.save(update_fields=["status", "failure_reason", "updated_at"])

        transaction.on_commit(
            lambda refund_id=refund.id: process_refund_task.delay(refund_id)
        )

        return Response(
            {
                "success": True,
                "message": "Refund processing has been queued.",
                "refund_id": refund.id,
                "status": refund.status,
            },
            status=status.HTTP_202_ACCEPTED,
        )
    except Refund.DoesNotExist:
        return Response(
            {"success": False, "error": "Refund record not found."},
            status=status.HTTP_404_NOT_FOUND,
        )
    except Exception:
        logger.exception("Refund dispatch failed")
        return Response(
            {"success": False, "error": "Unable to queue refund processing."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
