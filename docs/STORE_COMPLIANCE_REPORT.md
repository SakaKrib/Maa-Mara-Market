# App Store / Google Play compliance report (branch ui-redesign-foundation)

Status key: PASS = implemented and covered by CI; PARTIAL = works but a gap or an owner action remains; N/A.
Verification: backend tests and web/Android/iOS builds run in GitHub Actions; nothing was tested on a physical device.

| Area | Status | Notes |
|---|---|---|
| Sign in with Apple offered with Google (App Store 4.8) | PASS | Server-issued one-time nonce, replay cache, cached Apple keys |
| Google sign-in | PASS | Owner confirmed working; not changed |
| In-app account deletion (Apple 5.1.1(v), Play) | PASS | Account page; password or emailed code; anonymises, keeps financial records |
| Public deletion page for Play Data-safety form | PASS | `/delete-account`, emailed link |
| Sign in with Apple token revocation on deletion | PASS | Refresh token stored and revoked at Apple on deletion (best effort); test it once on a real iPhone because the native plugin may not return the authorization code |
| Vendor account deletion | PARTIAL | Manual within 30 days (payouts/listings); stated in policy |
| UGC: report, block, remove, 24h review (Apple 1.2, Play UGC) | PASS | Report on reviews, posts, comments, messages, listings; block; admin queue; procedure doc |
| UGC: filtering objectionable content before it appears | PASS | Blogs/banners/items are approved first; reviews, comments and messages pass an automatic text filter (extend with `CONTENT_FILTER_EXTRA_TERMS`) |
| Moderation capacity | PARTIAL | Needs a named person checking the queue daily; overdue reminder runs every 6 hours |
| AI content safety | PASS | Provider filters, blocked output handled, human review, "Written with AI assistance", report reason |
| Privacy Policy and Terms match the app | PASS | Updated 9 Nov 2026: moderation, AI, retention, deletion |
| Report retention enforced | PASS | Daily purge task, 12 months |
| Payments (Apple 3.1.1/3.1.3(e), Play payments) | PASS | Physical goods only; wallet coins are earned loyalty points, not sold; no in-app purchase needed |
| Native permissions | PASS | iOS purpose strings; Android location permission; no other sensitive permissions |
| Export compliance (`ITSAppUsesNonExemptEncryption`) | PASS | Declared false in Info.plist at build time (standard HTTPS only) |
| iOS privacy manifest / App Privacy labels, Play Data safety form | PARTIAL | Owner must complete in the store consoles using the privacy policy |
| Production configuration | PARTIAL | See owner actions |
| Auth/session behaviour | N/A | Owner asked to leave unchanged |

## Owner actions before submission
1. Run `migrate` (core 0028, shop 0024/0025 and earlier pending migrations).
2. Production `.env`: `DEBUG=False`, secure cookies on, `SECURE_PROXY_SSL_HEADER=true`, production PayPal/M-Pesa/DHL/FedEx URLs and real account numbers, real `IOS_APP_LINK`, random `MPESA_CALLBACK_TOKEN`.
3. Set `ANDROID_APP_SHA256_CERT_FINGERPRINTS` in the backend `.env` (the app's `/.well-known/assetlinks.json` is now served by Django); keep `APP_LINK_HOSTS` (GitHub secret or variable) equal to the host used in emails; reinstall the app after rebuilding.
4. Provide Apple/Google reviewers a test customer account, and a vendor account if requested.
5. Fill in App Privacy and Data safety forms; set the deletion URL; answer encryption questions.
6. Name the moderator(s) responsible for the 24-hour queue and an appeals reviewer.
7. Review `CONTENT_FILTER_EXTRA_TERMS` for words common in your market, in Swahili as well as English.
8. Test Sign in with Apple and account deletion on a real iPhone.

## Readiness
- **Google Play: close.** Remaining items are console forms, production config and a moderation owner.
- **Apple App Store: close.** Both earlier risks (UGC text filter, token revocation) are implemented; the remaining work is console forms, production config, a real-device test and reviewer accounts.
