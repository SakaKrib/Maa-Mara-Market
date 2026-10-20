from django.contrib.auth.models import AnonymousUser, User
from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from core.models import Notification
from shop.models import BlogPost
from shop.views import BlogPostViewSet
from vendorDashboard.models import Vendor


class BlogPushNotificationTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.admin = User.objects.create_superuser(
            username="blog_push_admin",
            email="blog-admin@example.com",
            password="test-password",
        )
        self.customer = User.objects.create_user(
            username="blog_push_customer",
            password="test-password",
        )
        self.vendor_user = User.objects.create_user(
            username="blog_push_vendor",
            password="test-password",
        )
        self.vendor = Vendor.objects.create(
            user=self.vendor_user,
            surname_name="Vendor",
            first_name="Blog",
            phone_number="0712345678",
            username="blogvendor",
            email="blog-vendor@example.com",
            id_number="12345678",
            vendor_code="BLOG-PUSH-1",
            product_type="Handmade goods",
            is_food="no",
            product_description="Handmade goods for testing",
            company_name="Blog Push Test",
            workshop_location="Nairobi",
        )
        self.post = BlogPost.objects.create(
            user=self.vendor_user,
            vendor=self.vendor,
            title="Push test blog",
            content="Testing blog push notifications",
            approved=True,
        )

    def call_action(self, action, method, payload=None, user=None, visitor_id=None):
        view = BlogPostViewSet.as_view({method: action})
        request = getattr(self.factory, method)(
            f"/api/blogs/{self.post.pk}/{action}/",
            payload or {},
            format="json",
        )
        if user:
            force_authenticate(request, user=user)
        elif visitor_id:
            request.COOKIES["visitorId"] = visitor_id
        return view(request, pk=self.post.pk)

    def test_authenticated_comment_notifies_vendor_and_admin(self):
        response = self.call_action(
            "comment", "post", {"text": "Helpful post"}, user=self.customer
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(
            Notification.objects.filter(
                user=self.vendor_user, title="New Comment on Your Blog"
            ).exists()
        )
        self.assertTrue(
            Notification.objects.filter(
                user=self.admin, title="New Comment on Blog"
            ).exists()
        )

    def test_visitor_comment_notifies_vendor_and_admin(self):
        response = self.call_action(
            "comment", "post", {"text": "Visitor comment"}, visitor_id="visitor-blog-1"
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(
            Notification.objects.filter(
                user=self.vendor_user,
                title="New Comment on Your Blog",
                message__icontains="visitor",
            ).exists()
        )
        self.assertTrue(
            Notification.objects.filter(
                user=self.admin,
                title="New Comment on Blog",
                message__icontains="visitor",
            ).exists()
        )

    def test_reaction_create_and_remove_notify_admin(self):
        create_response = self.call_action(
            "react", "post", {"type": "like"}, user=self.customer
        )
        self.assertEqual(create_response.status_code, 201)
        self.assertTrue(
            Notification.objects.filter(
                user=self.admin, title="New Reaction on Blog"
            ).exists()
        )

        remove_response = self.call_action(
            "remove_reaction", "delete", user=self.customer
        )
        self.assertEqual(remove_response.status_code, 204)
        self.assertTrue(
            Notification.objects.filter(
                user=self.admin, title="Reaction Removed from Blog"
            ).exists()
        )
