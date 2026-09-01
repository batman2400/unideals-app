# Uni Deals — Security gate (before Play Store)

Play listing is **blocked** until every **Blocker** below is checked off.
Then follow [PLAY_STORE.md](PLAY_STORE.md).

This Expo app shares the **same Supabase project** as [unideals.co](https://unideals.co).
Partner and admin screens in `app/_layout.tsx` are **UI guards only**
(`Stack.Protected`). A modified APK can still call the API. Real security is
**RLS, RPCs, Storage policies, and Edge Functions**.

`EXPO_PUBLIC_SUPABASE_ANON_KEY` is a **public anon key**. It belongs in the
client. Never put the **service role** key in Expo env, EAS secrets that ship
to the app, or git.

---

## Already done

- [x] `google-services.json` gitignored (keep the local file for EAS via `.easignore`)
- [x] `*firebase-adminsdk*.json` gitignored — FCM send key stays in Expo credentials
- [x] Firebase **Android key** restricted to package `co.unideals.app` + EAS upload SHA-1
- [x] Public deal list uses `get_public_deals()` and omits `redemption_code`
- [x] In-store tickets via `generate_instore_ticket` / `validate_instore_ticket`
- [x] `notify-students` Edge Function refuses anything except `service_role`

### After Play ships (not a listing blocker)

- [ ] Apply website SQL `supabase_reveal_deal_code_cutover.sql` so students no
      longer receive `redemption_code` on deal load. Only after this Reveal
      build is on Play. See [md/REVEAL_PROMO_CODE.md](md/REVEAL_PROMO_CODE.md).

Do **not** delete or rotate the Android API key for launch. After the first
Play `.aab`, add the **Play app-signing SHA-1** (see [PLAY_STORE.md](PLAY_STORE.md)).

---

## Blockers — Supabase / Firebase console

SQL for most tables lives on the **shared web project**, not this folder.
Audit the live project.

### Storage

- [ ] Bucket `verification-documents` is **private** (not public)
- [ ] Students can **upload** only to `{auth.uid()}/**`
- [ ] Students **cannot download** other users’ ID objects
- [ ] Admins read IDs only via **signed URLs** (admin UI already uses ~300s TTL)
- [ ] Buckets `avatars` and `deal-images` stay public — confirm **no ID photos** land there
- [ ] Older `manual_verifications` rows that stored a full public URL are private or cleaned up

### RLS and RPCs

Logged-in **student** (and anon) must fail these:

- [ ] Select `redemption_code` from `deals` (students get codes only via `reveal_online_deal_code`; deal-load RPC is cut over after this app ships)
- [ ] Read another student’s `student_redemption_tickets` / ID objects
- [ ] Insert/update/delete another partner’s deals
- [ ] `list_users_with_roles`, `admin_list_all_deals`, verification approve/reject
- [ ] `validate_instore_ticket` (partners only)
- [ ] Update `user_roles` (role / `is_verified`) for self or others
- [ ] Spoof admin/partner via `user_metadata` — `get_user_role()` stays authoritative

Logged-in **partner** must:

- [ ] Mutate only **their** deals
- [ ] Validate tickets, not read other partners’ analytics/codes they should not see

### Edge Functions (shared project; not all in this repo)

- [ ] `notify-students` — service-role only (already coded here)
- [ ] `send-verification-rejected` — **admin only**, not any authenticated user
- [ ] `send-verification-otp` — authenticated + **rate-limited**; cannot blast arbitrary inboxes

### Auth

- [ ] Production redirect allowlist: `unideals://auth/callback` and `unideals://reset-password` only
- [ ] Drop broad `exp://**` from **production** (keep it only if you still need Expo Go)
- [ ] Google OAuth client is the Android app `co.unideals.app`, not a wildcard
- [ ] Supabase Auth password rules match the app (8+, upper, lower, digit) — `src/lib/passwordPolicy.ts` is **UI-only** today

### Firebase

- [ ] Keep the existing Android key; do not delete it
- [ ] After first Play AAB: add Play **App signing** SHA-1 next to the EAS SHA-1  
      (package `co.unideals.app`)  
      [API credentials](https://console.cloud.google.com/apis/credentials?project=unideals-6d728)

---

## Blockers — this repo (code follow-up)

These are still open in the mobile app. Finish them before Play, or treat
each skip as an accepted risk in writing.

- [ ] Persist the Supabase session with **SecureStore**, not AsyncStorage (`src/lib/supabase.ts`)
- [ ] Cap student ID upload **size and type** in `uploadVerificationImage` (avatars/deals already use 5MB)
- [ ] Expand `src/lib/legalContent.ts` (and the hosted privacy page) for:
  - student ID photos
  - camera use (partner QR scanner)
  - push tokens / notifications
- [ ] Production EAS env: `eas.json` `build.production` already has
      `"environment": "production"`. Set `EXPO_PUBLIC_SUPABASE_URL` and
      `EXPO_PUBLIC_SUPABASE_ANON_KEY` on the **production** environment in
      the Expo dashboard so cloud builds do not depend on a laptop `.env`

---

## Blockers — QA (preview APK, real phone)

Happy path:

- [ ] Login / Google / password reset
- [ ] Student ID upload + university verification
- [ ] Online code reveal (verified student only)
- [ ] In-store ticket QR + partner scanner
- [ ] Admin verification approve/reject
- [ ] Push notification for a newly approved deal or event

Abuse (student JWT against the REST API, not only the UI):

- [ ] Cannot read another user’s object in `verification-documents`
- [ ] Cannot read another partner’s `redemption_code`
- [ ] Cannot call admin RPCs or `validate_instore_ticket`

---

## Non-blockers (after first listing)

- Firebase App Check
- Android App Links / HTTPS auth redirects (`unideals://` is OK for v1 if the allowlist is tight)
- Rotating the leaked Android API key or rewriting git history (`7ff53fc`)
- Changing Student Pass QR so it does not embed the raw auth UUID (`unideals://student/<user.id>`)

---

## How to abuse-test quickly

Use the Supabase dashboard **or** curl with a **student** access token:

```bash
# Must fail for a student
curl -H "Authorization: Bearer STUDENT_JWT" \
  -H "apikey: ANON_KEY" \
  "https://<project-ref>.supabase.co/rest/v1/deals?select=redemption_code"
```

Repeat for Storage download of `{otherUserId}/front-….jpg` and for
`rpc/list_users_with_roles`.

---

## Sign-off

| Role | Name | Date | Notes |
|---|---|---|---|
| App / Expo | | | Repo blockers + preview QA |
| Supabase | | | RLS, Storage, Edge Functions, Auth URLs |
| Firebase | | | Android key restrictions |

When this table is filled, start [PLAY_STORE.md](PLAY_STORE.md).
