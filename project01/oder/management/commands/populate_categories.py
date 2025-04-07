from django.core.management.base import BaseCommand
from shop.models import Category, CATEGORY_CHOICES

class Command(BaseCommand):
    help = 'Populate the Category model with default choices'

    def handle(self, *args, **kwargs):
        for choice in CATEGORY_CHOICES:
            Category.objects.get_or_create(name=choice[1])
        self.stdout.write(self.style.SUCCESS('Categories populated successfully!'))
