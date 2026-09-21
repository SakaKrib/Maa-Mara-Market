from django.urls import path
from . import views  # Make sure views.py exists
from .Serializer import *
from .views import *
from .messaging import messaging_contacts, messaging_conversations, messaging_messages, messaging_mark_read
from rest_framework.routers import DefaultRouter
from .Referal import *
from .SearchEngine import search_items
from .Open_Ai import AIChatAPIView
from core.PasswordRecovery import *
from django.views.generic.base import TemplateView

router = DefaultRouter()



urlpatterns = [
    #path('', views.home, name='home'),  # Replace with your actual view
    path('', TemplateView.as_view(template_name="index.html"), name='home'),  # Replace with your actual view
    path('api/activity-logs/', get_activity_logs, name='activity-logs'),
    # path('api/notifications/', AllVendorNotificationsView.as_view(), name='get_user_notifications'),
     path('api/notifications/', AllNotificationsView.as_view(), name='get_user_notifications'),

    path('api/notifications/<int:notification_id>/mark_seen/', mark_notification_seen, name='mark-notification-seen'),

    # About page
    path("api/admin-about/", admin_about, name="admin-about"),

    # Customer support
    path("api/support/inbox/", support_messages, name="support-inbox"),
    path("api/support/my/", my_support_messages, name="my-support-messages"),
    path("api/support/faq-candidates/", support_faq_candidates, name="support-faq-candidates"),
    path("api/support/reply/<int:pk>/", support_reply, name="support-reply"),

    

    #filter item
    path('api/filtered-items/', filtered_items, name='item-query_list'),
    # filter options
    path("api/filter-options/", filter_options),

    path("api/messaging/contacts/", messaging_contacts, name="messaging-contacts"),
    path("api/messaging/conversations/", messaging_conversations, name="messaging-conversations"),
    path("api/messaging/conversations/<int:conversation_id>/messages/", messaging_messages, name="messaging-messages"),
    path("api/messaging/conversations/<int:conversation_id>/read/", messaging_mark_read, name="messaging-mark-read"),

    #chat view
    path('api/chat-user-data/', views.user_data, name='chat_user_data'),
    path("api/items/<int:item_id>/reviews/", ReviewViewSet.as_view(
         {'get': 'list',
          'post': 'create'}
     ), name="item-reviews"),
    path("api/reactions/", ReactionViewSet.as_view(
        {'get': 'list',
         'post': 'create'}
    ), name="create-reaction"),


    # Fetch activity logs for a specific item
    path('api/activity-logs-item/-item', ActivityLogViewSet.as_view({'get': 'list'}), name='activity-logs-for-item'),

    # Delete a single log
    path('api/activity-logs-item/<int:pk>/delete/', ActivityLogViewSet.as_view({'delete': 'delete_single_log'}), name='delete-single-log'),

    # Clear all logs for a specific item
    path('api/activity-logs-item/clear-item-logs/', ActivityLogViewSet.as_view({'delete': 'clear_item_logs'}), name='clear-item-logs'),

    # Clear all logs (admin/testing)
    path('api/activity-logs-item/clear-all-logs/', ActivityLogViewSet.as_view({'delete': 'clear_all_logs'}), name='clear-all-logs'),

    # referals wallet and voucher
    path("api/referrals-link/", get_referral_link, name="get-referral-link"),
    path("api/referrals-track/", track_referral, name="track-referral"),
    path("api/user/account/", UserAccountView.as_view(), name="user-account"),
    path("api/user/update/", UpdateProfileView.as_view(), name="user-update"),
    path("api/user-profile/", user_account_view, name="user-update"),

    # visitor activity logs
    path("api/user-visitor-notifications/", get_notifications, name="notification-logs"),
    path("api/user-visitor-activity/", get_activity, name="activity-logs-user-visitor"),

    # sectin url
    path('api/hierarchy/', HierarchicalDataView.as_view(), name='hierarchy'),

    # subcategory item fetch
    path("api/subcategory/<int:subcategory_id>/products/", products_by_subcategory),

    # item an category url
    path('api/categories-with-items/', CategoryListWithItems.as_view(), name='categories-with-items'),
    path('api/items/details/<int:pk>/', ItemDetailView.as_view(), name='item-detail'),

    # search engene
    path('api/search-items/', search_items, name='search_items'),

    # open api url
    path('api/ai-chat/', AIChatAPIView.as_view(), name='ai-chat'),

    #organic products page
    path('api/organic-items/', OrganicItemsView.as_view(), name='organic-items'),

    # calendar url
    path("api/calendar-events/", UserCalendarEventsView.as_view(), name="user-calendar-events"),

    # reset forgotten password
    path("api/password-reset/", RequestPasswordReset.as_view()),
    path("api/password-reset-confirm/<uidb64>/<token>/", ResetPasswordConfirm.as_view()),

    # sending viewing emails
    path("api/email/send/", send_email),
    path("api/email/stats/", email_stats),
    # email list view
    path("api/email/list/", email_list),
    # fetch user to send emails
    path("api/email-users/", users_list)
]
