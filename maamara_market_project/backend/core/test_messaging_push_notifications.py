from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from core.messaging import messaging_messages
from core.models import Conversation, Notification


class DirectMessagePushNotificationTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.admin = User.objects.create_user(
            username="support_admin",
            password="test-password",
            is_staff=True,
        )
        self.customer = User.objects.create_user(
            username="message_customer",
            password="test-password",
        )
        self.conversation = Conversation.objects.create(
            admin=self.admin,
            participant=self.customer,
        )

    def send_message(self, sender, body):
        request = self.factory.post(
            f"/api/messaging/conversations/{self.conversation.pk}/messages/",
            {"body": body},
            format="multipart",
        )
        force_authenticate(request, user=sender)
        return messaging_messages(request, self.conversation.pk)

    def test_customer_message_creates_admin_notification_with_message_target(self):
        response = self.send_message(self.customer, "Can you help with my order?")

        self.assertEqual(response.status_code, 201)
        notification = Notification.objects.get(user=self.admin, title="New message")
        self.assertIn("Can you help with my order?", notification.message)
        self.assertEqual(
            notification.url,
            f"/messages?conversation={self.conversation.pk}&message={response.data['id']}",
        )

    def test_admin_message_creates_customer_notification_with_message_target(self):
        response = self.send_message(self.admin, "We have received your request.")

        self.assertEqual(response.status_code, 201)
        notification = Notification.objects.get(user=self.customer, title="New message")
        self.assertIn("We have received your request.", notification.message)
        self.assertEqual(
            notification.url,
            f"/messages?conversation={self.conversation.pk}&message={response.data['id']}",
        )
