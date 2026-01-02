# views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_protect
from core.models import ActivityLog
from django.contrib.auth import get_user_model
from .models import Transaction
from .Serializers import TransactionSerializer
from core.models import Wallet, Voucher
from .Serializers import OrderSerializer

import bleach

from .models import Item, OderItem, Order
from vendorDashboard.models import ReturnRequest
from core.Serializer import ItemSerializer
from decimal import Decimal, InvalidOperation
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import BasePermission
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
import uuid

User = get_user_model()

# custom authentication
class IsAuthenticatedOrVisitor(BasePermission):
    def has_permission(self, request, view):
        if request.user and request.user.is_authenticated:
            return True
        token = request.COOKIES.get("visitorAccessToken")
        if token:
            try:
                validated = JWTAuthentication().get_validated_token(token)
                return validated.get("visitor", False) is True
            except (InvalidToken, TokenError):
                return False
        return False

# -------------------------------
# Sanitizer
# -------------------------------
def sanitize(value):
    if isinstance(value, str):
        return bleach.clean(value)
    return value

# -------------------------------
# Fetch items in cart
# -------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticatedOrVisitor])
def get_cart_view(request):
    try:
        # ---------------------------------------------------
        # 1️⃣ Identify requester → logged-in or visitor
        # ---------------------------------------------------
        user = None
        visitor_id = None

        if request.user and request.user.is_authenticated:
            user = request.user
        else:
            # Always trust the cookie visitorId
            visitor_id = request.COOKIES.get("visitorId")

            token = request.COOKIES.get("visitorAccessToken")
            if token:
                try:
                    # We validate token, but DO NOT override visitor_id
                    JWTAuthentication().get_validated_token(token)
                except Exception:
                    pass

            # If still no visitor ID → no cart exists
            if not visitor_id:
                return Response({
                    "success": True,
                    "order": None,
                    "items": []
                })

        # ---------------------------------------------------
        # 2️⃣ Wallet & vouchers (logged-in only)
        # ---------------------------------------------------
        wallet_data = None
        vouchers_data = []

        if user:
            try:
                wallet = Wallet.objects.get(user=user)
                wallet_data = {"balance": str(wallet.balance)}
            except Wallet.DoesNotExist:
                pass

            vouchers = Voucher.objects.filter(
                user=user,
                redeemed=False
            ).order_by("expiry_date")

            vouchers_data = [
                {"code": v.code, "expiry_date": v.expiry_date}
                for v in vouchers
            ]

        # ---------------------------------------------------
        # 3️⃣ Get active order (pending)
        # ---------------------------------------------------
        filters = {"status__iexact": "pending"}

        if user:
            filters["user"] = user
        else:
            filters["visitor_id"] = visitor_id

        order = Order.objects.filter(**filters).first()

        if not order:
            return Response({
                "success": True,
                "order": None,
                "items": [],
                "wallet": wallet_data,
                "vouchers": vouchers_data,
            })

        # ---------------------------------------------------
        # 4️⃣ Return/exchange credit check
        # ---------------------------------------------------
        queryset = ReturnRequest.objects.filter(
            item__in=order.items.values_list('id', flat=True)
        ).filter(
            Q(status="Approved-Exchange") | Q(approved_by_admin=True)
        )

        if user:
            queryset = queryset.filter(customer=user)
        else:
            queryset = queryset.filter(visitor_id=visitor_id)

        approved_exchange_exists = queryset.exists()

        exchange_credit_str = request.COOKIES.get("exchange_credit", "0.00")
        try:
            exchange_credit = Decimal(exchange_credit_str) if approved_exchange_exists else Decimal("0.00")
        except:
            exchange_credit = Decimal("0.00")

        # ---------------------------------------------------
        # 5️⃣ Final totals
        # ---------------------------------------------------
        try:
            raw_total = Decimal(str(order.final_total_of_cart()))
        except:
            raw_total = Decimal(str(order.get_total()))

        final_total = max(raw_total - exchange_credit, Decimal("0.00"))

        # ---------------------------------------------------
        # 6️⃣ Items serialization
        # ---------------------------------------------------
        items_data = []

        for cart_item in order.items.all():
            item_serializer = ItemSerializer(cart_item.item, context={"request": request})
            item_data = {k: sanitize(v) for k, v in item_serializer.data.items()}

            item_data.update({
                "quantity": cart_item.quantity,
                "ordered_item_id": cart_item.id,
                "status": sanitize(cart_item.status),
                "refunded": cart_item.refunded,
                "is_returned": cart_item.is_returned,
                "is_exchanged": cart_item.is_exchanged,
                "ordered_date": cart_item.ordered_date,
                "final_price": cart_item.get_final_price(),
                "total_item_price": cart_item.get_total_item_price(),
                "amount_saved": cart_item.get_amount_saved(),
            })

            items_data.append(item_data)

        # ---------------------------------------------------
        # 7️⃣ Final response
        # ---------------------------------------------------
        return Response({
            "success": True,
            "wallet": wallet_data,
            "vouchers": vouchers_data,
            "exchange_credit": str(exchange_credit),
            "order": {
                "id": order.id,
                "ordered_date": order.ordered_date,
                "status": sanitize(order.status),
                "total_qty": order.get_total_qty(),
                "total": order.get_total(),
                "final_total": str(final_total),
                "process_payment_url": f"/process-payment/{order.id}/",
            },
            "items": items_data,
        })

    except Exception as e:
        return Response({
            "success": False,
            "message": sanitize(str(e)),
        }, status=400)




# -------------------------------
# Add tom cart
# -------------------------------

@api_view(["POST"])
@permission_classes([IsAuthenticatedOrVisitor])
def add_to_cart_api(request, pk):
    """
    Add an item to the user's or visitor's cart.
    Uses persistent visitorId cookie for guest carts.
    """

    # 🔹 Sanitize incoming item ID
    pk = sanitize(pk)
    item = get_object_or_404(Item, pk=pk)

    # 🔹 Determine if request is from a logged-in user or visitor
    if request.user and request.user.is_authenticated:
        user = request.user
        visitor_id = None
        actor_type = "user"
        actor_name = user.username
    else:
        # ✅ Use persistent visitorId cookie
        visitor_id = request.COOKIES.get("visitorId")
        if not visitor_id:
            # fallback: create a new visitorId
            visitor_id = str(uuid.uuid4())

        user = None
        actor_type = "visitor"
        actor_name = f"Guest ({visitor_id[:8]})"

    # 🔹 Create or get cart item
    cart_item, created = OderItem.objects.get_or_create(
        item=item,
        user=user,
        visitor_id=visitor_id,
        status="pending",
    )

    # 🔹 Create or get pending order
    order, order_created = Order.objects.get_or_create(
        user=user,
        visitor_id=visitor_id,
        status="pending",
        defaults={"ordered_date": timezone.now()},
    )

    # 🔹 Update quantity if item already exists in the order
    if order.items.filter(id=cart_item.id).exists():
        cart_item.quantity += 1
        cart_item.save()
        message = "Item quantity updated in cart"
    else:
        # Instead of order.items.add(cart_item) (invalid), set FK on cart_item
        cart_item.order = order
        cart_item.save()
        message = "Item added to cart"

    # 🔹 Handle exchange scenario for logged-in users
    exchange_info = None
    if user and "exchange_return_id" in request.session:
        return_id = sanitize(request.session.get("exchange_return_id"))
        try:
            return_request = ReturnRequest.objects.get(id=return_id, customer=user)
            original_item = return_request.item
            original_price = original_item.get_final_price()
            replacement_price = item.price
            difference = replacement_price - original_price

            request.session["exchange"] = {
                "return_id": return_id,
                "replacement_item_id": item.id,
                "original_price": float(original_price),
                "replacement_price": float(replacement_price),
                "difference": float(difference),
            }
            exchange_info = request.session["exchange"]
            del request.session["exchange_return_id"]
        except ReturnRequest.DoesNotExist:
            pass

    # create response activity logs (unchanged)
    ActivityLog.objects.create(
        user=user,
        actor_type=actor_type,
        action="item_added_to_cart",
        item=item,
        description=f"You added '{item.name}' to cart.",
        related_url=f"/item-client/{item.id}/"
    )

    ActivityLog.objects.create(
        user=user,
        actor_type='vendor',
        action="item_added_to_cart",
        item=item,
        description=f"{actor_name} added '{item.name}' to cart.",
        related_url=f"/item/{item.id}/"
    )
    
    for admin in User.objects.filter(is_staff=True):
        ActivityLog.objects.create(
            user=admin,
            actor_type="admin",
            action="item_added_to_cart",
            item=item,
            description=f"{actor_name} added '{item.name}' to their cart.",
            related_url=f"/admin-item/vendorDashboard/items/{item.id}/"
        )   

    # 🔹 Build response
    response = Response({
        "success": True,
        "message": sanitize(message),
        "order_id": order.id,
        "cart_item_id": cart_item.id,
        "exchange": exchange_info,
        "visitor_id": visitor_id  # return visitorId for frontend persistence
    })

    # 🔹 Set visitorId cookie if not set
    if not request.COOKIES.get("visitorId") and not user:
        response.set_cookie(
            "visitorId",
            visitor_id,
            httponly=True,
            secure=False,  # Set True in production
            samesite="Lax",
            max_age=30*24*3600,  # 30 days
        )

    return response



# -------------------------------
# Remove from cart
# -------------------------------
@api_view(["DELETE"])
@permission_classes([IsAuthenticatedOrVisitor])
def remove_from_cart_api(request, pk):
    """
    Remove an item from the user's or visitor's cart.
    """

    # 🔹 Sanitize incoming item ID
    pk = sanitize(pk)
    item = get_object_or_404(Item, pk=pk)

    # 🔹 Determine if request is from logged-in user or visitor
    if request.user and request.user.is_authenticated:
        user = request.user
        visitor_id = None
        actor_type = "user"
        actor_name = user.username
    else:
        # ✅ Use persistent visitorId cookie
        visitor_id = request.COOKIES.get("visitorId")
        if not visitor_id:
            # fallback: try access token (optional)
            try:
                token = sanitize(request.COOKIES.get("visitorAccessToken"))
                validated = JWTAuthentication().get_validated_token(token)
                visitor_id = sanitize(str(validated.get("visitor_id") or validated.get("jti")))
            except (InvalidToken, TokenError):
                return Response({"error": "Invalid or expired visitor token"}, status=401)
        user = None
        actor_type = "visitor"
        actor_name = f"Guest ({visitor_id[:8]})"

    # 🔹 Find active order
    order_qs = Order.objects.filter(
        user=user,
        visitor_id=visitor_id,
        status="pending"
    )
    if not order_qs.exists():
        return Response({"success": False, "message": sanitize("You do not have an active order")})

    order = order_qs.first()

    # 🔹 Find the cart item linked to the order
    cart_item = OderItem.objects.filter(
        item=item,
        user=user,
        visitor_id=visitor_id,
        status="pending",
        order=order  # Ensure it's linked to the current order
    ).first()

    if not cart_item:
        return Response({"success": False, "message": sanitize("This item does not exist in the cart")})

    # 🔹 Remove the item from the order by clearing the FK
    cart_item.order = None
    cart_item.save()

    # create response activity logs
    ActivityLog.objects.create(
        user=user,
        actor_type=actor_type,
        action="item_removed_from_cart",
        item=item,
        description=f"You removed '{item.name}' from cart.",
        related_url=f"/item-client/{item.id}/"
    )

    ActivityLog.objects.create(
        user=user,
        actor_type='vendor',
        action="item_removed_from_cart",
        item=item,
        description=f"{actor_name} removed '{item.name}' from cart.",
        related_url=f"/item/{item.id}/"
    )
    
    for admin in User.objects.filter(is_staff=True):
        ActivityLog.objects.create(
            user=admin,
            actor_type="admin",
            action="item_removed_from_cart",
            item=item,
            description=f"{actor_name} removed '{item.name}' from their cart.",
            related_url=f"/admin-item/vendorDashboard/items/{item.id}/"
        )   

    return Response({"success": True, "message": sanitize("Item removed from cart")})



# -------------------------------
# Update cart quantity
# -------------------------------
@api_view(["PATCH"])
@permission_classes([IsAuthenticatedOrVisitor])
def update_cart_quantity(request, pk):
    """
    Update the quantity of an item in the cart for either a logged-in user or a visitor.
    """

    # 🔹 Sanitize item ID
    pk = sanitize(pk)
    item = get_object_or_404(Item, pk=pk)

    # 🔹 Determine user or visitor
    if request.user and request.user.is_authenticated:
        user = request.user
        visitor_id = None
        actor_type = "user"
        actor_name = user.username
    else:
        # ✅ Use persistent visitorId cookie
        visitor_id = request.COOKIES.get("visitorId")
        if not visitor_id:
            # fallback: try access token
            try:
                token = sanitize(request.COOKIES.get("visitorAccessToken"))
                validated = JWTAuthentication().get_validated_token(token)
                visitor_id = sanitize(str(validated.get("visitor_id") or validated.get("jti")))
            except (InvalidToken, TokenError):
                return Response({"error": "Invalid or expired visitor token"}, status=401)
        user = None
        actor_type = "visitor"
        actor_name = f"Guest ({visitor_id[:8]})"

    # 🔹 Find active pending order for user/visitor
    order_qs = Order.objects.filter(
        user=user,
        visitor_id=visitor_id,
        status="pending"
    )
    if not order_qs.exists():
        return Response({"success": False, "message": sanitize("You do not have an active order")}, status=404)

    order = order_qs.first()

    # 🔹 Find the cart item linked to this order
    cart_item = OderItem.objects.filter(
        item=item,
        user=user,
        visitor_id=visitor_id,
        status="pending",
        order=order
    ).first()

    if not cart_item:
        return Response({"success": False, "message": sanitize("Item not found in cart")}, status=404)

    # 🔹 Sanitize action input
    action = sanitize(request.data.get("action", ""))

    if action == "increase":
        cart_item.quantity += 1
        cart_item.save()
        message = "Item quantity increased"
    elif action == "decrease":
        if cart_item.quantity > 1:
            cart_item.quantity -= 1
            cart_item.save()
            message = "Item quantity decreased"
        else:
            # Remove cart item entirely if quantity goes below 1
            cart_item.order = None  # detach from order before delete, if needed
            cart_item.delete()
            message = "Item removed from cart"
            return Response({
                "success": True,
                "message": sanitize(message),
                "item_id": item.id,
                "quantity": 0
            })
    else:
        return Response({"success": False, "message": sanitize("Invalid action")}, status=400)

    # create response activity logs
    ActivityLog.objects.create(
        user=user,
        actor_type=actor_type,
        action="item_updated_qty",
        item=item,
        description=f"You updated '{item.name}' quantity in cart.",
        related_url=f"/item-client/{item.id}/"
    )

    ActivityLog.objects.create(
        user=user,
        actor_type='vendor',
        action="item_updated_qty",
        item=item,
        description=f"{actor_name} updated '{item.name}' quantity in cart.",
        related_url=f"/item/{item.id}/"
    )

    for admin in User.objects.filter(is_staff=True):
        ActivityLog.objects.create(
            user=admin,
            actor_type="admin",
            action="item_updated_qty",
            item=item,
            description=f"{actor_name} updated '{item.name}' quantity in their cart.",
            related_url=f"/admin-item/vendorDashboard/items/{item.id}/"
        )

    return Response({
        "success": True,
        "message": sanitize(message),
        "item_id": item.id,
        "quantity": cart_item.quantity
    })




#fetch cusromer
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

def broadcast_customer_list(customers):
    layer = get_channel_layer()
    async_to_sync(layer.group_send)(
        "customer_list",
        {
            "type": "send_customers_update",
            "customers": customers
        }
    )


# helper get transaction for vendor from the order.orderitem
from django.db.models import Q

def get_vendor_transactions(vendor):
    return Transaction.objects.filter(
        order__items__item__vendor=vendor
    ).distinct().order_by('-created_at')


# veiw get transaction details
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_transactions(request):
    user = request.user
    if not hasattr(user, 'vendor'):
        return Response({"detail": "Not a vendor."}, status=403)

    vendor = user.vendor
    transactions = get_vendor_transactions(vendor)
    serializer = TransactionSerializer(transactions, many=True)
    return Response(serializer.data)



# get sale method
@api_view(["GET"])
@permission_classes([IsAdminUser])
def transaction_totals(request):
    data = {
        "paypal_total": Transaction.get_paypal_total(),
        "mpesa_total": Transaction.get_mpesa_total(),
    }
    return Response(data)


# fetch pending and complete orders
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def vendor_orders_combined(request):
    user = request.user

    # Make sure the user is authenticated
    if not user.is_authenticated:
        return Response({"detail": "Authentication required"}, status=401)

    # Ensure the user is actually a vendor
    if not hasattr(user, "vendor"):
        return Response({"detail": "User is not a vendor"}, status=403)

    vendor = user.vendor

    orders = (
        Order.objects
        .filter(order_items__item__vendor=vendor)
        .prefetch_related("order_items__item")
        .distinct()
        .order_by("-id")
    )

    pending = orders.filter(status="pending")
    completed = orders.filter(status="completed")

    return Response({
        "pending": OrderSerializer(pending, many=True, context={"vendor": vendor}).data,
        "completed": OrderSerializer(completed, many=True, context={"vendor": vendor}).data
    })


