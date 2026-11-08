"""
URL configuration for loginSign project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import include, path, re_path
from django.conf import settings
from django.views.static import serve
from django.http import HttpResponse, JsonResponse

from ReactSerializers.apple_auth import apple_configuration_is_ready
from ReactSerializers.social_auth_views import GoogleLoginView

def index_view(request):
    return HttpResponse("Maa Mara Market API", content_type="text/plain")


def auth_provider_status(request):
    """Expose readiness flags for the dedicated ID-token sign-in flows."""
    return JsonResponse({
        "google": bool(getattr(settings, "GOOGLE_CLIENT_ID", "")),
        "apple": apple_configuration_is_ready(),
    })

urlpatterns = [
    path("api/auth/providers/", auth_provider_status, name="auth-provider-status"),
    path("admin/", admin.site.urls),
    path("", include("pesapalpayments.urls")),
    path("", include("order.url")),
    path("", include("core.urls")),
    path("", include("shop.urls")),
    path("", include("vendorDashboard.urls")),
    path("", include("ReactSerializers.url")),
    # Backward-compatible endpoint for older browser bundles. It still uses
    # the same verified Google ID-token flow as /api/google/login/; it does
    # not enable a separate Allauth/OAuth sign-in implementation.
    path("accounts/google/login/", GoogleLoginView.as_view(), name="google-login-legacy-compat"),
    path("accounts/", include("allauth.urls")),
    path("", index_view, name="index"),
]


# The Docker backend runs Django's development server directly, including when
# DEBUG is disabled by the compose environment. django.conf.urls.static.static()
# returns an EMPTY list whenever DEBUG is False, so it cannot make uploaded
# media reachable in that setup. Register the serve view explicitly instead.
_media_prefix = settings.MEDIA_URL.strip("/").split("/")[-1]
if _media_prefix:
    urlpatterns += [
        re_path(
            rf"^{_media_prefix}/(?P<path>.*)$",
            serve,
            {"document_root": settings.MEDIA_ROOT},
        ),
    ]