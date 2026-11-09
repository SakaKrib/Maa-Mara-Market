# Maa Mara Market — Content Moderation Procedure

Required by Apple App Store Guideline 1.2 and Google Play's User Generated Content policy.
Owner: the admin team. Review this document every six months.

## 1. What users can post
Product reviews, blog posts (vendors) and blog comments, support/direct messages, product listings and banners (vendors).
Vendor AI tools (blog, item description, registration helpers) only produce **drafts**; the vendor must publish them,
and blog posts need admin approval before they are public.

## 2. Community rules (shown in the Terms)
No spam or scams, harassment, hate speech, sexual or violent content, illegal goods, misleading claims, counterfeit or
copyright-infringing items, or harmful AI-generated text. Breaking these rules can lead to content removal and
account suspension.

## 3. How users report and block
- **Report**: every review, blog post, blog comment, message and product listing has a *Report* link. The user picks
  a reason (spam, harassment, hate, sexual, violence, illegal, misleading, copyright, harmful AI content, other) and may
  add details. Signed-in users and cookie-bound visitors can report. Duplicate open reports from the same person are merged.
  Users cannot report their own content. The reporter's identity is never shown to the reported person.
- **Block**: from the same dialog (or *Report* on a review/comment/post) a signed-in user can block the author.
  Blocked authors' reviews, comments and blog posts are hidden from the blocker immediately. Blocks are listed and can be
  undone under *Account → Blocked users*. Support (staff) accounts cannot be blocked; use Report instead.

## 4. Review process (admin)
1. A new report notifies every superuser in-app and appears in **Admin → Content → Moderation** (open queue).
2. **Service level: every report is reviewed within 24 hours.** Reports older than 24 hours are flagged *Overdue*
   and counted at the top of the page. Check the queue at least twice a day, including weekends.
3. Open the card: read the saved copy of the content (kept even if the author edits it), the reporter's note and
   how many other reports exist for the same item.
4. Choose one action and add a short note (stored on the report):

| Situation | Action |
|---|---|
| No violation | **Dismiss** |
| Rule broken, first offence, minor | **Remove content** (hidden from everyone; author is told) |
| Serious or repeated abuse, scams, illegal goods, sexual or violent content | **Remove + suspend** |
| Account itself is abusive, content already gone | **Suspend user** |
| Decision was wrong | **Undo decision** (restores content and reactivates the account) |

5. The reporter is automatically told the report was reviewed. The content owner is told when content was removed.
6. Staff accounts cannot be suspended from this page; escalate to the site owner.

## 5. What each action does in the system
- Reviews, comments and messages: `moderation_hidden = true` (messages show "removed by a moderator").
- Blog posts: set back to *not approved*. Product listings: set to *unavailable*. Banners: set to *not approved*.
- Suspend: the user is deactivated and cannot sign in; existing sessions stop working at token refresh.
- Every resolution stores who acted, when, the action and the note.

## 6. Escalation and legal requests
- Child sexual abuse material, credible threats or other serious illegal content: remove and suspend immediately,
  keep the saved snapshot, and report to the relevant authority (in Kenya: DCI / the Communications Authority; internationally NCMEC where applicable).
- Valid legal or law-enforcement requests are handled by the site owner only.
- Appeals: an affected user can email the support address; an admin other than the original moderator reviews it and
  may use **Undo decision**.

## 7. Records and privacy
Reports and notes are kept for 12 months to show moderation was carried out, then deleted. If a reporter deletes their
account their identity is removed from the report. If the reported author deletes their account, the saved text
snapshot may be kept for the same 12 months as safety evidence.

## 8. Quarterly check (owner)
Count reports received, average time to resolution, overdue reports, suspensions, and appeals; note any pattern
(repeat offenders, vendors, categories) and adjust rules or automation.
