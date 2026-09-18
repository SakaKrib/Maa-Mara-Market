from django.db import models
from django.contrib.auth.models import User
from django.utils.text import slugify
from django.shortcuts import reverse
from django.core.exceptions import ValidationError
from vendorDashboard.models import Vendor
from ReactSerializers.models import Item
from django.utils import timezone

from django.db import models
from django.utils import timezone
from datetime import timedelta
import hashlib

class Banner(models.Model):
    vendor = models.ForeignKey(
        Vendor,  # replace with your actual Vendor model path
        on_delete=models.CASCADE,
        related_name="banners"
    )

    item = models.ForeignKey(
        Item,
        on_delete=models.CASCADE,
        related_name="banners",
        null=True,
        blank=True
    )

    title = models.CharField(max_length=255, help_text="Banner headline")
    subtitle = models.CharField(max_length=500, blank=True, null=True, help_text="Optional tagline")
    image = models.ImageField(upload_to="banners/", help_text="Upload a banner image (recommended 16:9 ratio)", null=True, blank=True)
    cta_type = models.CharField(choices=[
        ("item", "Item"),
        ("external", "External URL"),
    ], default="item")

    cta_item = models.ForeignKey(Item, null=True, blank=True, on_delete=models.SET_NULL)
    cta_url = models.URLField(null=True, blank=True)
    background_color = models.CharField(max_length=20, blank=True, null=True, help_text="Hex or Tailwind color")
    image_hash = models.CharField(max_length=64, editable=False, unique=True, default='', null=True, blank=True) 

    # admin field approve
    is_approved = models.BooleanField(default=False)
    approved_at = models.DateTimeField(null=True, blank=True)

    # Visibility settings
    is_active = models.BooleanField(default=True)
    start_date = models.DateTimeField(default=timezone.now)
    end_date = models.DateTimeField(null=True, blank=True)

    display_order = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "-created_at"]

    def __str__(self):
        return f"Banner: {self.title} ({self.vendor})"

    def save(self, *args, **kwargs):
        if not self.end_date:
            self.end_date = self.start_date + timedelta(days=30)

        # only activate if approved
        self.is_active = self.is_approved

        new_hash = self._calculate_image_hash()
        if new_hash:
            if Banner.objects.filter(image_hash=new_hash).exclude(pk=self.pk).exists():
                raise ValueError("🚫 This image is already used in another banner.")
            self.image_hash = new_hash

        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        """Returns True if banner end_date is passed."""
        if self.end_date:
            return timezone.now() > self.end_date
        return False

    def delete_if_expired(self):
        """Delete the banner if it is expired."""
        if self.is_expired:
            self.delete()

    def _calculate_image_hash(self):
        """Return SHA256 hash of the image file contents."""
        if not self.image:
            return None
        hasher = hashlib.sha256()
        for chunk in self.image.chunks():
            hasher.update(chunk)
        return hasher.hexdigest()        




#review model
from django.contrib.auth.models import User  # Ensure User is imported
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator

class Review(models.Model):
    item = models.ForeignKey(
        'ReactSerializers.Item',
        related_name='reviews',
        on_delete=models.CASCADE
    )
    user = models.ForeignKey(
        User,
        null=True,
        blank=True,
        related_name='reviews',
        on_delete=models.CASCADE
    )
    visitor_id = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    rating = models.IntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    review_text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        username = self.user.username if self.user else "Visitor"
        return f'Review by {username} for {self.item.name}'

    class Meta:
        verbose_name = 'Review'
        verbose_name_plural = 'Reviews'



class Reaction(models.Model):
    review = models.ForeignKey(
        'Review',
        related_name='reactions',
        on_delete=models.CASCADE
    )
    user = models.ForeignKey(
        User,
        null=True,
        blank=True,
        related_name='reactions',
        on_delete=models.CASCADE
    )
    visitor_id = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    reaction_type = models.CharField(
        max_length=10,
        choices=[('like', 'Like'), ('dislike', 'Dislike'), ('laugh', 'Laugh'), ('angry', 'Angry')]
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Reaction'
        verbose_name_plural = 'Reactions'

    def __str__(self):
        username = self.user.username if self.user else "Visitor"
        return f'{self.reaction_type} reaction by {username} for review {self.review.id}'



from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class VendorRating(models.Model):
    vendor = models.ForeignKey(
        'vendorDashboard.Vendor',
        on_delete=models.CASCADE,
        related_name='ratings'
    )

    # Authenticated user rating
    user = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='vendor_ratings'
    )

    # Visitor rating (for anonymous users)
    visitor_id = models.CharField(
        max_length=255,
        null=True,
        blank=True
    )

    # Rating fields (1–5 scale)
    quality = models.PositiveSmallIntegerField(
        default=0,
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )

    communication = models.PositiveSmallIntegerField(
        default=0,
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )

    shipping = models.PositiveSmallIntegerField(
        default=0,
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )

    comment = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            # One rating per logged-in user per vendor
            models.UniqueConstraint(
                fields=['vendor', 'user'],
                name='unique_vendor_user_rating'
            ),
            # One rating per visitor per vendor
            models.UniqueConstraint(
                fields=['vendor', 'visitor_id'],
                name='unique_vendor_visitor_rating'
            ),
        ]

    def average_rating(self):
        values = [self.quality, self.communication, self.shipping]
        valid = [v for v in values if v > 0]
        return round(sum(valid) / len(valid), 1) if valid else 0

    def __str__(self):
        return f"{self.vendor} rating by {self.user or self.visitor_id or 'Unknown'}"



# chat mode
# app/models.py
from django.db import models

class ChatFile(models.Model):
    file = models.FileField(upload_to='chat_uploads/')
    uploaded_at = models.DateTimeField(auto_now_add=True)



class BlogPost(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='vendor_posts'  # user who created the post
    )
    vendor = models.ForeignKey(
        Vendor,  # 👈 replace with your actual Vendor model path
        on_delete=models.CASCADE,
        related_name='vendor_blog_posts'
    )
    approved = models.BooleanField(default=False)
    title = models.CharField(max_length=255, blank=True)
    content = models.TextField(blank=True)
    image = models.ImageField(upload_to='blog_images/', null=True, blank=True)
    video = models.FileField(upload_to='blog_videos/', null=True, blank=True)
    item = models.ForeignKey(
        Item,  # ✅ must match your product model name
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']  # 🧭 newest first

    def __str__(self):
        return self.title or f"Post by {self.vendor}"


class CommentBlog(models.Model):
    post = models.ForeignKey(
        BlogPost,
        on_delete=models.CASCADE,
        related_name='comments_blog',
        null=True, blank=True,
        default=''
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='blog_comments',  # 👍 for reverse lookups
        null=True, blank=True
    )
    visitor_id = models.CharField(max_length=100, null=True, blank=True)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.user} on {self.post}"


class ReactionBlog(models.Model):
    REACTION_CHOICES = [
        ('like', '👍 Like'),
        ('love', '❤️ Love'),
        ('fire', '🔥 Fire'),
    ]
    post = models.ForeignKey(
        BlogPost,
        on_delete=models.CASCADE,
        related_name='reactions_blog',
        null=True,        # 👈 allow null temporarily
        blank=True,
        default=''
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='blog_reactions',
        null=True, blank=True
    )
    visitor_id = models.CharField(max_length=100, null=True, blank=True)
    type = models.CharField(
        max_length=20,
        choices=REACTION_CHOICES,
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('post', 'user')  # ✅ prevents duplicate reactions

    def __str__(self):
        return f"{self.user} reacted {self.type} on {self.post}"
    

# wishlist


class Wishlist(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="wishlists",
        null=True, blank=True
    )
    item = models.ForeignKey(
        Item,
        on_delete=models.CASCADE,
        related_name="wishlisted_by"
    )
    visitor_id = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = (('user', 'item'), ('visitor_id', 'item'))  # Prevent duplicates for both users & visitors
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username if self.user else self.visitor_id} - {self.item.name}"

