from allauth.socialaccount.adapter import DefaultSocialAccountAdapter

class MyAdapter(DefaultSocialAccountAdapter):

    def pre_social_login(self, request, sociallogin):
        user = sociallogin.user

        if user.email:
            from django.contrib.auth import get_user_model
            User = get_user_model()

            try:
                existing_user = User.objects.get(email=user.email)
                sociallogin.connect(request, existing_user)
            except User.DoesNotExist:
                pass