# signals.py
from allauth.socialaccount.signals import social_account_added, social_account_updated
from django.dispatch import receiver
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User

@receiver(social_account_added)
@receiver(social_account_updated)
def create_jwt_for_google_user(request, sociallogin, **kwargs):
    user = sociallogin.user

    # Ensure user is saved
    user.save()

    refresh = RefreshToken.for_user(user)
    access = str(refresh.access_token)

    # Store tokens in session temporarily
    request.session['google_access'] = access
    request.session['google_refresh'] = str(refresh)