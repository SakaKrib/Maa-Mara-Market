from django.core.management.base import BaseCommand
from .models import Order, OderItem

class Command(BaseCommand):
    help = 'Migrate OderItem M2M order to ForeignKey'

    def handle(self, *args, **kwargs):
        orders = Order.objects.all()
        for order in orders:
            for item in order.items.all():  # existing M2M
                item.order = order
                item.save()
        self.stdout.write(self.style.SUCCESS('OderItem order field populated successfully.'))
