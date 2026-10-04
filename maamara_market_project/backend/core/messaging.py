from django.contrib.auth import get_user_model
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.core.exceptions import ValidationError
from PIL import Image, UnidentifiedImageError

from order.views import IsAuthenticatedOrVisitor
from .models import Conversation, DirectMessage

User = get_user_model()
MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_MESSAGE_LENGTH = 5000
ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP"}


def _validate_message_image(image):
    if not image:
        return
    if image.size > MAX_IMAGE_BYTES:
        raise ValidationError("Image must be 5 MB or smaller.")
    try:
        image.seek(0)
        with Image.open(image) as opened:
            opened.verify()
            image.seek(0)
            with Image.open(image) as verified:
                if verified.format not in ALLOWED_IMAGE_FORMATS:
                    raise ValidationError("Only JPEG, PNG, or WebP images are allowed.")
    except (UnidentifiedImageError, OSError, ValueError):
        raise ValidationError("The uploaded file is not a valid image.")
    finally:
        try:
            image.seek(0)
        except Exception:
            pass


def _visitor_id(request):
    if request.user and request.user.is_authenticated:
        return None
    visitor_id = request.COOKIES.get("visitorId")
    return str(visitor_id) if visitor_id else None


def _display_user(user):
    if not user:
        return None
    vendor = getattr(user, "vendor", None)
    profile = getattr(user, "profile", None)
    is_vendor = vendor is not None
    name = " ".join(part for part in [user.first_name, user.last_name] if part).strip()
    return {
        "id": user.id,
        "username": user.username,
        "name": name or (vendor.company_name if is_vendor else user.username),
        "email": user.email,
        "is_vendor": is_vendor,
        "vendor_id": vendor.id if is_vendor else None,
        "company_name": vendor.company_name if is_vendor else None,
        "profile_picture": (
            vendor.profile_picture.url if is_vendor and vendor.profile_picture
            else profile.profile_picture.url if profile and profile.profile_picture
            else None
        ),
    }


def _display_visitor(visitor_id):
    if not visitor_id:
        return None
    return {
        "id": None,
        "username": None,
        "name": f"Visitor {str(visitor_id)[:8]}",
        "email": None,
        "is_vendor": False,
        "vendor_id": None,
        "company_name": None,
        "profile_picture": None,
        "visitor_id": str(visitor_id),
    }


def _conversation_allowed(request, conversation):
    if request.user and request.user.is_authenticated:
        return (
            conversation.participant_id == request.user.id
            or (request.user.is_staff and conversation.admin_id == request.user.id)
        )
    visitor_id = _visitor_id(request)
    return bool(visitor_id and conversation.visitor_id == visitor_id)


def _message_payload(message, request):
    sender = _display_user(message.sender) if message.sender_id else _display_visitor(message.sender_visitor_id)
    return {
        "id": message.id,
        "conversation_id": message.conversation_id,
        "sender_id": message.sender_id,
        "sender_visitor_id": message.sender_visitor_id,
        "sender": sender,
        "body": message.body,
        "image": request.build_absolute_uri(message.image.url) if message.image else None,
        "created_at": message.created_at.isoformat(),
        "read_at": message.read_at.isoformat() if message.read_at else None,
    }


def _conversation_payload(conversation, request):
    last_message = conversation.messages.select_related("sender").order_by("-created_at").first()
    other = (
        conversation.participant
        if conversation.participant_id
        else _display_visitor(conversation.visitor_id)
    )
    if conversation.participant_id:
        other = _display_user(conversation.participant)
    elif conversation.visitor_id:
        other = _display_visitor(conversation.visitor_id)

    if request.user and request.user.is_authenticated:
        unread_query = conversation.messages.filter(read_at__isnull=True).exclude(sender=request.user)
    else:
        unread_query = conversation.messages.filter(
            read_at__isnull=True,
            sender__isnull=False,
        )
    if not (request.user and request.user.is_authenticated):
        unread_query = conversation.messages.filter(
            read_at__isnull=True,
        ).exclude(sender_visitor_id=_visitor_id(request))

    return {
        "id": conversation.id,
        "admin": _display_user(conversation.admin),
        "participant": other,
        "visitor_id": conversation.visitor_id,
        "updated_at": conversation.updated_at.isoformat(),
        "last_message": _message_payload(last_message, request) if last_message else None,
        "unread_count": unread_query.count(),
    }


@api_view(["GET"])
@permission_classes([IsAuthenticatedOrVisitor])
def messaging_contacts(request):
    if not request.user.is_authenticated:
        return Response({
            "admins": [
                _display_user(admin)
                for admin in User.objects.filter(
                    is_staff=True,
                    is_active=True,
                ).order_by("first_name", "username")
            ],
        })

    if not request.user.is_staff:
        return Response({
            "admins": [
                _display_user(admin)
                for admin in User.objects.filter(
                    is_staff=True,
                    is_active=True,
                ).order_by("first_name", "username")
            ],
        })

    vendor_users = User.objects.filter(
        vendor__isnull=False,
        is_active=True,
    ).select_related("vendor", "profile")
    vendor_ids = set(vendor_users.values_list("id", flat=True))
    users = User.objects.filter(
        is_active=True,
        is_staff=False,
    ).exclude(id__in=vendor_ids).select_related("profile")

    return Response({
        "admins": [
            _display_user(admin)
            for admin in User.objects.filter(
                is_staff=True,
                is_active=True,
            ).order_by("first_name", "username")
        ],
        "users": [_display_user(user) for user in users.order_by("first_name", "username")],
        "vendors": [
            _display_user(user)
            for user in vendor_users.order_by("vendor__company_name", "first_name", "username")
        ],
    })


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticatedOrVisitor])
def messaging_conversations(request):
    visitor_id = _visitor_id(request)

    if request.method == "GET":
        if request.user.is_authenticated:
            if request.user.is_staff:
                conversations = Conversation.objects.filter(
                    admin=request.user
                ).select_related("admin", "participant")
            else:
                conversations = Conversation.objects.filter(
                    participant=request.user
                ).select_related("admin", "participant")
        else:
            conversations = Conversation.objects.filter(
                visitor_id=visitor_id
            ).select_related("admin", "participant")

        return Response({
            "results": [_conversation_payload(c, request) for c in conversations]
        })

    if not request.user.is_authenticated:
        if not visitor_id:
            return Response({"error": "Visitor session not found."}, status=401)

        admin = User.objects.filter(
            is_staff=True,
            is_active=True,
        ).order_by("id").first()
        if not admin:
            return Response(
                {"error": "No support administrator is available."},
                status=503,
            )

        conversation, created = Conversation.objects.get_or_create(
            admin=admin,
            visitor_id=visitor_id,
            defaults={"participant": None},
        )
        return Response(
            _conversation_payload(conversation, request),
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    if request.user.is_staff:
        participant_id = request.data.get("participant_id")
        if not participant_id:
            return Response({"error": "participant_id is required."}, status=400)
        participant = get_object_or_404(
            User,
            id=participant_id,
            is_active=True,
            is_staff=False,
        )
        if participant.id == request.user.id:
            return Response(
                {"error": "You cannot start a conversation with yourself."},
                status=400,
            )
    else:
        admin = User.objects.filter(
            is_staff=True,
            is_active=True,
        ).order_by("id").first()
        if not admin:
            return Response(
                {"error": "No support administrator is available."},
                status=503,
            )
        participant = request.user
        conversation, _ = Conversation.objects.get_or_create(
            admin=admin,
            participant=participant,
        )
        return Response(_conversation_payload(conversation, request), status=status.HTTP_200_OK)

    conversation, created = Conversation.objects.get_or_create(
        admin=request.user,
        participant=participant,
    )
    return Response(
        _conversation_payload(conversation, request),
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
    )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticatedOrVisitor])
def messaging_messages(request, conversation_id):
    conversation = get_object_or_404(Conversation, pk=conversation_id)
    if not _conversation_allowed(request, conversation):
        return Response(
            {"error": "You do not have access to this conversation."},
            status=403,
        )

    visitor_id = _visitor_id(request)

    if request.method == "GET":
        messages = conversation.messages.select_related("sender").order_by("created_at")
        if request.user.is_authenticated:
            messages.filter(read_at__isnull=True).exclude(sender=request.user).update(
                read_at=timezone.now()
            )
        else:
            messages.filter(read_at__isnull=True).exclude(
                sender_visitor_id=visitor_id
            ).update(read_at=timezone.now())
        return Response({"results": [_message_payload(m, request) for m in messages]})

    body = str(request.data.get("body", "")).strip()
    image = request.FILES.get("image")

    if not body and not image:
        return Response({"error": "A message or image is required."}, status=400)
    if len(body) > MAX_MESSAGE_LENGTH:
        return Response(
            {"error": "Message is too long. Maximum length is 5000 characters."},
            status=400,
        )
    if image:
        try:
            _validate_message_image(image)
        except ValidationError as exc:
            return Response({"error": str(exc)}, status=400)

    message = DirectMessage.objects.create(
        conversation=conversation,
        sender=request.user if request.user.is_authenticated else None,
        sender_visitor_id=visitor_id,
        body=body,
        image=image,
    )
    conversation.save(update_fields=["updated_at"])
    return Response(
        _message_payload(message, request),
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticatedOrVisitor])
def messaging_mark_read(request, conversation_id):
    conversation = get_object_or_404(Conversation, pk=conversation_id)
    if not _conversation_allowed(request, conversation):
        return Response(
            {"error": "You do not have access to this conversation."},
            status=403,
        )

    if request.user.is_authenticated:
        updated = conversation.messages.filter(
            read_at__isnull=True
        ).exclude(sender=request.user).update(read_at=timezone.now())
    else:
        updated = conversation.messages.filter(
            read_at__isnull=True
        ).exclude(sender_visitor_id=_visitor_id(request)).update(read_at=timezone.now())

    return Response({"success": True, "updated": updated})
