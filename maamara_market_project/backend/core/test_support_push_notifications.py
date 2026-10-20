from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from core.models import Notification, SupportMessage
from core.views import support_messages, support_reply


class SupportPushNotificationTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.admin = User.objects.create_superuser(
            username="support_push_admin",
            email="support-admin@example.com",
            password="test-password",
        )
        self.customer = User.objects.create_user(
            username="support_push_customer",
            password="test-password",
        )

    def test_visitor_support_request_notifies_staff(self):
        request = self.factory.post(
            "/api/support/",
            {
                "name": "Visitor",
                "email": "visitor@example.com",
                "subject": "Delivery question",
                "category": "shipping",
                "message": "Where is my order?",
            },
            format="json",
        )
        request.COOKIES["visitorId"] = "support-visitor-123"

        response = support_messages(request)

        self.assertEqual(response.status_code, 201)
        notification = Notification.objects.get(
            user=self.admin,
            title="New Support Request",
        )
        self.assertIn("Delivery question", notification.message)
        self.assertIn(f"ticket={response.data['ticket']['id']}", notification.url)

    def test_support_reply_notifies_authenticated_customer(self):
        ticket = SupportMessage.objects.create(
            user=self.customer,
            name="Customer",
            email="customer@example.com",
            subject="Payment question",
            message="Can you check my payment?",
        )
        request = self.factory.post(
            f"/api/support/{ticket.pk}/reply/",
            {"support_reply": "Your payment was received."},
            format="json",
        )
        force_authenticate(request, user=self.admin)

        response = support_reply(request, pk=ticket.pk)

        self.assertEqual(response.status_code, 200)
        notification = Notification.objects.get(
            user=self.customer,
            title="Support replied",
        )
        self.assertIn("Payment question", notification.message)

    def test_support_reply_notifies_visitor(self):
        ticket = SupportMessage.objects.create(
            visitor_id="support-visitor-reply",
            name="Visitor",
            email="visitor-reply@example.com",
            subject="Account question",
            message="I need help.",
        )
        request = self.factory.post(
            f"/api/support/{ticket.pk}/reply/",
            {"support_reply": "Here is the answer."},
            format="json",
        )
        force_authenticate(request, user=self.admin)

        response = support_reply(request, pk=ticket.pk)

        self.assertEqual(response.status_code, 200)
        notification = Notification.objects.get(
            visitor_id="support-visitor-reply",
            title="Support replied",
        )
        self.assertIn("Account question", notification.message)
