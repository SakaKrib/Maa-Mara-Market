from datetime import date, timedelta
from decimal import Decimal
import uuid
import json
import os

from dateutil.relativedelta import relativedelta
from django.db import transaction
from django.utils import timezone
from django.db.models import Count, ExpressionWrapper, F, FloatField, Sum
from django.db.models.functions import TruncMonth, TruncYear
from django.utils.timezone import now
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.views import APIView
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from PIL import Image

from ReactSerializers.Serializers import VendorPayoutSerializer
from ReactSerializers.models import Item
from order.models import OrderItem, Order
from .models import Vendor, SoldItem, VendorAdjustment, VendorPayout, VendorDraft, VendorDraftImage, VendorRequest, VendorItemRequest, ItemDraft, ItemDraftMedia


def dashboard(request):
    return HttpResponse("Welcome to the Vendor Dashboard!")


# mangin refund when the customer returns the ordered item
#payment logic to handle refunds payout culculation logic


# ==============================================================
# 💰 FUNCTION: get_month_range
# --------------------------------------------------------------


def get_month_range(months_back=6, include_current=False):
    today = date.today().replace(day=1)  # ✅ start of current month as date
    month_ranges = []

    # Add current month first if requested
    if include_current:
        start = today
        end = (today + relativedelta(months=1)) - relativedelta(days=1)  # last day of current month
        month_ranges.append((start, end))

    # Add previous months
    for i in range(1, months_back + 1):
        start = (today - relativedelta(months=i)).replace(day=1)
        end = (today - relativedelta(months=i - 1)) - relativedelta(days=1)
        month_ranges.append((start, end))

    return list(reversed(month_ranges))



# ==============================================================
# 💰 FUNCTION: get_vendor_earnings @@Adm
# --------------------------------------------------------------


def get_vendor_earnings(vendor, start_date, end_date):
    """
    🧾 Calculate a vendor's payout for a given date range,
    including difference from previous month payout.

    - Includes all completed, valid (non-refunded, non-returned, non-exchanged) orders.
    - Uses the vendor's actual price (excluding markup).
    - Applies any pending vendor adjustments for returns/exchanges.
    - Updates or creates a VendorPayout record for the period.
    """

    user = vendor.user
    vendor_items = Item.objects.filter(created_by=user)

    # Get all completed orders within date range
    completed_orders = Order.objects.filter(
        status="completed",
        ordered_date__gte=start_date,
        ordered_date__lt=end_date + timedelta(days=1)
    )
    completed_order_ids = completed_orders.values_list('id', flat=True)

    # Get all valid order items linked to those orders for this vendor
    order_items = OrderItem.objects.filter(
        order_id__in=completed_order_ids,
        item__in=vendor_items,
        refunded=False,
        is_returned=False,
        is_exchanged=False,
    ).distinct()

    # Calculate gross sales using vendor-side pricing (excludes markup)
    gross_sales = Decimal("0.00")
    for oi in order_items:
        try:
            gross_sales += Decimal(str(oi.get_final_price_for_vendor()))
        except AttributeError:
            base_vendor_price = getattr(oi.item, "vendor_price", None) or getattr(oi.item, "price", 0)
            gross_sales += Decimal(str(base_vendor_price)) * oi.quantity

    # Fetch unapplied vendor adjustments in this period
    adjustments = VendorAdjustment.objects.filter(
        vendor=vendor,
        created_at__gte=start_date,
        created_at__lt=end_date + timedelta(days=1),
        applied=False
    )

    adjustment_total = Decimal("0.00")
    applied_adjustments = []

    # Process applicable adjustments (returns / exchanges)
    for adj in adjustments:
        if adj.order_item and (adj.order_item.is_returned or adj.order_item.is_exchanged):
            adjustment_total += adj.amount or Decimal("0.00")
            adj.applied = True
            adj.save()
            applied_adjustments.append(adj)

    # Compute vendor's final net payout for the month (without markup)
    net_total = gross_sales + adjustment_total

    # Customer-side income must be limited to this vendor's order items.
    customer_order_items = OrderItem.objects.filter(
        order_id__in=completed_order_ids,
        item__in=vendor_items,
        refunded=False,
        is_returned=False,
        is_exchanged=False,
    )
    total_income = sum(
        (oi.get_final_price() for oi in customer_order_items),
        Decimal("0.00"),
    )

    # Calculate profit from this vendor's own sales only.
    profit = total_income - net_total

    # Create or update the VendorPayout record
    payout, created = VendorPayout.objects.get_or_create(
        vendor=vendor,
        payout_period_start=start_date,
        payout_period_end=end_date,
        defaults={
            "amount": net_total,
            "gross_sales": gross_sales,
            "adjustment_amount": adjustment_total,
            "income": total_income,
            "profit": profit,
            "reference": str(uuid.uuid4())[:8],  # Generate a short unique reference
        },
    )

    # Update payout fields to latest calculated values
    payout.gross_sales = gross_sales
    payout.adjustment_amount = adjustment_total
    payout.amount = net_total
    payout.income = total_income
    payout.profit = profit

    # Ensure payout has a reference (in case it was created before reference was added)
    if not payout.reference:
        payout.reference = str(uuid.uuid4())[:8]

    payout.save()

    # Attach any newly applied adjustments
    if applied_adjustments:
        payout.adjustments.set(applied_adjustments)

    # Calculate previous month range for difference calculation
    prev_start_date = (start_date - relativedelta(months=1)).replace(day=1)
    prev_end_date = (start_date - relativedelta(days=1)).replace(day=(start_date - relativedelta(days=1)).day)

    # Try to get previous payout
    previous_payout = VendorPayout.objects.filter(
        vendor=vendor,
        payout_period_start=prev_start_date,
        payout_period_end=prev_end_date,
    ).first()

    difference = None
    if previous_payout:
        difference = {
            "amount_diff": payout.amount - previous_payout.amount,
            "gross_sales_diff": payout.gross_sales - previous_payout.gross_sales,
            "adjustment_amount_diff": payout.adjustment_amount - previous_payout.adjustment_amount,
            "income_diff": payout.income - previous_payout.income,
            "profit_diff": payout.profit - previous_payout.profit,
            'reference' : payout.reference
        }

    return {
        "payout": payout,
        "difference": difference,
    }






# ==============================================================
# 💰 FUNCTION: get_monthly_vendor_report
# --------------------------------------------------------------

def get_monthly_vendor_report(vendor, months_back=6):
    reports = []

    # Generate month ranges
    for start, end in get_month_range(months_back):
        result = get_vendor_earnings(vendor, start, end)
        payout = result["payout"]

        reports.append({
            "month": start.strftime("%B %Y"),
            "gross_sales": payout.gross_sales or 0,
            "adjustments": payout.adjustment_amount or 0,
            "net_payout": payout.amount or 0,
            "paid": payout.paid,
        })

    return reports





# fetch for admin payouts
class AdminPayoutAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def get(self, request, format=None):
        payouts = VendorPayout.objects.all().order_by('-created_at')
        serializer = VendorPayoutSerializer(payouts, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class VendorPayoutAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, format=None):
        vendor = Vendor.objects.filter(user=request.user).first()
        if not vendor:
            return Response(
                {"detail": "Vendor profile not found."},
                status=status.HTTP_403_FORBIDDEN,
            )

        payouts = (
            VendorPayout.objects
            .filter(vendor=vendor)
            .select_related("vendor")
            .prefetch_related("adjustments")
            .order_by("-created_at")
        )
        serializer = VendorPayoutSerializer(payouts, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)



# ==============================================================
# 💰 FUNCTION: get_monthly sale report
# --------------------------------------------------------------
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def monthly_sales_report(request):
    year = int(request.query_params.get('year', now().year))
    month = int(request.query_params.get('month', now().month))

    # Calculate total price per item as an expression
    total_price_expr = ExpressionWrapper(
        F('sale_price') * F('quantity'),
        output_field=FloatField()
    )

    # Query sales with annotation for calculated total price (rename to avoid conflict)
    sales_qs = SoldItem.objects.filter(
        date_sold__year=year,
        date_sold__month=month
    ).annotate(
        item_name=F('item__name'),
        vendor_price=F('sale_price'),
        qty_remaining=F('item__in_stock'),
        calculated_total_price=total_price_expr  # renamed annotation here
    ).values(
        'id', 'item_name', 'vendor_price', 'quantity', 'qty_remaining', 'date_sold', 'calculated_total_price'
    ).order_by('-date_sold')

    sales = list(sales_qs)

    # Aggregate total amount using the same expression
    total_amount = SoldItem.objects.filter(
        date_sold__year=year,
        date_sold__month=month
    ).aggregate(
        total=Sum(total_price_expr)
    )['total'] or 0

    # Get available months with sales (distinct year+month)
    months_qs = (
        SoldItem.objects
        .annotate(year=TruncYear('date_sold'), month=TruncMonth('date_sold'))
        .values('year', 'month')
        .annotate(count=Count('id'))
        .order_by('-year', '-month')
    )

    available_months = []
    for entry in months_qs:
        y = entry['year'].year
        m = entry['month'].month
        label = entry['month'].strftime('%b %Y')
        available_months.append({'year': y, 'month': m, 'label': label})

    return Response({
        'sales': sales,
        'total_amount': total_amount,
        'month': month,
        'year': year,
        'available_months': available_months,
    })


class ItemDraftView(APIView):
    permission_classes = [IsAuthenticated]

    MAX_IMAGES = 10
    MAX_IMAGE_BYTES = 10 * 1024 * 1024
    MAX_VIDEO_BYTES = 100 * 1024 * 1024
    ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".webm"}
    ALLOWED_VIDEO_TYPES = {"video/mp4", "video/quicktime", "video/webm"}

    def _owner(self, request):
        if request.user.is_staff:
            vendor_id = request.data.get("vendor_id")
            vendor = Vendor.objects.filter(pk=vendor_id).first() if vendor_id else None
            return request.user, vendor
        vendor = getattr(request.user, "vendor", None)
        if vendor is None:
            raise PermissionError("Vendor account not found.")
        return request.user, vendor

    def _draft_queryset(self, request):
        return ItemDraft.objects.filter(
            owner=request.user,
            status="DRAFT",
        ).prefetch_related("media")

    def _validate_upload(self, uploaded, kind):
        if kind in {"main", "gallery", "variant"}:
            if uploaded.size > self.MAX_IMAGE_BYTES:
                raise ValueError("Each image must be 10 MB or smaller.")
            try:
                uploaded.seek(0)
                with Image.open(uploaded) as image:
                    image.verify()
                uploaded.seek(0)
                with Image.open(uploaded) as image:
                    if image.width * image.height > 25_000_000:
                        raise ValueError("Images must not exceed 25 megapixels.")
            except ValueError:
                uploaded.seek(0)
                raise
            except Exception:
                uploaded.seek(0)
                raise ValueError("The uploaded file is not a valid image.")
            uploaded.seek(0)
            return

        if kind == "video":
            if uploaded.size > self.MAX_VIDEO_BYTES:
                raise ValueError("The product video must be 100 MB or smaller.")
            extension = os.path.splitext(uploaded.name or "")[1].lower()
            if extension not in self.ALLOWED_VIDEO_EXTENSIONS:
                raise ValueError("Video must be MP4, MOV, or WEBM.")
            if uploaded.content_type and uploaded.content_type not in self.ALLOWED_VIDEO_TYPES:
                raise ValueError("The uploaded video type is not supported.")
            return

        raise ValueError("Unsupported draft media type.")

    def _serialize_draft(self, request, draft):
        data = dict(draft.data or {})
        media = []
        for asset in draft.media.all().order_by("sort_order", "id"):
            media.append({
                "id": asset.id,
                "kind": asset.kind,
                "media_type": asset.media_type,
                "slot_key": asset.slot_key,
                "variant_key": asset.variant_key,
                "sort_order": asset.sort_order,
                "url": request.build_absolute_uri(asset.file.url),
                "name": os.path.basename(asset.file.name),
            })
        data["draft_id"] = str(draft.id)
        return {
            "exists": True,
            "draft_id": str(draft.id),
            "status": draft.status,
            "updated_at": draft.updated_at,
            "data": data,
            "media": media,
        }

    def get(self, request):
        draft = self._draft_queryset(request).order_by("-updated_at").first()
        if not draft:
            return Response({"exists": False, "draft": None})
        return Response({"draft": self._serialize_draft(request, draft)})

    @transaction.atomic
    def post(self, request):
        try:
            owner, vendor = self._owner(request)
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        draft_id = request.data.get("draft_id")
        if draft_id:
            draft = get_object_or_404(self._draft_queryset(request), id=draft_id)
        else:
            draft = ItemDraft.objects.filter(
                owner=owner,
                status="DRAFT",
            ).order_by("-updated_at").first()

        if draft is None:
            draft = ItemDraft.objects.create(
                owner=owner,
                vendor=vendor,
                data={},
                expires_at=timezone.now() + timezone.timedelta(days=30),
            )
        elif vendor and draft.vendor_id != vendor.id:
            draft.vendor = vendor

        try:
            data = json.loads(request.data.get("data", "{}"))
            manifest = json.loads(request.data.get("media_manifest", "[]"))
            removed_slots = json.loads(request.data.get("removed_media_slots", "[]"))
        except (TypeError, ValueError, json.JSONDecodeError):
            return Response({"detail": "Invalid draft data or media metadata."}, status=status.HTTP_400_BAD_REQUEST)

        if not isinstance(data, dict) or not isinstance(manifest, list) or not isinstance(removed_slots, list):
            return Response({"detail": "Invalid draft payload."}, status=status.HTTP_400_BAD_REQUEST)

        existing = {asset.slot_key: asset for asset in draft.media.all()}
        for slot in removed_slots:
            asset = existing.get(str(slot))
            if asset:
                asset.file.delete(save=False)
                asset.delete()
                existing.pop(str(slot), None)

        image_slots = {slot for slot, asset in existing.items() if asset.media_type == "image"}

        for entry in manifest:
            if not isinstance(entry, dict):
                continue
            slot_key = str(entry.get("slot_key") or "").strip()
            kind = str(entry.get("kind") or "").strip()
            upload_key = str(entry.get("upload_key") or "").strip()
            if not slot_key or kind not in {"main", "gallery", "variant", "video"}:
                continue

            uploaded = request.FILES.get(upload_key) if upload_key else None
            if not uploaded:
                continue

            try:
                self._validate_upload(uploaded, kind)
            except ValueError as exc:
                return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

            media_type = "video" if kind == "video" else "image"
            if media_type == "image":
                image_slots.add(slot_key)

            old = existing.get(slot_key)
            if old:
                old.file.delete(save=False)
                old.delete()

            asset = ItemDraftMedia(
                draft=draft,
                media_type=media_type,
                kind=kind,
                slot_key=slot_key,
                variant_key=str(entry.get("variant_key") or ""),
                sort_order=int(entry.get("sort_order") or 0),
            )
            asset.file.save(os.path.basename(uploaded.name), uploaded, save=False)
            asset.save()
            existing[slot_key] = asset

        if len(image_slots) > self.MAX_IMAGES:
            return Response(
                {"detail": f"An item can contain at most {self.MAX_IMAGES} images, including the main and variant images."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if sum(1 for asset in existing.values() if asset.kind == "video") > 1:
            return Response({"detail": "An item can contain only one product video."}, status=status.HTTP_400_BAD_REQUEST)

        data["draft_id"] = str(draft.id)
        data.pop("image_file", None)
        data.pop("video_file", None)
        draft.data = data
        draft.expires_at = timezone.now() + timezone.timedelta(days=30)
        draft.save(update_fields=["vendor", "data", "expires_at", "updated_at"])

        return Response(self._serialize_draft(request, draft), status=status.HTTP_200_OK)

    @transaction.atomic
    def delete(self, request):
        draft = self._draft_queryset(request).first()
        if not draft:
            return Response(status=status.HTTP_204_NO_CONTENT)

        draft.status = "ABANDONED"
        draft.save(update_fields=["status", "updated_at"])
        for asset in draft.media.all():
            asset.file.delete(save=False)
        draft.media.all().delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class VendorDraftView(APIView):
    """Persist an in-progress vendor registration for the authenticated user."""

    permission_classes = [IsAuthenticated]

    def _get_owner(self, request):
        return {"user": request.user}

    def get(self, request):
        draft = (
            VendorDraft.objects
            .filter(**self._get_owner(request), status="DRAFT", expires_at__gt=timezone.now())
            .prefetch_related("images")
            .order_by("-updated_at")
            .first()
        )
        if not draft:
            return Response({"exists": False, "draft": None})

        # Older drafts may predate the submitted-vendor-draft lifecycle fix.
        # If a vendor request was already submitted after this draft was last
        # updated, hide the draft from the customer resume card while retaining
        # it for the admin approval workflow.
        submitted_request = (
            VendorRequest.objects
            .filter(
                user=request.user,
                status__in=["pending", "verified", "approved"],
                date_submitted__gte=draft.updated_at,
            )
            .order_by("-date_submitted")
            .first()
        )
        if submitted_request:
            draft.status = "SUBMITTED"
            draft.save(update_fields=["status", "updated_at"])
            return Response({"exists": False, "draft": None})

        data = dict(draft.data or {})
        items = list(data.get("item_list") or [])
        images_by_index = {image.item_index: image for image in draft.images.all()}

        for index, item in enumerate(items):
            image = images_by_index.get(index)
            if image:
                item["image"] = request.build_absolute_uri(image.image.url)
                item["image_asset_id"] = image.id
            elif item.get("image"):
                item["image_asset_id"] = item.get("image_asset_id")

        data["item_list"] = items
        data["draft_id"] = str(draft.id)

        return Response({
            "exists": True,
            "draft": data,
            "draft_id": str(draft.id),
            "updated_at": draft.updated_at,
        })

    @transaction.atomic
    def post(self, request):
        owner = self._get_owner(request)
        try:
            data = json.loads(request.data.get("data", "{}"))
        except (TypeError, ValueError):
            return Response({"detail": "Invalid draft data."}, status=status.HTTP_400_BAD_REQUEST)

        draft = (
            VendorDraft.objects
            .filter(**owner, status="DRAFT")
            .order_by("-updated_at")
            .first()
        )
        created = False

        if draft is None:
            draft = VendorDraft.objects.create(
                **owner,
                data={},
                expires_at=timezone.now() + timezone.timedelta(days=30),
            )
            created = True

        items = list(data.get("item_list") or [])

        # Remove draft images for items that no longer exist.
        valid_indexes = set(range(len(items)))
        for old_image in list(draft.images.all()):
            if old_image.item_index not in valid_indexes:
                old_image.image.delete(save=False)
                old_image.delete()

        # Replace only the images whose item was actually changed.
        for key, file in request.FILES.items():
            if not key.startswith("item_image_"):
                continue
            try:
                index = int(key.replace("item_image_", ""))
            except ValueError:
                continue
            if index < 0 or index >= len(items):
                continue

            old_image = draft.images.filter(item_index=index).first()
            if old_image:
                old_image.image.delete(save=False)
                old_image.delete()

            VendorDraftImage.objects.create(
                draft=draft,
                image=file,
                item_index=index,
            )

        # Resolve each item to the authoritative stored draft asset.
        for index, item in enumerate(items):
            image = draft.images.filter(item_index=index).first()
            if image:
                item["image"] = image.image.url
                item["image_asset_id"] = image.id
            else:
                item.pop("image_asset_id", None)

        data["item_list"] = items
        data["draft_id"] = str(draft.id)
        draft.data = data
        draft.expires_at = timezone.now() + timezone.timedelta(days=30)
        draft.save(update_fields=["data", "expires_at", "updated_at"])

        return Response({
            "message": "Draft saved successfully.",
            "created": created,
            "images_saved": draft.images.count(),
        })

    @transaction.atomic
    def delete(self, request):
        draft = VendorDraft.objects.filter(**self._get_owner(request)).first()
        if draft:
            for image in draft.images.all():
                image.image.delete(save=False)
            draft.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
