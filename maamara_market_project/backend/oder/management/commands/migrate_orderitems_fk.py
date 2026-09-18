from django.core.management.base import BaseCommand
from oder.models import Order, OderItem

class Command(BaseCommand):
    help = 'Migrate OderItem M2M order to ForeignKey'

    def handle(self, *args, **kwargs):
        orders = Order.objects.all()
        updated_count = 0
        for order in orders:
            # For each OderItem previously linked via M2M
            for item in order.items.all():
                # Set ForeignKey to this order
                item.order = order
                item.save()
                updated_count += 1
        self.stdout.write(self.style.SUCCESS(f'Successfully updated {updated_count} OderItems with order FK.'))
