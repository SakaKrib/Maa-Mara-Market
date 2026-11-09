# AI features and safety

Maa Mara Market uses Google Gemini only to help **vendors** draft content. There is no customer-facing chatbot and
AI output is never published automatically.

| Feature | Endpoint | Output goes to |
|---|---|---|
| Blog draft | `/api/ai/generate-blog/` | Vendor's editor; post must be approved by an admin |
| Item name/description/attribute suggestions | `core/item_ai.py` | Vendor's item form; vendor submits, item is reviewed |
| Vendor registration description | `core/vendor_registration_ai.py` | Vendor's form |
| Item growth suggestions | `ReactSerializers/item_insights.py` | Vendor's dashboard (advice only) |

## Safeguards
1. **Provider filters**: every Gemini request carries safety settings for harassment, hate speech, sexually explicit and
   dangerous content at `BLOCK_MEDIUM_AND_ABOVE` (`core/ai_safety.py`).
2. **Blocked output is never used**: a blocked prompt or a response stopped for safety reasons raises
   `AIBlockedError`; the vendor sees "could not produce this because it may break our content rules".
3. **Sanitised output**: blog HTML is restricted to a small tag allow-list; plain-text fields are stripped and length-limited.
4. **Prompt-injection hardening**: vendor-supplied context is sent as quoted JSON data with an instruction to ignore
   instructions inside it. Prompts forbid inventing facts, certifications, prices or claims.
5. **Human in the loop**: vendors review and edit; blog posts, items and banners go through admin approval.
6. **Transparency**: posts written with the AI tool are stored with `ai_assisted = true` and show
   "Written with AI assistance". The editor warns that AI can be wrong and the vendor is responsible.
7. **User reporting**: "Harmful or inaccurate AI-generated content" is a report reason on every post, listing and review;
   reports enter the normal 24-hour moderation queue (see MODERATION_PROCEDURE.md).
8. **Abuse limits**: signed-in vendors only, per-user hourly throttles, size limits on uploaded media.
9. **Data sent to Google**: the title, item name/description/brand, company name and any image or video the vendor
   chose to attach. No customer personal data or payment data is sent. This is disclosed in the Privacy Policy.
