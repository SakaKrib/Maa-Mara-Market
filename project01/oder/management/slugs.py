from django.core.management.base import BaseCommand
from oder.models import OrderItem
import uuid
from django.utils.text import slugify

class Command(BaseCommand):
    help = 'Update slugs for OrderItem to ensure they are unique'

    def handle(self, *args, **kwargs):
        items = OrderItem.objects.all()
        for item in items:
            if not item.slug or OrderItem.objects.filter(slug=item.slug).count() > 1:
                unique_slug = f"{slugify(item.item.name)}-{uuid.uuid4()}"
                item.slug = unique_slug
                item.save()
        self.stdout.write(self.style.SUCCESS('Successfully updated slugs for OrderItem'))
