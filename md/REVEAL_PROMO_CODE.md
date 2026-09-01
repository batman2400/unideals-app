# App ticket — Promo-code Reveal (Batch A3)

Website playbook: `unideals/LAUNCH_HARDENING_PLAYBOOK.md` (Batch A3).

## After this app is on the Play Store — do this

The website repo file **`supabase_reveal_deal_code_cutover.sql`** is **not**
applied yet on purpose. Apply it in the **Supabase SQL editor** only after:

1. This app (Reveal uses `reveal_online_deal_code` in `app/deal/[id].tsx`) is
   **live on Google Play** (or production EAS Update).
2. You open an **Online** deal in that store build, tap Reveal, and see a code.

Then run `unideals/supabase_reveal_deal_code_cutover.sql` once. That stops
sending student promo codes on deal load. Do **not** run it before the store
build is out, or old/local builds will show a blank online code.

Additive SQL `supabase_reveal_deal_code.sql` is already applied. Website Reveal
already uses the RPC.

---

## Why

Same leak as the website. `get_public_deal_by_id` already returns `redemption_code` for verified students. Reveal only unhides it.

Today in `app/deal/[id].tsx`:

- `OnlineRedemption` receives `code={deal.redemptionCode}` from the detail fetch.
- `handleReveal` sets `revealed` to `true` and fire-and-forgets `log_online_code_event`. It does **not** fetch the code.
- If `code` is null, the UI shows “No promo code is available for this deal yet.” **before** Reveal.

After the SQL cutover, student `get_public_deal_by_id` will return `redemption_code = NULL`. If this screen is not updated first, verified students will hit that empty state and never see a Reveal button.

---

## Ship order (do not skip)

1. Website repo: apply **additive** SQL that creates `reveal_online_deal_code` (verified + rate limits). **Do not** null `get_public_deal_by_id` yet.
2. Website: Reveal button calls that RPC (`DealDetails.jsx`).
3. **This app:** Reveal button calls the same RPC. Ship Play / App Store (or EAS update if that path is already in production).
4. Website repo: apply SQL that sets student `redemption_code` to NULL on `get_public_deal_by_id`.

If step 4 runs before step 3 is on users’ phones, old builds show a blank code.

---

## RPC contract (shared)

Name: `reveal_online_deal_code`

Argument: `target_deal_id` (`bigint`)

Behavior:

- Requires signed-in user with `user_roles.is_verified`.
- Refuses coming-soon, expired, unapproved.
- Rate limit (proposed): 15 reveals / 10 minutes and 50 / day per user.
- Inserts the `reveal` row in `online_code_events`.
- Returns the promo code (text or a one-column row — match whatever the website SQL actually returns).

Copy and “Go to store” stay on `log_online_code_event` (`copy` / `click_through`). Tighten that RPC only if the website SQL also requires `is_verified` (same SQL for both clients).

---

## Files to change

| File | What |
| --- | --- |
| `app/deal/[id].tsx` | `OnlineRedemption` — fetch code on Reveal; show Reveal even when `code` is null |
| `src/lib/useDeals.ts` | Optional: stop treating detail `redemption_code` as the student source of truth. Comment that students get the code from `reveal_online_deal_code`. |
| `src/types/database.ts` | Optional type for the reveal RPC result. `Deal.redemptionCode` may stay for partners/admins if they still use the detail RPC. |

**Do not change:**

- `app/create-deal.tsx` / `app/edit-deal/[id].tsx` — partners still read/write `deals.redemption_code` via table RLS.
- `InStoreRedemption` — already uses `generate_instore_ticket`.
- List RPC `get_public_deals()` — already has no code.

---

## UI / logic (replace current Reveal)

Keep the Reveal button for verified students on live Online deals (parent already hides this behind the verification wall).

1. Do **not** hide the whole panel when `code` is null. Null on load is expected after cutover.
2. On “Reveal promo code”:
   - set a loading state
   - `supabase.rpc("reveal_online_deal_code", { target_deal_id: dealId })`
   - on success: store the returned code in component state, set `revealed`
   - on error: show the server message (unverified, rate limit, deal ended). Do **not** reveal.
3. Do not call `log_online_code_event("reveal")` if the new RPC already logs reveal.
4. Copy / store still use local revealed code + `log_online_code_event`.

Transition (between steps 1 and 4 of ship order): Reveal RPC works even if the old fetch still includes the code. Ignore the preloaded student code; always take the code from the Reveal RPC so website and app match.

---

## Errors to handle

| Case | Student copy |
| --- | --- |
| Not verified | Same idea as the verification wall (should not reach this panel). |
| Rate limited | “Too many reveals. Try again later.” |
| Coming soon / ended | Same as existing schedule walls if they navigate in late. |
| Network / unknown | “Could not reveal this code. Try again.” |

Do not show raw Postgres traces.

---

## Test (app)

Before null-SQL:

- Unverified: still verification wall, no code in UI.
- Verified, Online: Reveal loading → code appears. Copy and store still work.
- Partner/admin edit deal: code field still loads from `deals`.

After null-SQL (device on the new build):

- Verified student: deal fetch has no code; Reveal still returns a code.
- Old APK (not updated): expect empty “No promo code” — that is why store ship comes first.

---

## Out of scope for this ticket

Website headers, OG, GA4, Clarity, blog, breadcrumbs, partner badge.

Native camera, Student Pass, in-store tickets, push, Play listing.

Force-update / minimum version gate — only needed if you must apply null-SQL before most users update. Not required if you wait for the store build.
