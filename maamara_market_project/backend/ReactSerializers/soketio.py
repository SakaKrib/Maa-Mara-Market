# import json
# from datetime import datetime
# from channels.generic.websocket import AsyncWebsocketConsumer
# from channels.db import database_sync_to_async
# from channels.layers import get_channel_layer
# import logging

# class NotificationConsumer(AsyncWebsocketConsumer):
#     async def connect(self):
#         # Get the user from the WebSocket connection
#         self.user = self.scope['user']
        
#         if self.user.is_authenticated:
#             if self.user.is_staff:  # Check if the user is an admin
#                 # Connect to the global admin notification group
#                 self.room_group_name = "notifications_admin_group"
#             else:
#                 # Connect to the user-specific group
#                 self.room_group_name = f"notifications_user_{self.user.id}"

#             # Join the room group
#             await self.channel_layer.group_add(
#                 self.room_group_name,
#                 self.channel_name
#             )

#             await self.accept()
#         else:
#             await self.close()

#     async def disconnect(self, close_code):
#         # Leave the group when the WebSocket connection is closed
#         await self.channel_layer.group_discard(
#             self.room_group_name,
#             self.channel_name
#         )

#     async def receive(self, text_data):
#         # Handle incoming messages if needed (e.g., marking notifications as read)
#         data = json.loads(text_data)
#         notification_id = data.get('notification_id')
#         if notification_id:
#             # Logic to mark the notification as read (optional)
#             pass

#     async def send_notification(self, event):
#         # Send notification to WebSocket
#         await self.send(text_data=json.dumps({
#             'message': event['message'],
#             'type': event['type'],  # 'global' or 'private'
#             'timestamp': event['timestamp'],
#             'url': event.get('url', None),
#             'user_id': event.get('user_id', None),
#         }))

#     @database_sync_to_async
#     # The send_to_all_admins method should await the group_send
#     @database_sync_to_async
#     def send_to_all_admins(self, message):
#         """Send notification to all connected admin clients"""
#         from channels.layers import get_channel_layer
#         channel_layer = get_channel_layer()
#         timestamp = datetime.now().isoformat()  # Use the current timestamp

#         # Ensure you await the group_send call here
#         return channel_layer.group_send(
#             "notifications_admin_group",  # Admin group
#             {
#                 'type': 'send_notification',
#                 'message': message,
#                 'type': 'global',  # Use 'global' for admin notifications
#                 'timestamp': timestamp,
#             }
#         )


#     @database_sync_to_async
#     def send_to_specific_user(self, user_id, message):
#         """Send a private notification to a specific user"""
#         room_group_name = f"notifications_user_{user_id}"
#         channel_layer = get_channel_layer()
#         timestamp = datetime.now().isoformat()

#         try:
#             channel_layer.group_send(
#                 room_group_name,
#                 {
#                     'type': 'send_notification',
#                     'message': message,
#                     'type': 'private',  # Use 'private' for user-specific notifications
#                     'timestamp': timestamp,
#                 }
#             )
#         except Exception as e:
#             logging.error(f"Error sending message to user {user_id}: {e}")

# from django.http import JsonResponse
# from channels.layers import get_channel_layer
# from datetime import datetime

# def send_notification(request):
#     user_id = 1  # Replace with actual user ID
#     message = "Hello, this is a test notification"
#     timestamp = datetime.now().isoformat()

#     channel_layer = get_channel_layer()
#     room_group_name = f"notifications_user_{user_id}"

#     # Send notification to WebSocket group
#     channel_layer.group_send(
#         room_group_name,
#         {
#             'type': 'send_notification',
#             'message': message,
#             'timestamp': timestamp,
#         }
#     )
#     return JsonResponse({'status': 'Notification sent!'})
        
