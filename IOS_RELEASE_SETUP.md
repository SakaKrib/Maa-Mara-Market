# Maa Mara Market — iOS release preparation

The repository already has a Capacitor iOS configuration and a GitHub Actions job that generates the iOS project and compiles an unsigned iOS Simulator build. The native Bundle ID is `com.maamaramarket.app`.

The current workflow does not require Apple signing credentials. It can prepare and validate the project before Apple Developer Program enrollment. TestFlight/App Store distribution will require an eligible account holder with an active membership and valid signing assets.

## Current GitHub Actions configuration

### Repository secrets

| Name | Purpose |
|---|---|
| `MAAMARAMARKET_PUBLIC_BASE_URL` | Backend public origin used by native builds. For current shared-hostname testing, use `https://opondo-thinkpad-t14-gen-1.tail34bca9.ts.net`. |
| `FIREBASE_IOS_CONFIG` | Optional for unsigned project preparation. If supplied, store the complete contents of Firebase `GoogleService-Info.plist` for Bundle ID `com.maamaramarket.app`; this enables the iOS Firebase setup step. |

### Repository variables

| Name | Purpose |
|---|---|
| `MAAMARAMARKET_PUBLIC_PATH_PREFIX` | Use `/maamara` for the shared hostname; use `/` when MaaMara has its own root domain. |

The workflow assembles `VITE_API_URL` from `MAAMARAMARKET_PUBLIC_BASE_URL` plus the path prefix. Never put secrets in `VITE_*` variables because they are embedded in the client bundle.

## Django production environment

Set these in the private backend environment file, never in source control:

| Variable | When | Purpose |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Now | Google Web application OAuth client ID. |
| `GOOGLE_CLIENT_SECRET` | Now | Google OAuth client secret; backend only. |
| `GOOGLE_IOS_CLIENT_ID` | Optional | Reserved for a future native Google SDK flow; current Allauth browser flow does not use it. |
| `GOOGLE_ANDROID_CLIENT_ID` | Optional | Reserved for a future native Google SDK flow; current Allauth browser flow does not use it. |
| `APPLE_CLIENT_ID` | Later | Apple Services ID for web sign-in. |
| `APPLE_TEAM_ID` | Later | Apple Developer Team ID. |
| `APPLE_KEY_ID` | Later | Key ID for the Sign in with Apple private key. |
| `APPLE_PRIVATE_KEY_PATH` | Later | Path to the downloaded Apple `.p8` key mounted outside the repository. |
| `APPLE_BUNDLE_ID` | Pre-filled | Keep as `com.maamaramarket.app`, matching Capacitor. |
| `APPLE_REDIRECT_URI` | Later | Exact Apple Return URL registered for the Services ID. |

Apple sign-in is considered configured only when the Services ID, Team ID, Key ID and private key are all present. Until then, the Continue with Apple button is visible but disabled.

### OAuth callback URLs

For standalone production domain:
- Google: `https://maamaramarket.com/accounts/google/login/callback/`
- Apple: `https://maamaramarket.com/accounts/apple/login/callback/`

For shared-hostname testing with `/maamara` prefix:
- Google: `https://opondo-thinkpad-t14-gen-1.tail34bca9.ts.net/maamara/accounts/google/login/callback/`
- Apple: `https://opondo-thinkpad-t14-gen-1.tail34bca9.ts.net/maamara/accounts/apple/login/callback/`

Apple requires its Return URL to match exactly and its domain to be registered and verified. Google requires the callback URL to be registered on the Web OAuth client.

**Google configuration note:** use either the environment-backed credentials or a Django Allauth SocialApp record for Google, not both. Duplicate provider configuration can cause Allauth to find multiple matching apps. The existing custom adapter links an existing local account only when the provider returns a verified email; unverified or ambiguous matches fail closed.

## Future iOS distribution secrets

These are a future checklist for a separate signed archive/TestFlight workflow; they are not needed for the current unsigned simulator build.

| GitHub secret | Contents |
|---|---|
| `IOS_DISTRIBUTION_CERTIFICATE_P12_BASE64` | Base64-encoded Apple Distribution `.p12` certificate export. |
| `IOS_DISTRIBUTION_CERTIFICATE_PASSWORD` | Password protecting the `.p12` export. |
| `IOS_PROVISIONING_PROFILE_BASE64` | Base64-encoded App Store provisioning profile for `com.maamaramarket.app`. |
| `APPLE_TEAM_ID` | Apple Developer Team ID used for signing. |
| `APP_STORE_CONNECT_API_KEY_ID` | App Store Connect API key ID. |
| `APP_STORE_CONNECT_ISSUER_ID` | App Store Connect issuer ID. |
| `APP_STORE_CONNECT_PRIVATE_KEY_BASE64` | Base64-encoded App Store Connect API `.p8` private key. |

Never commit certificate files, provisioning profiles, App Store Connect keys, or the Apple Sign in private key.

## Release sequence

1. Generate and compile the unsigned iOS Simulator project in GitHub Actions.
2. Add Firebase iOS configuration only when the matching `GoogleService-Info.plist` is ready; without it, simulator preparation still runs, but native iOS push setup is omitted.
3. Once Apple membership and signing assets are available, add a separate protected iOS release job.
4. Archive the app, verify its signature, and upload it to App Store Connect/TestFlight.
5. Complete App Store metadata, privacy disclosures, screenshots and review requirements before public release.
