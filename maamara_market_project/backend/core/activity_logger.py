# utils/activity_logger.py
from .models import ActivityLog

def log_activity(
    user=None,
    actor_type="user",
    action="user_registered",
    description="",
    related_url=None,
    item=None,
):
    """
    Logs an activity to the ActivityLog table.

    Supports:
      - User, vendor, or admin actions
      - Item-related activities (e.g., viewed, added to cart)
    """

    ActivityLog.objects.create(
        user=user,
        actor_type=actor_type,
        action=action,
        description=description,
        related_url=related_url,
        item=item,  # ✅ link the activity to the specific item (if any)
    )

