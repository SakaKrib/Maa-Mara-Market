"""Content moderation helpers: reports, blocks, hiding and suspension.

Targets that can be reported are registered in ``TARGETS``. Each entry knows how
to load the object, find its owner, snapshot it as evidence, and hide or restore
it. Moderators act on reports through ``resolve_report``.
"""
import logging
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from .models import ContentReport, Notification, UserBlock

logger = logging.getLogger(__name__)
User = get_user_model()

SLA_HOURS = 24


# ---------------------------------------------------------------- blocks
def blocked_user_ids(request):
    """IDs of users the requester has blocked (empty for visitors)."""
    user = getattr(request, "user", None)
    if not user or not user.is_authenticated:
        return set()
    return set(UserBlock.objects.filter(blocker=user).values_list("blocked_id", flat=True))


def visible_reviews(queryset, request):
    """Hide moderator-removed reviews and reviews written by blocked users."""
    blocked = blocked_user_ids(request)
    queryset = queryset.filter(moderation_hidden=False)
    if blocked:
        queryset = queryset.exclude(user_id__in=blocked)
    return queryset


def visible_comments(queryset, request):
    blocked = blocked_user_ids(request)
    queryset = queryset.filter(moderation_hidden=False)
    if blocked:
        queryset = queryset.exclude(user_id__in=blocked)
    return queryset


# --------------------------------------------------------------- targets
def _excerpt(*parts, limit=800):
    return " | ".join(str(p) for p in parts if p)[:limit]


def _load_review(pk):
    from shop.models import Review
    return Review.objects.select_related("user").filter(pk=pk).first()


def _load_comment(pk):
    from shop.models import CommentBlog
    return CommentBlog.objects.select_related("user").filter(pk=pk).first()


def _load_post(pk):
    from shop.models import BlogPost
    return BlogPost.objects.select_related("user").filter(pk=pk).first()


def _load_message(pk):
    from .models import DirectMessage
    return DirectMessage.objects.select_related("sender", "conversation").filter(pk=pk).first()


def _load_item(pk):
    from ReactSerializers.models import Item
    return Item.objects.select_related("vendor__user").filter(pk=pk).first()


def _load_banner(pk):
    from shop.models import Banner
    return Banner.objects.select_related("vendor__user").filter(pk=pk).first()


def _load_user(pk):
    return User.objects.filter(pk=pk).first()


def _set(obj, **fields):
    for key, value in fields.items():
        setattr(obj, key, value)
    obj.save(update_fields=list(fields))


TARGETS = {
    "review": {
        "load": _load_review,
        "owner": lambda o: o.user,
        "snapshot": lambda o: _excerpt(f"rating {o.rating}", o.review_text),
        "hide": lambda o: _set(o, moderation_hidden=True),
        "restore": lambda o: _set(o, moderation_hidden=False),
    },
    "blog_comment": {
        "load": _load_comment,
        "owner": lambda o: o.user,
        "snapshot": lambda o: _excerpt(o.text),
        "hide": lambda o: _set(o, moderation_hidden=True),
        "restore": lambda o: _set(o, moderation_hidden=False),
    },
    "blog_post": {
        "load": _load_post,
        "owner": lambda o: o.user,
        "snapshot": lambda o: _excerpt(o.title, o.content),
        "hide": lambda o: _set(o, approved=False),
        "restore": lambda o: _set(o, approved=True),
    },
    "message": {
        "load": _load_message,
        "owner": lambda o: o.sender,
        "snapshot": lambda o: _excerpt(o.body, "[image attached]" if o.image else ""),
        "hide": lambda o: _set(o, moderation_hidden=True),
        "restore": lambda o: _set(o, moderation_hidden=False),
    },
    "item": {
        "load": _load_item,
        "owner": lambda o: getattr(getattr(o, "vendor", None), "user", None),
        "snapshot": lambda o: _excerpt(o.name, getattr(o, "description", "")),
        "hide": lambda o: _set(o, available=False),
        "restore": lambda o: _set(o, available=True),
    },
    "banner": {
        "load": _load_banner,
        "owner": lambda o: getattr(getattr(o, "vendor", None), "user", None),
        "snapshot": lambda o: _excerpt(o.title, o.subtitle),
        "hide": lambda o: _set(o, is_approved=False),
        "restore": lambda o: _set(o, is_approved=True),
    },
    "user": {
        "load": _load_user,
        "owner": lambda o: o,
        "snapshot": lambda o: _excerpt(o.username),
        "hide": None,
        "restore": None,
    },
}


class ReportError(Exception):
    pass


def _notify(user, title, message, url=""):
    if not user:
        return
    try:
        Notification.objects.create(user=user, title=title, message=message, url=url)
    except Exception:  # notifications are best effort
        logger.exception("Moderation notification failed")


def create_report(*, reporter, visitor_id, target_type, target_id, reason, details=""):
    spec = TARGETS.get(target_type)
    if not spec:
        raise ReportError("Unknown content type.")
    if reason not in dict(ContentReport.REASON_CHOICES):
        raise ReportError("Choose a valid reason.")
    obj = spec["load"](target_id)
    if obj is None:
        raise ReportError("That content no longer exists.")
    owner = spec["owner"](obj)
    if reporter and owner and owner.pk == reporter.pk:
        raise ReportError("You cannot report your own content.")

    existing = ContentReport.objects.filter(
        target_type=target_type, target_id=target_id, status=ContentReport.STATUS_OPEN,
    )
    existing = existing.filter(reporter=reporter) if reporter else existing.filter(
        reporter__isnull=True, reporter_visitor_id=visitor_id or "-",
    )
    report = existing.first()
    if report:
        return report, False

    report = ContentReport.objects.create(
        reporter=reporter,
        reporter_visitor_id="" if reporter else (visitor_id or ""),
        target_type=target_type,
        target_id=target_id,
        target_owner=owner,
        reason=reason,
        details=(details or "")[:1000],
        snapshot=spec["snapshot"](obj),
    )
    for admin in User.objects.filter(is_superuser=True, is_active=True):
        _notify(
            admin, "New content report",
            f"A {report.get_target_type_display().lower()} was reported ({report.get_reason_display()}). "
            f"Review within {SLA_HOURS} hours.",
            "/admin-dashboard/moderation",
        )
    return report, True


@transaction.atomic
def resolve_report(report, moderator, *, action, note=""):
    """action: dismiss | remove | suspend | remove_suspend | restore."""
    if report.status != ContentReport.STATUS_OPEN and action != "restore":
        raise ReportError("This report is already resolved.")
    spec = TARGETS[report.target_type]
    obj = spec["load"](report.target_id)
    owner = spec["owner"](obj) if obj is not None else report.target_owner

    remove = action in ("remove", "remove_suspend")
    suspend = action in ("suspend", "remove_suspend")
    if action not in ("dismiss", "remove", "suspend", "remove_suspend", "restore"):
        raise ReportError("Unknown action.")

    if remove:
        if spec["hide"] is None:
            raise ReportError("This item cannot be removed; suspend the user instead.")
        if obj is not None:
            spec["hide"](obj)
    if suspend:
        if not owner:
            raise ReportError("There is no user to suspend.")
        if owner.is_staff or owner.is_superuser:
            raise ReportError("Staff accounts cannot be suspended from here.")
        if owner.is_active:
            owner.is_active = False
            owner.save(update_fields=["is_active"])
    if action == "restore":
        if spec["restore"] and obj is not None:
            spec["restore"](obj)
        if owner and not owner.is_active and not (owner.is_staff or owner.is_superuser):
            owner.is_active = True
            owner.save(update_fields=["is_active"])
        report.status = ContentReport.STATUS_DISMISSED
        report.action = "none"
    elif action == "dismiss":
        report.status = ContentReport.STATUS_DISMISSED
        report.action = "none"
    else:
        report.status = ContentReport.STATUS_ACTIONED
        report.action = {"remove": "removed", "suspend": "suspended", "remove_suspend": "removed_suspended"}[action]
    report.moderator_note = (note or "")[:1000]
    report.resolved_by = moderator
    report.resolved_at = timezone.now()
    report.save()

    outcome = "We reviewed your report and took action. Thank you for helping keep Maa Mara Market safe." \
        if report.status == ContentReport.STATUS_ACTIONED else \
        "We reviewed your report and found no violation of our rules. Thank you for letting us know."
    _notify(report.reporter, "Your report was reviewed", outcome)
    if report.status == ContentReport.STATUS_ACTIONED and owner and not suspend:
        _notify(owner, "Content removed", "Something you posted broke our community rules and was removed.")
    return report


def overdue_count():
    cutoff = timezone.now() - timedelta(hours=SLA_HOURS)
    return ContentReport.objects.filter(status=ContentReport.STATUS_OPEN, created_at__lt=cutoff).count()
