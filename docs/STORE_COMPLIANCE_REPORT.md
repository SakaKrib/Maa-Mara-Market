# App Store / Google Play compliance report (branch ui-redesign-foundation)

Status key: PASS = implemented and covered by CI; PARTIAL = works but a gap or an owner action remains; N/A.
Verification: backend tests and web/Android/iOS builds run in GitHub Actions; nothing was tested on a physical device.

| Area | Status | Notes |
|---|---|---|
| Sign in with Apple offered with Google (App Store 4.8) | PASS | Server-issued one-time nonce, replay cache, cached Apple keys |
| Google sign-in | PASS | Owner confirmed working; not changed |
| In-app account deletion (Apple 5.1.1(v), Play) | PASS | Account page; password or emailed code; anonymises, keeps financial records |
| Public deletion page for Play Data-safety form | PASS | `/delete-account`, emailed link |
| Sign in with Apple token revocation on deletion | PARTIAL | Links removed locally; Apple revoke call not implemented |
| Vendor account deletion | PARTIAL | Manual within 30 days (payouts/listings); stated in policy |
| UGC: report, block, remove, 24h review (Apple 1.2, Play UGC) | PASS | Report on reviews, posts, comments, messages, listings; block; admin queue; procedure doc |
| UGC: filtering objectionable content before it appears | PARTIAL | Blogs/banners/items are approved first; reviews, comments, messages are reactive only (no automatic text filter) |
| Moderation capacity | PARTIAL | Needs a named person checking the queue daily; overdue reminder runs every 6 hours |
| AI content safety | PASS | Provider filters, blocked output handled, human review, "Written with AI assistance", report reason |
| Privacy Policy and Terms match the app | PASS | Updated 9 Nov 2026: moderation, AI, retention, deletion |
| Report retention enforced | PASS | Daily purge task, 12 months |
| Payments (Apple 3.1.1/3.1.3(e), Play payments) | PASS | Physical goods only; wallet coins are earned loyalty points, not sold; no in-app purchase needed |
| Native permissions | PASS | iOS purpose strings; Android location permission; no other sensitive permissions |
| Export compliance (`ITSAppUsesNonExemptEncryption`) | PARTIAL | Not set; owner must answer in App Store Connect |
| iOS privacy manifest / App Privacy labels, Play Data safety form | PARTIAL | Owner must complete in the store consoles using the privacy policy |
| Production configuration | PARTIAL | See owner actions |
| Auth/session behaviour | N/A | Owner asked to leave unchanged |

## Owner actions before submission
1. Run `migrate` (core 0028, shop 0024/0025 and earlier pending migrations).
2. Production `.env`: `DEBUG=False`, secure cookies on, `SECURE_PROXY_SSL_HEADER=true`, production PayPal/M-Pesa/DHL/FedEx URLs and real account numbers, real `IOS_APP_LINK`, random `MPESA_CALLBACK_TOKEN`.
3. Serve `/.well-known/assetlinks.json` on the production host; set the `APP_LINK_HOSTS` GitHub variable.
4. Provide Apple/Google reviewers a test customer account, and a vendor account if requested.
5. Fill in App Privacy and Data safety forms; set the deletion URL; answer encryption questions.
6. Name the moderator(s) responsible for the 24-hour queue and an appeals reviewer.
7. Decide whether to add an automatic text filter for reviews/comments (recommended before iOS review).
8. Implement Apple token revocation (needs the Apple key already configured).

## Readiness
- **Google Play: close.** Remaining items are console forms, production config and a moderation owner.
- **Apple App Store: close, with two risks.** Reviewers sometimes ask about a content filter for UGC and token revocation for Sign in with Apple; fix both before submitting.
