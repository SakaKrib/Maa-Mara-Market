# import requests

# NOTIFICATION_SERVER = "http://localhost:5000"

# def notify_admins(message, url=None):
#     """Send a notification to all connected admin clients."""
#     try:
#         response = requests.get(f"{NOTIFICATION_SERVER}/api/connected-admins")
#         response.raise_for_status()
#         admins = response.json()

#         for admin in admins:
#             payload = {
#                 "socketId": admin["id"],
#                 "message": message,
#                 "url": url,
#             }
#             requests.post(f"{NOTIFICATION_SERVER}/api/notify/user", json=payload)
#             print(payload)

#     except requests.RequestException as e:
#         print("Network error notifying admins:", e)
#     except Exception as e:
#         print("Unexpected error notifying admins:", e)


# def notify_user(socket_id, message, url=None):
#     """Generic method to notify a user (vendor/customer/admin) via socket ID."""
#     try:
#         payload = {
#             "socketId": socket_id,
#             "message": message,
#             "url": url,
#         }
#         requests.post(f"{NOTIFICATION_SERVER}/api/notify/user", json=payload)

#     except requests.RequestException as e:
#         print(f"Network error notifying user {socket_id}:", e)
#     except Exception as e:
#         print(f"Unexpected error notifying user {socket_id}:", e)


# # Wrappers for semantic clarity
# def notify_vendor(socket_id, message, url=None):
#     """Send notification to a specific vendor."""
#     notify_user(socket_id, message, url)

# def notify_customer(socket_id, message, url=None):
#     """Send notification to a specific customer."""
#     notify_user(socket_id, message, url)
