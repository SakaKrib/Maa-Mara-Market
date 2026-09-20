from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db.models import Q
from django.utils import timezone

from core.models import PendingRegistration


class Command(BaseCommand):
    help = "Delete registration records whose OTP has expired."

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(minutes=3)

        deleted, _ = PendingRegistration.objects.filter(
            Q(otp_sent_at__lt=cutoff)
            | Q(otp_sent_at__isnull=True, created_at__lt=cutoff)
        ).delete()

        self.stdout.write(
            self.style.SUCCESS(
                f"Removed {deleted} expired pending registration record(s)."
            )
        )
