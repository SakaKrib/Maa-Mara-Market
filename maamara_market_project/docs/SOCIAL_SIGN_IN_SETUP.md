# Maa Mara Market social sign-in setup

Maa Mara uses its own Django accounts and JWT cookies. Google and Apple provider credentials are verified by Django; the frontend never receives provider client secrets or private keys.

## Google

- `GOOGLE_CLIENT_ID`: Web OAuth client ID. Used by Google Identity Services and as the backend ID-token audience.
- `GOOGLE_IOS_CLIENT_ID`: iOS OAuth client ID, exposed to the native build as `VITE_GOOGLE_IOS_CLIENT_ID`.
- `GOOGLE_ANDROID_CLIENT_ID`: register this OAuth client in Google Cloud for package `com.maamaramarket.app` and the signing SHA-1 fingerprint. The native plugin exchanges using the Web client ID.
- `GOOGLE_CLIENT_SECRET`: backend-only compatibility value; the ID-token sign-in flow does not use it.

Set GitHub Actions secrets `GOOGLE_CLIENT_ID` and `GOOGLE_IOS_CLIENT_ID` so website and native bundles receive their public client IDs. Never set a client secret under a `VITE_*` name.

Google login and registration use the same flow:
1. Website: Google Identity Services popup returns an ID token.
2. Android/iOS: Capgo Capacitor Social Login returns an ID token.
3. Frontend sends the credential to `POST /api/google/login/`.
4. Django verifies signature, issuer, audience, expiry, subject and verified email.
5. Django resolves the Google subject, safely links a verified existing email or creates a local user, provisions Profile and Wallet, merges visitor data and issues Maa Mara HttpOnly JWT cookies.

## Apple

Apple is offered on the website and iOS only. Android does not render an Apple sign-in control.

Required backend-only variables:

- `APPLE_CLIENT_ID`: Apple Services ID for website sign-in.
- `APPLE_TEAM_ID`
- `APPLE_KEY_ID`
- `APPLE_BUNDLE_ID`: native iOS app identifier; defaults to `com.maamaramarket.app`.
- `APPLE_PRIVATE_KEY_PATH`: mounted path to the Apple AuthKey .p8 file, or use the supported server-side `APPLE_PRIVATE_KEY` value.
- `APPLE_REDIRECT_URI`: exact Return URL registered for the Services ID.

With the shared-hostname deployment prefix, the callback is:

`https://YOUR_HOST/maamara/api/apple/callback/`

For a root deployment, omit `/maamara`. The configured value must exactly match the backend's expected URL and Apple's registered Return URL. Apple is reported as available only when its required server configuration is complete.

Enable the **Sign in with Apple** capability for the iOS App ID in the Apple Developer portal and include it in the provisioning profile. Website Apple sign-in uses a Django-owned authorization-code flow with short-lived HttpOnly state/nonce cookies, server-side code exchange and identity-token verification. Native iOS uses Apple's native authorization sheet and posts its identity token plus nonce to Django. Returning users are resolved by Apple's stable subject; first-login email/name are stored when supplied, including private relay addresses.

## Security and sessions

- Provider ID tokens are never stored in browser storage.
- Google client secrets and Apple private keys remain server-side.
- Django issues Maa Mara's existing HttpOnly `accessToken` and `refreshToken` cookies.
- Email/password login, registration OTP, local account IDs, Profile and Wallet records remain unchanged.
- The dedicated Google and Apple endpoints do not use Django Allauth provider redirect routes.

## Endpoints

- `GET /api/auth/providers/`
- `POST /api/google/login/`
- `GET /api/apple/config/`
- `GET /api/apple/start/` (website)
- `POST /api/apple/callback/` (Apple website form_post callback)
- `POST /api/apple/login/` (native iOS)

