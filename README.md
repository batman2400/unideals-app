# Uni Deals — Mobile App

Expo (Expo Router) client for [Uni Deals](https://unideals.co), sharing the same
Supabase project, roles, and branding as the web app.

This folder is self-contained and can be lifted out into its own repository
without changes.

## Requirements

- Node.js 20 or newer
- An Expo account ([expo.dev](https://expo.dev)) for EAS cloud builds
- A **custom development build** on your phone (recommended), or Expo Go for quick UI-only checks

Native modules such as `expo-camera` and `expo-notifications` work most
reliably in a custom development client built with EAS — not Expo Go.

## Getting started

```bash
cd unideals-app
npm install
cp .env.example .env   # then fill in the values
```

### Recommended: custom development build (EAS)

One-time setup (login is interactive in your terminal):

```bash
npm install -g eas-cli   # if needed
eas login
eas build:configure      # links the project; eas.json is already present
npm run build:dev:android
```

When the cloud build finishes, install the APK from the EAS link/QR on your
Android phone. Day-to-day:

```bash
npm run start:dev-client
```

Open the Uni Deals development app on your phone — it connects to Metro like
Expo Go, but with your native modules compiled in.

### Quick local start (Expo Go)

```bash
npm start
```

### Environment

Expo only exposes variables prefixed with `EXPO_PUBLIC_` to the client bundle,
so the web app's variables map across as:

| Web (`.env.local`)       | Mobile (`.env`)                |
| ------------------------ | ------------------------------ |
| `VITE_SUPABASE_URL`      | `EXPO_PUBLIC_SUPABASE_URL`      |
| `VITE_SUPABASE_ANON_KEY` | `EXPO_PUBLIC_SUPABASE_ANON_KEY` |

The values are identical — same Supabase project, same anon key.

## Architecture

```
app/                       Expo Router file-based routes
  _layout.tsx              AuthProvider + Stack.Protected (auth / tabs / portals)
  (auth)/login.tsx         Sign in / create account
  (tabs)/_layout.tsx       Shared tabs: Home, Deals, Events, Profile
  (tabs)/index.tsx         Home — curated deals + events
  (tabs)/deals.tsx         Full searchable deals grid
  (tabs)/events.tsx        Campus events (All / Current / Coming Soon)
  (tabs)/profile.tsx       Profile + Student Pass or Open Portal card
  deal/[id].tsx            Deal detail
  event/[id].tsx           Event detail
  saved.tsx                Bookmarked deals
  edit-profile.tsx         Name, avatar, academic details
  contact.tsx              Inquiry form (writes to `inquiries`)
  help.tsx                 FAQ + email / contact shortcuts
  terms.tsx / privacy.tsx  In-app legal copy (same as the website)
  create-event.tsx         Submit event (any authenticated role)
  create-deal.tsx          Partner create deal (modal)
  edit-deal/[id].tsx       Partner edit deal (modal)
  partner/*                Partner portal (dashboard, deals, scanner, analytics, brand profile)
  admin/*                  Admin portal (moderation, content, system tools)
src/
  lib/supabase.ts          Supabase client (AsyncStorage session persistence)
  lib/pushNotifications.ts Expo token register + notification tap routing
  lib/useDeals.ts          get_public_deals() reader
  lib/useEvents.ts         Approved events reader
  lib/useAdmin*.ts         Admin overview / deals / users / events / content hooks
  context/AuthContext.tsx  session, role, verification state
  screens/ProfileScreen.tsx Shared profile body + portal card slot
  components/              Shared UI primitives
  theme/                   Design tokens ported from tailwind.config.js
  types/database.ts        Schema + RPC types
supabase_push_notifications.sql  `push_tokens` table + token RPCs
supabase/functions/notify-students  Expo push sender (new deal / approved event)
```

### Auth and roles

`AuthContext` merges the two pieces the web app keeps apart — session bootstrap
(`src/App.jsx`) and role resolution (`src/lib/useRole.js`):

1. `get_user_role()` RPC is the authoritative role source.
2. `public.user_roles` supplies `is_verified` and acts as the fallback role
   source when the RPC fails.
3. A realtime subscription on the caller's `user_roles` row picks up role or
   verification changes mid-session.

Roles are `student`, `partner`, and `admin`, defaulting to `student`.

### Navigation

Root layout uses nested `Stack.Protected`: unauthenticated users stay in
`(auth)`; authenticated users get shared tabs plus deal/event routes. Partner
and admin portal stacks are role-guarded. Opening a portal from Profile pushes
a full-screen stack (no bottom tabs). Event submission is open to every signed-in
role via the Events tab; admins moderate events in-portal and do not get a
separate Create Event menu item.

### Deals

The feed reads the `get_public_deals()` RPC, which returns only `approved`
deals and deliberately omits `redemption_code`. Codes and in-store tickets are
issued per-deal through `get_public_deal_by_id()` and
`generate_instore_ticket()`. Partners manage their catalogue under
`/partner/deals` (create/edit/delete).

### Scanner

Partners open the scanner from the Partner Portal hero action
(`/partner/scanner`). It reads `unideals://ticket/<code>` QR codes with
`expo-camera`, or accepts a typed `UD-XXXXXX` code, and validates both through
`validate_instore_ticket()`.

### Push notifications (new deals and events)

Students with a physical device and notification permission get an Expo push
when a deal is published (`status = approved`, including Coming Soon) or an
event is approved by an admin. Partners and admins are not notified. Tapping
the alert opens `/deal/[id]` or `/event/[id]`.

Publishing from the mobile app or the website both fire alerts — sending is
a Database Webhook, not the client.

#### 1. Database

Run [`supabase_push_notifications.sql`](supabase_push_notifications.sql) in the
Supabase SQL editor (same shared project as the web app).

#### 2. Edge Function

From this repo (after `supabase login` and `supabase link`):

```bash
supabase functions deploy notify-students
```

The function refuses anything except the **service role** JWT so the public
anon key cannot send blasts.

#### 3. Database Webhooks

In Supabase: **Database → Webhooks → Create a new hook**. Create **two** hooks
pointing at the same URL:

`https://<YOUR-PROJECT-REF>.supabase.co/functions/v1/notify-students`

| Hook | Table | Events | HTTP |
| ---- | ----- | ------ | ---- |
| Notify students (deals) | `public.deals` | Insert, Update | POST |
| Notify students (events) | `public.events` | Insert, Update | POST |

HTTP headers:

- `Content-Type`: `application/json`
- `Authorization`: `Bearer <SUPABASE_SERVICE_ROLE_KEY>`

The function ignores rows that are not **newly** `approved` (pending event
submits, pause/edit of an already-live deal, etc.).

#### 4. Native rebuild and EAS credentials

`expo-notifications` is a native module. Rebuild the development client after
this change:

```bash
npm run build:dev:android
```

In [Expo credentials](https://expo.dev/accounts/uvaram2004/projects/unideals-app/credentials):

- **Android:** two Firebase files, both required:
  1. Download `google-services.json` from Firebase (Project settings → Your apps → Android `co.unideals.app`) and save it as `google-services.json` in this folder. `app.json` already points at it via `android.googleServicesFile`.
  2. Upload the FCM V1 **service account** key in Expo credentials (that one is for Expo to *send* the push).
- **iOS:** let EAS manage the APNs key, or upload your own.

Push tokens are only issued on a **physical device** in a custom build — not
simulators, and not Expo Go for this project.

### Deal detail & verification

- `/deal/[id]` — online code reveal (`log_online_code_event`) and in-store
  ticket QR (`generate_instore_ticket`, 10-minute expiry, realtime redeem).
- Profile — students get university OTP / manual verification; partners and
  admins get an Open Portal card instead of the Student Pass.

### Portals

- **Partner:** dashboard stats, My Deals CRUD, scanner, analytics
  (`get_partner_deal_stats`).
- **Admin:** dashboard overview, verifications, all deals, users, events /
  pending events, inquiries, blog manager, brands, analytics (including recent
  scan activity).
## Branding

Tokens live in `src/theme/index.ts` and mirror the web app's Material palette.

| Token             | Hex       |
| ----------------- | --------- |
| Primary           | `#29695b` |
| Primary container | `#afefdd` |
| On primary        | `#defff4` |
| Background        | `#fcf9f8` |
| On background     | `#323233` |
| Error             | `#9f403d` |

## Deep links / password reset / Google sign-in

Password-reset emails redirect to `unideals://reset-password`. Google sign-in
returns to `unideals://auth/callback`. Add **all** of these under
**Authentication → URL Configuration → Redirect URLs** in the Supabase dashboard:

- `https://www.unideals.co/auth/callback`
- `https://unideals.co/auth/callback`
- `http://localhost:5173/auth/callback` (web local)
- `unideals://auth/callback`
- `unideals://reset-password`
- `exp://**` (Expo Go during development)

### Enable Google in Supabase

1. In [Google Cloud Console](https://console.cloud.google.com/auth/clients) create
   an OAuth client of type **Web application**.
2. Authorized JavaScript origins: `https://www.unideals.co`,
   `https://unideals.co`, `http://localhost:5173`.
3. Authorized redirect URI:
   `https://<YOUR-PROJECT-REF>.supabase.co/auth/v1/callback`
   (copy this from **Authentication → Providers → Google** in Supabase).
4. Paste the Client ID and Client Secret into that Google provider page and
   enable it.

## Still web-first / not ported

- Student-facing blog reader (website only — admin Blog Manager still publishes to the site)
- Public brand directory
- Admin brand impersonation (website only — ops tool for scanning/editing as a specific brand)
