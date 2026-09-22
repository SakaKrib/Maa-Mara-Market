from datetime import datetime, timedelta
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from decimal import Decimal
import logging
import uuid

import bleach
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import models, transaction
from django.db.models import Count, Prefetch, Q, Sum
from django.db.models.functions import TruncMonth
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import BasePermission, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from ReactSerializers.models import AgeVariant, ColorVariant, Item, Length, Shoe, SizeStock, Weight
from core.Serializer import ItemSerializer
from core.models import ActivityLog, Voucher, Wallet
from vendorDashboard.models import ReturnRequest, VendorPayout

from .Serializers import TransactionSerializer
from .models import OrderItem, Order, Refund, Transaction

User = get_user_model()
logger = logging.getLogger(__name__)


class IsAuthenticatedOrVisitor(BasePermission):
    """Allow an authenticated user or a visitor with a cookie-bound visitor token."""

    def has_permission(self, request, view):
        if request.user and request.user.is_authenticated:
            return True

        visitor_id = request.COOKIES.get("visitorId")
        visitor_token = request.COOKIES.get("visitorAccessToken")
        if not visitor_id or not visitor_token:
            return False

        try:
            validated = JWTAuthentication().get_validated_token(visitor_token)
        except (InvalidToken, TokenError):
            return False

        token_visitor_id = str(validated.get("visitor_id", ""))
        return bool(validated.get("visitor", False) and token_visitor_id == str(visitor_id))
    


 


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
            # The permission class has already bound visitorId to visitorAccessToken.
            visitor_id = request.COOKIES.get("visitorId")

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
                "variant_id": cart_item.color_variant_id,
                "variant_color": cart_item.color_variant.color if cart_item.color_variant else None,
                "size_id": cart_item.size_stock_id,
                "size": cart_item.size_stock.size if cart_item.size_stock else None,
                "age_variant_id": cart_item.age_variant_id,
                "age_group": cart_item.age_variant.age_group if cart_item.age_variant else None,
                "selected_length": cart_item.selected_length,
                "selected_weight": cart_item.selected_weight,
                "shoe_size": cart_item.shoe_size,
                "custom_preferences": cart_item.custom_preferences or {},
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

    except Exception:
        logger.exception("Unexpected error while fetching cart")
        return Response({
            "success": False,
            "message": "Unable to load cart. Please try again.",
        }, status=500)




# -------------------------------
# Add tom cart
# -------------------------------
@api_view(["POST"])
@permission_classes([IsAuthenticatedOrVisitor])
@transaction.atomic
def add_to_cart_api(request, pk):
    """
    Add an item to the user's or visitor's cart.
    Handles all variations (color, size, age, length, weight, shoe) and freezes price_at_purchase.
    """

    # Sanitize incoming item ID
    pk = sanitize(pk)
    item = get_object_or_404(Item.objects.select_for_update(), pk=pk)

    # Determine if request is from a logged-in user or visitor
    if request.user and request.user.is_authenticated:
        user = request.user
        visitor_id = None
        actor_type = "user"
        actor_name = user.username
    else:
        visitor_id = request.COOKIES.get("visitorId")
        if not visitor_id:
            visitor_id = str(uuid.uuid4())
        user = None
        actor_type = "visitor"
        actor_name = f"Guest ({visitor_id[:8]})"

    # Get quantity from request body (default to 1)
    requested_qty = request.data.get("quantity", 1)
    try:
        requested_qty = int(requested_qty)
        if requested_qty < 1:
            requested_qty = 1
    except (ValueError, TypeError):
        requested_qty = 1

    # --- Get selected variations ---
    variant_id = request.data.get("variant_id")
    size_id = request.data.get("size_id")
    age_variant_id = request.data.get("age_variant_id")
    length_id = request.data.get("length_id")
    weight_id = request.data.get("weight_id")
    shoe_id = request.data.get("shoe_id")
    selected_shoe_size = request.data.get("selected_shoe_size")
    custom_preferences = request.data.get("custom_preferences") or {}
    if not isinstance(custom_preferences, dict):
        return Response({"success": False, "error": "Custom preferences must be an object."}, status=400)

    variant = get_object_or_404(ColorVariant, pk=variant_id) if variant_id else None
    size_stock = get_object_or_404(SizeStock.objects.select_for_update(), pk=size_id) if size_id else None
    age_variant = get_object_or_404(AgeVariant.objects.select_for_update(), pk=age_variant_id) if age_variant_id else None
    length = get_object_or_404(Length, pk=length_id) if length_id else None
    weight = get_object_or_404(Weight, pk=weight_id) if weight_id else None
    shoe = get_object_or_404(Shoe, pk=shoe_id) if shoe_id else None

    # Server-side variation validation keeps the cart line tied to this item.
    if variant and variant.item_id != item.id:
        return Response({"success": False, "error": "Selected color is not available for this item."}, status=400)

    if size_stock:
        if size_stock.variant_id:
            if not variant or size_stock.variant_id != variant.id:
                return Response({"success": False, "error": "Selected size does not match the selected color."}, status=400)
        elif size_stock.item_id != item.id:
            return Response({"success": False, "error": "Selected size is not available for this item."}, status=400)

    if age_variant and age_variant.item_id != item.id:
        return Response({"success": False, "error": "Selected age group is not available for this item."}, status=400)

    if length and length.item_id != item.id:
        return Response({"success": False, "error": "Selected length is not available for this item."}, status=400)

    if weight and weight.item_id != item.id:
        return Response({"success": False, "error": "Selected weight is not available for this item."}, status=400)

    if shoe and shoe.item_id != item.id:
        return Response({"success": False, "error": "Selected shoe option is not available for this item."}, status=400)

    if shoe:
        allowed_shoe_sizes = [str(value) for value in (shoe.shoe_size or [])]
        if not selected_shoe_size or str(selected_shoe_size) not in allowed_shoe_sizes:
            return Response({"success": False, "error": "Select a valid shoe size."}, status=400)

    # --- Determine available stock based on variation ---
    if size_stock:
        available_stock = size_stock.quantity_in_stock
    elif age_variant:
        available_stock = age_variant.quantity_in_stock
    elif variant:
        available_stock = variant.sizes.aggregate(total=models.Sum('quantity_in_stock'))['total'] or 0
    elif shoe:
        available_stock = len(shoe.shoe_size)  # simple approximation, can adjust
    else:
        available_stock = SizeStock.objects.select_for_update().filter(item=item, variant__isnull=True).aggregate(
            total=models.Sum('quantity_in_stock')
        )['total'] or 0

    # fallback to item.in_stock if no variation stocks found
    if available_stock == 0 and item.in_stock:
        available_stock = item.in_stock

    # --- Fetch existing cart item ---
    # Get active pending order first
    order = Order.objects.filter(user=user, visitor_id=visitor_id, status="pending").first()

    cart_item_qs = OrderItem.objects.filter(
        item=item,
        user=user,
        visitor_id=visitor_id,
        status="pending",
        order=order,  # ✅ Only look in current pending order
        color_variant=variant if variant else None,
        size_stock=size_stock if size_stock else None,
        age_variant=age_variant if age_variant else None,
        selected_length=str(length.value) + " " + length.unit if length else None,
        selected_weight=str(weight.value) + " " + weight.unit if weight else None,
        shoe_size=str(selected_shoe_size) if selected_shoe_size is not None else None,
        custom_preferences=custom_preferences,
    )

    if cart_item_qs.exists():
        cart_item = cart_item_qs.first()
        new_quantity = cart_item.quantity + requested_qty
        created = False
    else:
        # Create new cart item instance
        cart_item = OrderItem(
            item=item,
            user=user,
            visitor_id=visitor_id,
            status="pending",
            quantity=requested_qty,
            price_at_purchase=item.get_current_price(),
            color_variant=variant if variant else None,
            size_stock=size_stock if size_stock else None,
            age_variant=age_variant if age_variant else None,
            selected_length=str(length.value) + " " + length.unit if length else None,
            selected_weight=str(weight.value) + " " + weight.unit if weight else None,
            shoe_size=str(selected_shoe_size) if selected_shoe_size is not None else None,
            custom_preferences=custom_preferences,
        )
        new_quantity = requested_qty
        created = True  


    # --- Validate stock availability ---
    current_qty = cart_item.quantity if not created else 0
    if new_quantity > available_stock:
        return Response({
            "success": False,
            "error": f"Cannot add {requested_qty} item(s). Only {available_stock - current_qty} left in stock."
        }, status=400)

    # --- Save cart item ---
    cart_item.quantity = new_quantity
    cart_item.save()

    # --- Create or get pending order ---
    order, order_created = Order.objects.select_for_update().get_or_create(
        user=user,
        visitor_id=visitor_id,
        status="pending",
        defaults={"ordered_date": timezone.now()},
    )

    # Link cart item to order
    if not cart_item.order:
        cart_item.order = order
        cart_item.save()

    # --- Activity logs ---
    ActivityLog.objects.create(
        user=user,
        visitor_id=visitor_id,
        actor_type=actor_type,
        action="item_added_to_cart",
        item=item,
        description=f"A customer added {item.name} to their cart.",
        related_url=f"/item/{item.id}/"
    )

    # --- Build response ---
    message = "Item added to cart" if created else "Item quantity updated in cart"
    response = Response({
        "success": True,
        "message": sanitize(message),
        "order_id": order.id,
        "cart_item_id": cart_item.id,
        "visitor_id": visitor_id
    })

    # Set visitorId cookie for guests
    if not request.COOKIES.get("visitorId") and not user:
        response.set_cookie(
            "visitorId",
            visitor_id,
            httponly=True,
            secure=not settings.DEBUG,
            samesite="Lax",
            max_age=30*24*3600,  # 30 days
        )

    return response



# -------------------------------
# Remove from cart
# -------------------------------
@api_view(["DELETE"])
@permission_classes([IsAuthenticatedOrVisitor])
@transaction.atomic
def remove_from_cart_api(request, pk):
    """
    Remove an item or a specific variation from the user's or visitor's cart.
    Supports size, color, age, length, weight, and shoe variations.
    """

    # -----------------------------
    # Sanitize incoming item ID
    # -----------------------------
    pk = sanitize(pk)
    item = get_object_or_404(Item.objects.select_for_update(), pk=pk)

    # -----------------------------
    # Determine if request is from logged-in user or visitor
    # -----------------------------
    if request.user and request.user.is_authenticated:
        user = request.user
        visitor_id = None
        actor_type = "user"
        actor_name = user.username
    else:
        visitor_id = request.COOKIES.get("visitorId")
        if not visitor_id:
            visitor_id = str(uuid.uuid4())
        user = None
        actor_type = "visitor"
        actor_name = f"Guest ({visitor_id[:8]})"

    # -----------------------------
    # Get variations from request
    # -----------------------------
    selected_color = request.data.get("selected_color")
    selected_size = request.data.get("selected_size")
    selected_age_group = request.data.get("selected_age_group")
    selected_length = request.data.get("selected_length")
    selected_weight = request.data.get("selected_weight")
    selected_shoe_size = request.data.get("selected_shoe_size")

    # -----------------------------
    # Find active order
    # -----------------------------
    order_qs = Order.objects.select_for_update().filter(
        user=user,
        visitor_id=visitor_id,
        status="pending"
    )
    if not order_qs.exists():
        return Response({"success": False, "message": sanitize("You do not have an active order")})
    order = order_qs.first()

    # -----------------------------
    # Find cart item with exact variation
    # -----------------------------
    cart_item_id = request.data.get("cart_item_id")
    if cart_item_id:
        cart_item_qs = OrderItem.objects.filter(
            id=cart_item_id,
            item=item,
            user=user,
            visitor_id=visitor_id,
            status="pending",
            order=order,
        )
    else:
        cart_item_qs = OrderItem.objects.filter(
            item=item,
            user=user,
            visitor_id=visitor_id,
            status="pending",
            order=order,
            color_variant_id=selected_color or None,
            size_stock_id=selected_size or None,
            age_variant_id=selected_age_group or None,
            selected_length=selected_length,
            selected_weight=selected_weight,
            shoe_size=selected_shoe_size,
        )


    if not cart_item_qs.exists():
        return Response({"success": False, "message": sanitize("This item or selected variation does not exist in the cart")})

    cart_item = cart_item_qs.first()

    # -----------------------------
    # Delete the cart item
    # -----------------------------
    cart_item.delete()

    # -----------------------------
    # Log one canonical customer event. The serializer renders it as
    # "You ..." for the customer and "A customer ..." for staff/vendor views.
    ActivityLog.objects.create(
        user=user,
        visitor_id=visitor_id,
        actor_type=actor_type,
        action="item_removed_from_cart",
        item=item,
        description=f"A customer removed {item.name} from their cart.",
        related_url=f"/item/{item.id}/"
    )

    # -----------------------------
    # Return response
    # -----------------------------
    response = Response({
        "success": True,
        "message": sanitize("Item removed from cart"),
        "order_id": order.id,
        "visitor_id": visitor_id
    })

    # Set visitorId cookie if not set
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
# Update cart quantity
# -------------------------------
@api_view(["PATCH"])
@permission_classes([IsAuthenticatedOrVisitor])
@transaction.atomic
def update_cart_quantity(request, pk):
    """
    Update the quantity of an item in the cart for either a logged-in user or a visitor.
    Handles item variations (color, size, age, weight, length, shoe size) and stock checks.
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
        visitor_id = request.COOKIES.get("visitorId")
        if not visitor_id:
            visitor_id = str(uuid.uuid4())
        user = None
        actor_type = "visitor"
        actor_name = f"Guest ({visitor_id[:8]})"

    # 🔹 Get item variations from request (can be None for base items)
    selected_color = request.data.get("selected_color")
    selected_size = request.data.get("selected_size")
    selected_age_group = request.data.get("selected_age_group")
    selected_length = request.data.get("selected_length")
    selected_weight = request.data.get("selected_weight")
    selected_shoe_size = request.data.get("selected_shoe_size")

    # 🔹 Find active pending order
    order, order_created = Order.objects.get_or_create(
        user=user,
        visitor_id=visitor_id,
        status="pending",
        defaults={"ordered_date": timezone.now()}
    )

    # 🔹 Find the correct cart item
    cart_item_id = request.data.get("cart_item_id")
    if cart_item_id:
        cart_item = OrderItem.objects.filter(
            id=cart_item_id,
            item=item,
            user=user,
            visitor_id=visitor_id,
            status="pending",
            order=order,
        ).first()
    else:
        cart_item = OrderItem.objects.filter(
            item=item,
            user=user,
            visitor_id=visitor_id,
            status="pending",
            order=order,
            color_variant_id=selected_color or None,
            size_stock_id=selected_size or None,
            age_variant_id=selected_age_group or None,
            selected_length=selected_length,
            selected_weight=selected_weight,
            shoe_size=selected_shoe_size,
        ).first()


    if not cart_item:
        return Response({"success": False, "message": sanitize("Item not found in cart")}, status=404)

    # 🔹 Sanitize action
    action = sanitize(request.data.get("action", ""))
    if action not in ["increase", "decrease"]:
        return Response({"success": False, "message": sanitize("Invalid action")}, status=400)

    # 🔹 Determine available stock
    available_stock = 0
    if selected_size:
        size_stock_obj = get_object_or_404(SizeStock.objects.select_for_update(), pk=selected_size)
        available_stock = size_stock_obj.quantity_in_stock
    elif selected_color:
        variant_obj = get_object_or_404(ColorVariant.objects.select_for_update(), pk=selected_color)
        available_stock = variant_obj.sizes.select_for_update().aggregate(total=models.Sum('quantity_in_stock'))['total'] or 0
    else:
        # Base item without variations
        available_stock = SizeStock.objects.filter(item=item, variant__isnull=True).aggregate(
            total=models.Sum('quantity_in_stock')
        )['total'] or item.in_stock or 0

    # 🔹 Perform quantity update
    if action == "increase":
        if cart_item.quantity + 1 > available_stock:
            return Response({
                "success": False,
                "message": f"Cannot add more. Only {available_stock} left in stock."
            }, status=400)
        cart_item.quantity += 1
        message = "Item quantity increased"

    elif action == "decrease":
        if cart_item.quantity > 1:
            cart_item.quantity -= 1
            message = "Item quantity decreased"
        else:
            # Remove cart item entirely if quantity drops below 1
            cart_item.delete()
            message = "Item removed from cart"
            return Response({
                "success": True,
                "message": sanitize(message),
                "item_id": item.id,
                "quantity": 0,
                "order_total": order.get_total()
            })

    # 🔹 Update price_at_purchase
    cart_item.price_at_purchase = item.discount_price or item.get_item_final_price()
    cart_item.save()

    # 🔹 Log activity
    ActivityLog.objects.create(
        user=user,
        visitor_id=visitor_id,
        actor_type=actor_type,
        action="item_updated_qty",
        item=item,
        description=f"You updated the quantity of {item.name} in your cart.",
        related_url=f"/item-client/{item.id}/"
    )

    ActivityLog.objects.create(
        user=user,
        visitor_id=visitor_id,
        actor_type='user',
        action="item_updated_qty",
        item=item,
        description=f"A customer updated the quantity of {item.name} in their cart.",
        related_url=f"/item/{item.id}/"
    )

    for admin in User.objects.filter(is_staff=True):
        ActivityLog.objects.create(
            user=admin,
            visitor_id=visitor_id,
            actor_type="admin",
            action="item_updated_qty",
            item=item,
            description=f"A customer updated the quantity of {item.name} in their cart.",
            related_url=f"/admin-item/vendorDashboard/items/{item.id}/"
        )

    return Response({
        "success": True,
        "message": sanitize(message),
        "item_id": item.id,
        "quantity": cart_item.quantity,
        "order_total": order.get_total()
    })




# Helper: vendor transactions

def get_vendor_transactions(vendor):
    return Transaction.objects.filter(
        order__order_items__item__vendor=vendor
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



@api_view(["POST"])
@permission_classes([IsAdminUser])
def create_admin_transaction(request):
    category = str(request.data.get("category", "")).strip().lower()
    payment_method = str(request.data.get("payment_method", "")).strip().lower()
    amount_raw = request.data.get("amount")

    allowed_categories = {choice[0] for choice in Transaction.CATEGORY_CHOICES}
    if category not in allowed_categories:
        return Response({"error": "Invalid payment category."}, status=400)

    if payment_method not in {"mpesa", "paypal"}:
        return Response({"error": "Invalid payment method."}, status=400)

    try:
        amount = Decimal(str(amount_raw))
    except (InvalidOperation, TypeError, ValueError):
        return Response({"error": "Amount must be a valid number."}, status=400)

    if amount <= 0:
        return Response({"error": "Amount must be greater than zero."}, status=400)

    # Manual admin entries are ledger expenses, regardless of payment provider.
    transaction_type = "B2C"

    ledger_entry = Transaction.objects.create(
        transaction_type=transaction_type,
        payment_method=payment_method,
        category=category,
        amount=amount,
        status="completed",
        raw_data={
            "source": "admin_accounts",
            "created_by": request.user.pk,
        },
    )

    channel_layer = get_channel_layer()
    if channel_layer is not None:
        try:
            async_to_sync(channel_layer.group_send)(
                "admin_accounts",
                {
                    "type": "account_changed",
                    "resource": "transaction",
                    "action": "created",
                    "object_id": ledger_entry.id,
                },
            )
        except Exception:
            logger.exception("Failed to broadcast Accounts transaction update.")

    return Response({
        "success": True,
        "message": "Payment added successfully.",
        "id": ledger_entry.pk,
    }, status=201)


# get sale method
@api_view(["GET"])
@permission_classes([IsAdminUser])
def admin_transaction_history(request):
    """
    Read-only Accounts history combining manual bookkeeping, customer/provider
    transactions, and confirmed vendor settlements.
    ?date=YYYY-MM-DD filters by the actual accounting event date.
    """
    selected_date = request.query_params.get("date")
    selected = None
    period_start = period_end = None

    if selected_date:
        try:
            selected = datetime.strptime(selected_date, "%Y-%m-%d").date()
        except ValueError:
            return Response({"error": "Invalid date. Use YYYY-MM-DD."}, status=400)

        period_start = timezone.make_aware(datetime.combine(selected, datetime.min.time()))
        period_end = timezone.make_aware(datetime.combine(selected, datetime.max.time()))

    transaction_qs = (
        Transaction.objects
        .select_related("vendor", "order", "payout")
        .filter(payout__isnull=True)
        .exclude(status="deleted")
        .order_by("-created_at")
    )
    payout_qs = (
        VendorPayout.objects
        .select_related("vendor")
        .filter(paid=True)
        .order_by("-paid_at", "-created_at")
    )
    refund_qs = (
        Refund.objects
        .select_related("payment", "return_request")
        .filter(status__iexact="completed")
        .order_by("-completed_at", "-created_at")
    )

    if period_start:
        transaction_qs = transaction_qs.filter(
            created_at__gte=period_start, created_at__lte=period_end
        )
        payout_qs = payout_qs.filter(
            paid_at__gte=period_start, paid_at__lte=period_end
        )
        refund_qs = refund_qs.filter(
            completed_at__gte=period_start, completed_at__lte=period_end
        )

    results = []

    for tx in transaction_qs[:50]:
        raw_data = tx.raw_data or {}
        is_manual = raw_data.get("source") == "admin_accounts"
        vendor_name = None
        if tx.vendor:
            vendor_name = getattr(tx.vendor, "company_name", None) or getattr(
                tx.vendor, "username", None
            )

        results.append({
            "id": f"transaction-{tx.id}",
            "record_id": tx.id,
            "txid": (
                tx.mpesa_receipt_number
                or tx.paypal_transaction_id
                or tx.account_reference
                or f"TX-{tx.id}"
            ),
            "category": tx.get_category_display() if tx.category else None,
            "category_key": tx.category,
            "payment_method": tx.payment_method,
            "transaction_type": tx.transaction_type,
            "amount": float(tx.amount or 0),
            "status": tx.status,
            "vendor_name": vendor_name,
            "created_at": tx.created_at,
            "source": "manual" if is_manual else "payment",
            "source_label": "Manual bookkeeping" if is_manual else "Customer payment",
            "editable": is_manual,
            "deletable": is_manual,
        })

    for refund in refund_qs[:50]:
        provider_reference = (
            refund.provider_reference
            or refund.payment.transaction_id
            or f"REFUND-{refund.id}"
        )
        results.append({
            "id": f"refund-{refund.id}",
            "record_id": refund.id,
            "txid": provider_reference,
            "category": "Refund",
            "category_key": "refund",
            "payment_method": refund.provider,
            "transaction_type": "B2C",
            "amount": float(refund.amount or 0),
            "status": refund.status,
            "vendor_name": None,
            "created_at": refund.completed_at or refund.updated_at,
            "source": "refund",
            "source_label": "Customer refund",
            "editable": False,
            "deletable": False,
            "refund_reference": refund.provider_reference,
            "refund_provider": refund.provider,
        })

    for payout in payout_qs[:50]:
        vendor_name = (
            getattr(payout.vendor, "company_name", None)
            or getattr(payout.vendor, "username", None)
            or str(payout.vendor)
        )
        method = getattr(payout.vendor, "payment_method", None) or "unknown"
        provider_reference = (
            payout.mpesa_transaction_id
            or payout.kcb_provider_reference
            or payout.kcb_transaction_reference
            or payout.paypal_transaction_id
            or payout.paypal_payout_item_id
            or payout.reference
        )

        results.append({
            "id": f"payout-{payout.id}",
            "record_id": payout.id,
            "txid": provider_reference,
            "category": "Vendor Settlement",
            "category_key": "vendor_settlement",
            "payment_method": method,
            "transaction_type": "B2C",
            "amount": float(payout.amount or 0),
            "status": "completed",
            "vendor_name": vendor_name,
            "created_at": payout.paid_at or payout.created_at,
            "source": "vendor_settlement",
            "source_label": "Vendor settlement",
            "editable": False,
            "deletable": False,
            "payout_reference": payout.reference,
            "payout_period_start": payout.payout_period_start,
            "payout_period_end": payout.payout_period_end,
        })

    results.sort(
        key=lambda item: item.get("created_at") or timezone.make_aware(datetime.min),
        reverse=True,
    )
    results = results[:100]

    return Response({
        "date": selected_date,
        "count": len(results),
        "results": results,
    })

@api_view(["PATCH", "PUT"])
@permission_classes([IsAdminUser])
def update_admin_transaction(request, transaction_id):
    """
    Edit a manually recorded Accounts bookkeeping entry.
    Provider-generated transactions are never editable from Accounts.
    """
    ledger_entry = get_object_or_404(Transaction, pk=transaction_id)

    if (ledger_entry.raw_data or {}).get("source") != "admin_accounts":
        return Response(
            {"error": "Only manually recorded Accounts entries can be edited."},
            status=403,
        )

    category = str(request.data.get("category", ledger_entry.category or "")).strip().lower()
    payment_method = str(
        request.data.get("payment_method", ledger_entry.payment_method or "")
    ).strip().lower()
    amount_raw = request.data.get("amount", ledger_entry.amount)

    allowed_categories = {choice[0] for choice in Transaction.CATEGORY_CHOICES}
    if category not in allowed_categories:
        return Response({"error": "Invalid payment category."}, status=400)

    if payment_method not in {"mpesa", "paypal"}:
        return Response({"error": "Invalid payment method."}, status=400)

    try:
        amount = Decimal(str(amount_raw))
    except (InvalidOperation, TypeError, ValueError):
        return Response({"error": "Amount must be a valid number."}, status=400)

    if amount <= 0:
        return Response({"error": "Amount must be greater than zero."}, status=400)

    raw_data = dict(ledger_entry.raw_data or {})
    edit_history = list(raw_data.get("edit_history") or [])
    edit_history.append({
        "edited_at": timezone.now().isoformat(),
        "edited_by": request.user.pk,
        "previous_category": ledger_entry.category,
        "previous_amount": str(ledger_entry.amount),
        "previous_payment_method": ledger_entry.payment_method,
    })
    raw_data["edit_history"] = edit_history[-20:]

    ledger_entry.category = category
    ledger_entry.payment_method = payment_method
    ledger_entry.amount = amount
    ledger_entry.raw_data = raw_data
    ledger_entry.save(update_fields=["category", "payment_method", "amount", "raw_data", "updated_at"])

    channel_layer = get_channel_layer()
    if channel_layer is not None:
        try:
            async_to_sync(channel_layer.group_send)(
                "admin_accounts",
                {
                    "type": "account_changed",
                    "resource": "transaction",
                    "action": "updated",
                    "object_id": ledger_entry.id,
                },
            )
        except Exception:
            logger.exception("Failed to broadcast Accounts transaction update.")

    return Response({
        "success": True,
        "message": "Bookkeeping entry updated successfully.",
        "id": ledger_entry.pk,
    })


@api_view(["DELETE"])
@permission_classes([IsAdminUser])
def delete_admin_transaction(request, transaction_id):
    """
    Soft-delete a manually recorded Accounts bookkeeping entry.
    The database record is retained for auditability, but it no longer
    contributes to Accounts totals or normal history.
    """
    ledger_entry = get_object_or_404(Transaction, pk=transaction_id)

    if (ledger_entry.raw_data or {}).get("source") != "admin_accounts":
        return Response(
            {"error": "Only manually recorded Accounts entries can be deleted."},
            status=403,
        )

    if ledger_entry.status == "deleted":
        return Response({
            "success": True,
            "message": "Bookkeeping entry is already deleted.",
            "id": ledger_entry.pk,
        })

    raw_data = dict(ledger_entry.raw_data or {})
    raw_data["deleted_at"] = timezone.now().isoformat()
    raw_data["deleted_by"] = request.user.pk
    raw_data["deleted_from_accounts"] = True

    ledger_entry.status = "deleted"
    ledger_entry.raw_data = raw_data
    ledger_entry.save(update_fields=["status", "raw_data", "updated_at"])

    channel_layer = get_channel_layer()
    if channel_layer is not None:
        try:
            async_to_sync(channel_layer.group_send)(
                "admin_accounts",
                {
                    "type": "account_changed",
                    "resource": "transaction",
                    "action": "deleted",
                    "object_id": ledger_entry.id,
                },
            )
        except Exception:
            logger.exception("Failed to broadcast Accounts transaction deletion.")

    return Response({
        "success": True,
        "message": "Bookkeeping entry deleted successfully.",
        "id": ledger_entry.pk,
    })


@api_view(["GET"])
@permission_classes([IsAdminUser])
def transaction_totals(request):
    data = {
        "paypal_total": Transaction.get_paypal_total(),
        "mpesa_total": Transaction.get_mpesa_total(),
    }
    return Response(data)






# admin user transaction
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_transactions(request):

    transactions_qs = (
        Transaction.objects
        .select_related("vendor", "order")
        .prefetch_related(
            Prefetch(
                "order__order_items",
                queryset=OrderItem.objects.select_related("item")
            )
        )
        .order_by("-created_at")[:50]
    )

    serializer = TransactionSerializer(transactions_qs, many=True)

    summary = Transaction.objects.aggregate(
        total_transactions=Count("id"),
        total_revenue=Sum("amount")
    )

    return Response({
        "summary": {
            "total_transactions": summary["total_transactions"] or 0,
            "total_revenue": float(summary["total_revenue"] or 0),
        },
        "results": serializer.data
    })
# admin dashboard transaction track

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def revenue_growth(request):

    vendor = getattr(request.user, "vendor", None)

    if not vendor:
        return Response({"error": "No vendor"}, status=403)

    now = timezone.now()

    # 📅 TIME PERIODS
    this_week_start = now - timedelta(days=7)
    prev_week_start = now - timedelta(days=14)

    this_month_start = now.replace(day=1)
    last_month_start = (this_month_start - timedelta(days=1)).replace(day=1)

    # 💰 WEEKLY REVENUE
    this_week = Transaction.objects.filter(
        vendor=vendor,
        created_at__gte=this_week_start
    ).aggregate(total=Sum("amount"))["total"] or 0

    prev_week = Transaction.objects.filter(
        vendor=vendor,
        created_at__gte=prev_week_start,
        created_at__lt=this_week_start
    ).aggregate(total=Sum("amount"))["total"] or 0

    # 💰 MONTHLY REVENUE (for dashboard cards)
    this_month = Transaction.objects.filter(
        vendor=vendor,
        created_at__gte=this_month_start
    ).aggregate(total=Sum("amount"))["total"] or 0

    last_month = Transaction.objects.filter(
        vendor=vendor,
        created_at__gte=last_month_start,
        created_at__lt=this_month_start
    ).aggregate(total=Sum("amount"))["total"] or 0

    # 📊 GROWTH CALCULATION (safe)
    def calc_growth(current, previous):
        if previous == 0:
            return 100 if current > 0 else 0
        return ((current - previous) / previous) * 100

    weekly_growth = calc_growth(this_week, prev_week)
    monthly_growth = calc_growth(this_month, last_month)

    return Response({
        "weekly": {
            "this_week": float(this_week),
            "previous_week": float(prev_week),
            "growth": round(weekly_growth, 2),
            "trend": "up" if weekly_growth >= 0 else "down"
        },
        "monthly": {
            "this_month": float(this_month),
            "last_month": float(last_month),
            "growth": round(monthly_growth, 2),
            "trend": "up" if monthly_growth >= 0 else "down"
        }
    })

# get total dashboard stats
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def dashboard_stats(request):
    completed_orders = Order.objects.filter(status='completed')

    total_sales = sum(order.get_total() for order in completed_orders)

    total_orders = completed_orders.count()

    return Response({
        "total_sales": total_sales,
        "total_orders": total_orders,
    })


# vendors sales
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminUser])
def vendor_sales(request):
    items = OrderItem.objects.select_related("item", "item__vendor")

    vendors = {}

    for i in items:
        vendor = i.item.vendor.company_name if i.item.vendor else "Unknown"
        item_name = i.item.name

        if vendor not in vendors:
            vendors[vendor] = {
                "vendor_name": vendor,
                "items": {}
            }

        if item_name not in vendors[vendor]["items"]:
            vendors[vendor]["items"][item_name] = {
                "item_name": item_name,
                "qty_sold": 0,
                "total_qty": getattr(i.item, "stock_qty", 0),
            }

        vendors[vendor]["items"][item_name]["qty_sold"] += i.quantity

    # convert dict → list
    result = []
    for vendor in vendors.values():
        vendor["items"] = list(vendor["items"].values())
        result.append(vendor)

    return Response(result)


# Admin Dashbord monthly sales

@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminUser])
def revenue_area_chart(request):
    """
    Monthly revenue + orders analytics for dashboard charts
    """

    # Optional: support vendor filtering later
    queryset = Order.objects.all()

    # 🔥 FIX 1: safe status matching
    queryset = queryset.filter(status__iexact="completed")

    # 🔥 FIX 2: remove bad data
    queryset = queryset.exclude(
        ordered_date__isnull=True
    )

    data = (
        queryset
        .annotate(month=TruncMonth("ordered_date"))
        .values("month")
        .annotate(
            revenue=Sum("updated_total_price"),
            orders=Count("id")
        )
        .order_by("month")
    )

    formatted = [
        {
            # frontend-friendly
            "month": item["month"].strftime("%b") if item["month"] else "Unknown",
            "revenue": float(item["revenue"] or 0),
            "orders": int(item["orders"] or 0),
        }
        for item in data
    ]

    return Response(formatted)