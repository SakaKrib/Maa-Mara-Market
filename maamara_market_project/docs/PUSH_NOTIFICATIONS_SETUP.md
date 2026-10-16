# Maa Mara Market push notifications setup

The notification pipeline keeps each Django `Notification` row as the source of truth. New rows are sent to registered devices through Firebase Cloud Messaging (FCM); the website and app also show in-app notification popups and keep the notification feed available.

## Required configuration

Push delivery is intentionally disabled in generated native builds until the matching Firebase platform configuration is supplied. Do not commit these configuration files or service-account credentials to Git.

### 1. Firebase Android app

1. Create/select the Maa Mara Market Firebase project and add the Android app using the native package ID from `frontend/capacitor.config.ts` (now `com.maamaramarket.app` from `frontend/capacitor.config.ts`).
2. Download `google-services.json`.
3. In GitHub repository **Settings → Secrets and variables → Actions**, create secret `FIREBASE_ANDROID_CONFIG` containing the full JSON file contents.

The Android workflow writes this secret into the generated native project and configures the Google Services Gradle plugin. If the secret is absent, the APK can still build, but native push registration is disabled.

### 2. Firebase iOS app and APNs

1. Add the iOS app to the same Firebase project using the iOS bundle ID configured for the native app.
2. Download `GoogleService-Info.plist`.
3. Create GitHub Actions secret `FIREBASE_IOS_CONFIG` containing the full plist contents.
4. In the Apple Developer account, enable the Push Notifications capability for the app ID, configure signing/entitlements for the real-device build, and upload an APNs authentication key to Firebase Console → Project settings → Cloud Messaging.

The workflow adds the required Capacitor AppDelegate callbacks and includes the plist when the secret is present. The current iOS workflow compiles a **simulator project**; actual push delivery on a physical iPhone still requires a signed device/distribution build and APNs configuration.

### 3. Backend Firebase service account

Create a Firebase service account with permission to send Firebase Cloud Messaging messages. Configure the backend deployment with one of:

- `FIREBASE_SERVICE_ACCOUNT_JSON`: the complete service-account JSON as an environment secret; or
- `FIREBASE_SERVICE_ACCOUNT_FILE`: an absolute path to a protected service-account JSON file.

Never put either credential in source control. Restart the backend after setting the environment variable.

**Important for production:** the native GitHub Actions secrets `FIREBASE_ANDROID_CONFIG` and `FIREBASE_IOS_CONFIG` only configure the Android/iOS app builds. They do not authenticate Django with FCM. The production Compose service loads `backend/project01/.env`, so the backend service-account variable must also be set in that deployed environment (or supplied through your deployment platform's secret manager). Adding a GitHub Actions secret alone does not inject it into an already-running production backend.

The authenticated app lifecycle already invokes `setupNativePushNotifications()` after the user is restored. If no device appears in `PushDevice`, inspect the app's registration logs and the `POST /api/push/devices/` response before changing startup code.

### 4. Apply the database migration

Deploy the backend and run:

```bash
python manage.py migrate
```

This creates the `PushDevice` table used to associate native push tokens with authenticated accounts.

## Event coverage

The shared push dispatcher handles every new user-addressed `Notification` row, including existing vendor item/price approvals, wishlist/review/return events, new direct messages, paid orders, and order fulfillment status updates. Customer item views and cart additions now create vendor notifications as well. The app's notification popup and notification list use the saved notification URL; message notifications include conversation/message IDs so the chat opens at and scrolls to the relevant message.

If Firebase secrets are not configured, saved in-app notifications and clickable popups continue to work, but the operating system will not display background/closed-app push notifications.
