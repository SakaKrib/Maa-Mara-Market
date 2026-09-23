from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response

class RequestPasswordReset(APIView):
    def post(self, request):
        email = request.data.get("email")

        user = User.objects.filter(email=email).first()

        if not user:
            return Response({"success": True})

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        reset_link = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password/{uid}/{token}/"

        # 🔥 Render HTML template
        html_content = render_to_string("emails/reset_password.html", {
            "user": user,
            "reset_link": reset_link,
            "frontend_url": settings.FRONTEND_URL.rstrip("/"),
        })

        text_content = strip_tags(html_content)

        email_message = EmailMultiAlternatives(
            subject="Reset your password",
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[email],
        )

        email_message.attach_alternative(html_content, "text/html")
        email_message.send()

        return Response({"success": True}) 


#Confirm Pasword renewal
from django.utils.http import urlsafe_base64_decode
from django.contrib.auth.tokens import default_token_generator

class ResetPasswordConfirm(APIView):
    def post(self, request, uidb64, token):
        try:
            uid = urlsafe_base64_decode(uidb64).decode()
            user = User.objects.get(pk=uid)
        except:
            return Response({"error": "Invalid link"}, status=400)

        if not default_token_generator.check_token(user, token):
            return Response({"error": "Invalid or expired token"}, status=400)

        password = request.data.get("password")
        user.set_password(password)
        user.save()

        return Response({"success": True}) 