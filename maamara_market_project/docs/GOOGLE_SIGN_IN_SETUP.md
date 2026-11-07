# Maa Mara Market Google Sign-In

Maa Mara uses the Saka Krib ID-token exchange pattern for Google sign-in.

## Authentication flow

1. The website uses Google Identity Services to obtain a Google ID token. The Android app uses Capgo Social Login / Android Credential Manager to obtain the same type of token.
2. The frontend posts the token to `/api/google/login/`.
3. Django verifies the token signature, expiry, issuer, and audience against `GOOGLE_CLIENT_ID`, then requires Google's `email_verified` claim.
4. Django resolves the stable Google `sub` through the existing django-allauth `SocialAccount` record. On first sign-in, it links one existing local account by verified email or creates one new local account.
5. Django provisions the existing Maa Mara Profile and Wallet records, merges the current visitor identity when present, and issues Maa Mara's own HttpOnly JWT cookies.

Google passwords are never received or stored by Maa Mara. New Google-only accounts are created with an unusable local password. A returning Google identity resolves to the same local account.

Email/password login and Apple Allauth login remain in place. The existing Allauth Google callback routes are retained for compatibility, but the storefront Google button now uses the ID-token endpoint.

## Environment variables

Backend `backend/project01/.env`:

- `GOOGLE_CLIENT_ID`: the Google **Web application** OAuth client ID. This is the token audience checked by Django.
- `GOOGLE_CLIENT_SECRET`: remains server-side for the retained Allauth configuration. It is not sent to the browser and is not required by the new ID-token exchange.

Frontend build:

- `VITE_GOOGLE_CLIENT_ID`: the same Google Web application client ID. Client IDs are public identifiers and may be embedded in the frontend.
- `VITE_GOOGLE_IOS_CLIENT_ID`: optional separate iOS OAuth client ID. Native iOS sign-in reports a configuration error until this is supplied and the iOS URL scheme is configured.

The GitHub Actions workflow reads the public build ID from repository variable `GOOGLE_CLIENT_ID` or repository secret `GOOGLE_CLIENT_ID`, and the optional iOS ID from `GOOGLE_IOS_CLIENT_ID`. Do not create a `VITE_GOOGLE_CLIENT_SECRET` variable and never expose the secret.

The frontend package lifecycle installs `@capgo/capacitor-social-login` v7 before development/build commands because this app currently uses Capacitor 7. The Android workflow generates the required `MainActivity` activity-result bridge during native project generation.

## Google Cloud Console setup

Use one Google Cloud project for the Web and Android OAuth clients.

### Web application client

Add the exact website origins under **Authorized JavaScript origins**. Origins contain only scheme and hostname; do not include `/maamara`, a trailing path, or a callback path.

For the current shared-hostname test deployment:

```text
https://opondo-thinkpad-t14-gen-1.tail34bca9.ts.net
```

For the production storefront, if it is being used:

```text
https://maamaramarket.com
https://www.maamaramarket.com
```

The new GIS popup flow does not use an OAuth redirect URI. The old Allauth callback is no longer the active Google button flow.

### Android client

Create an **Android** OAuth client with:

- Package name: `com.maamaramarket.app`
- SHA-1: the fingerprint of the certificate that signs the APK being installed.

The Android plugin uses the **Web application client ID** as `webClientId`; do not put the Android client ID in that field. The Android OAuth client is registered in Google Cloud for the package name and signing SHA-1.

The mobile build workflow now prints the signed release APK's SHA-1 fingerprint in its **Verify Android release signatures** step. Register that fingerprint in Google Cloud. A debug build has a different SHA-1 and needs its own Android OAuth client registration if you test one. A Play Store distributed build may also require the Play App Signing certificate SHA-1.

If the OAuth consent screen is in Testing mode, add the Google accounts used for testing as test users.

## Verification checklist

- A new Google account creates exactly one local User, SocialAccount, Profile, Wallet, and verified EmailAddress.
- A returning Google identity signs in to the same local User.
- A verified Google email links to one existing local account; duplicate local email records or a conflicting Google identity fail closed.
- Inactive accounts and tokens with unverified email are rejected.
- The response sets HttpOnly `accessToken` and `refreshToken` cookies; the frontend then confirms the session through `/api/check-auth/`.
- Website and Android sign-in both use the same Django token-verification endpoint.
