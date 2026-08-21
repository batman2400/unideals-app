# Uni Deals — Launch readiness

What’s left before security and Google Play. The student, partner, and admin
product is already built. Do **not** start a new feature track.

1. Finish the items in this file that are not already on [SECURITY.md](SECURITY.md)
2. Sign off [SECURITY.md](SECURITY.md)
3. Follow [PLAY_STORE.md](PLAY_STORE.md)

Do not upload a preview APK to Play. The store binary is the EAS `production`
App Bundle.

---

## Already done (do not rebuild)

Student: auth (email + Google), deals, events, saved, search, verification,
Student Pass, online codes, in-store QR.

Partner: deals CRUD, scanner, brand, analytics.

Admin: verifications, deals/events, users, inquiries, blog manager, brands,
analytics.

Push pipeline is coded (`notify-students` + SQL files). No in-app payments
(by design).

**Intentionally not in the app** (website-only, fine for Play v1):

- Student blog reader
- Public brand directory
- Admin brand impersonation
- Apple App Store, dark mode, Sinhala

---

## Do now (before or with security)

These are **not** on SECURITY.md, but they will fail Play review or phone QA.

- [ ] **In-app account deletion** — Play expects it for apps with accounts.
      Profile only has Sign out (`src/screens/ProfileScreen.tsx`). Privacy
      currently says email support (`src/lib/legalContent.ts` §8). Add a
      Profile action that deletes the auth user + related data (or a clearly
      completable in-app request). Needs a matching Supabase RPC/policy —
      fold into the security pass.
- [ ] **ID photo picker permission** — Deal/avatar uploads request library
      access (`src/components/ImagePickerField.tsx`). Student ID upload does
      **not** (`src/components/VerificationPanel.tsx` `IdPhotoPicker`). On
      Android 13+ verification can fail with no useful prompt. Align it with
      `ImagePickerField`.
- [ ] **Confirm SQL is live** on the shared Supabase project. Repo SQL is
      “run in the editor,” not auto-migrated:
      - `supabase_yearly_student_verification.sql`
      - `supabase_push_notifications.sql`
      - `supabase_webhook_http_request.sql`

      Until yearly SQL is applied, `src/lib/studentVerification.ts` **trusts
      `is_verified` forever** if `verified_at` is missing. Expired students
      keep codes.
- [ ] **Age / school students** — The app has `student_type: "school"` and
      `high_school_only` events. Terms have **no minimum age**. Play Target
      audience / Families / Data safety must match this. Decide for v1:
      university-only (simplest) vs school/under-18 allowed (declare it and
      tighten copy). Do not leave it implicit.
- [ ] **Production EAS env** — `eas.json` `preview` has `"environment":
      "preview"`; `production` does not. A store AAB can ship with missing
      `EXPO_PUBLIC_SUPABASE_*` and land on `ConfigMissingScreen`. Set this
      during the security/EAS pass (also listed in SECURITY.md).

---

## Security pass

Follow [SECURITY.md](SECURITY.md) as written. Highest-signal **repo** items:

- [ ] Persist session with SecureStore, not AsyncStorage (`src/lib/supabase.ts`)
- [ ] Cap ID upload size/type (`src/lib/verificationDocuments.ts`)
- [ ] Expand privacy copy for ID photos, camera, push (`src/lib/legalContent.ts`
      + hosted `unideals.co/privacy`)
- [ ] Align Supabase Auth password rules with `src/lib/passwordPolicy.ts`
- [ ] Abuse-test RLS / RPCs / Storage with a student JWT (UI guards in
      `app/_layout.tsx` are not security)

Plus console work: private `verification-documents` bucket, Edge Function
auth (`send-verification-otp` / `send-verification-rejected`), tight redirect
allowlist (drop production `exp://**`).

**Preview APK QA** on a real phone is part of that gate (login, verify, code,
scanner, admin approve, push). There is no automated test suite — phone QA
is the gate.

---

## Launch ops (after SECURITY.md is signed off)

From [PLAY_STORE.md](PLAY_STORE.md). None of this is missing product code.

- [ ] Host public https privacy/terms (in-app `/privacy` is not enough)
- [ ] Feature graphic **1024×500** — not in `assets/` yet (icon/splash exist)
- [ ] Screenshots, Data safety, IARC, camera/photo justifications
- [ ] Reviewer test accounts (student + partner)
- [ ] Bump `app.json` version `0.1.0` → `1.0.0`
- [ ] Pay $25 / identity verification **in parallel** with the security gate
- [ ] Production AAB only (never upload preview APK)
- [ ] After first AAB: add Play **app-signing SHA-1** next to the EAS SHA-1

Typical first listing: **2–4 weeks**; **+2 weeks** if Play requires 14-day
closed testing.

---

## Nice-to-have (not blocking Play)

| Item | Why it can wait |
| --- | --- |
| Restore native date picker (`src/components/DateTimeField.tsx`) | Partners can type dates; do after next native rebuild |
| Sentry / ErrorBoundary | No crash telemetry today; add if you want visibility on first users |
| Offline banner | Feeds already have Retry / pull-to-refresh |
| Product analytics SDK | Partner “analytics” is redemption stats, not telemetry |
| Tests / CI | Zero tests; add after launch if you want |
| Android App Links, Firebase App Check | Already marked post-listing in SECURITY.md |
| Student Pass QR without raw UUID | Post-listing |

---

## Suggested order

1. **This week (small product fixes):** ID picker permission, confirm SQL
   applied, decide school/under-18, start account-deletion with the security
   work.
2. **Security week:** SECURITY.md blockers + preview APK abuse/happy-path QA.
3. **In parallel:** Play account + listing assets + hosted privacy/terms.
4. **Then:** bump to `1.0.0`, production AAB, internal track, SHA-1, review.

Do **not** port blog, brand directory, impersonation, or iOS before launch.
