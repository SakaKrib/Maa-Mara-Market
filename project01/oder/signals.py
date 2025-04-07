from django.db.models.signals import post_migrate
from django.dispatch import receiver
from shop.models import Category, CATEGORY_CHOICES

@receiver(post_migrate)
def populate_categories(sender, **kwargs):
    for choice in CATEGORY_CHOICES:
        Category.objects.get_or_create(name=choice[1])

        
