from django.core.management.base import BaseCommand

from ReactSerializers.models import TrafficEvent
from ReactSerializers.traffic_geo import country_from_ip


class Command(BaseCommand):
    help = "Fill in the country of past traffic rows that were saved without one (public IP addresses only)."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=500, help="Most distinct IP addresses to look up (default 500).")

    def handle(self, *args, **options):
        ips = list(
            TrafficEvent.objects.filter(country_code="")
            .exclude(ip_address__isnull=True)
            .values_list("ip_address", flat=True)
            .distinct()[: options["limit"]]
        )
        updated = looked_up = 0
        for ip in ips:
            code, name = country_from_ip(ip)
            if not code:
                continue
            looked_up += 1
            updated += TrafficEvent.objects.filter(ip_address=ip, country_code="").update(country_code=code, country_name=name)
        self.stdout.write(self.style.SUCCESS(f"{looked_up} addresses located, {updated} traffic rows updated."))
