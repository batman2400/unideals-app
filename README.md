# Uni Deals — Mobile App

Expo (Expo Router) client for [Uni Deals](https://unideals.co), sharing the same
Supabase project, roles, and branding as the web app.

This folder is self-contained and can be lifted out into its own repository
without changes.

## Requirements

- Node.js 20 or newer
- The Expo Go app, or a development build, on a phone or simulator

## Getting started

```bash
cd unideals-app
npm install
cp .env.example .env   # then fill in the values
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
  _layout.tsx              AuthProvider + navigation guard
  (auth)/login.tsx         Sign in / create account
  (tabs)/_layout.tsx       Bottom tab bar (Scan tab is partner-only)
  (tabs)/index.tsx         Explore Deals feed
  (tabs)/scanner.tsx       Partner QR ticket scanner
  (tabs)/profile.tsx       Profile + Digital Student Pass
src/
  lib/supabase.ts          Supabase client (AsyncStorage session persistence)
  lib/useDeals.ts          get_public_deals() reader
  context/AuthContext.tsx  session, role, verification state
  components/              Shared UI primitives
  theme/                   Design tokens ported from tailwind.config.js
  types/database.ts        Schema + RPC types
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

### Navigation guard

The root layout redirects unauthenticated users to `/login` and pushes
authenticated users out of the `(auth)` group back to `/`. The splash screen
stays up until the first session and role resolution finishes, so the app never
flashes the login screen for a user who is already signed in.

### Deals

The feed reads the `get_public_deals()` RPC, which returns only `approved`
deals and deliberately omits `redemption_code`. Codes and in-store tickets are
issued per-deal through `get_public_deal_by_id()` and
`generate_instore_ticket()`.

### Scanner

Partner accounts get a Scan tab that reads `unideals://ticket/<code>` QR codes
with `expo-camera`, or accepts a typed `UD-XXXXXX` code, and validates both
through the `validate_instore_ticket()` RPC. Students and admins never see the
tab (admin scanning still requires brand impersonation on the web).

### Deal detail & verification

- `/deal/[id]` — online code reveal (`log_online_code_event`) and in-store
  ticket QR (`generate_instore_ticket`, 10-minute expiry, realtime redeem).
- Profile — university OTP via `send-verification-otp` +
  `confirm_university_verification`, plus manual ID upload to
  `verification-documents` / `submit_manual_verification`.

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

## Deep links / password reset

Password-reset emails redirect to `unideals://reset-password` (via
`Linking.createURL('reset-password')`). Add that exact redirect URL (and your
Expo Go `exp://…` URL during development) under **Authentication → URL
Configuration → Redirect URLs** in the Supabase dashboard.

## Still web-first / not ported

- Saved deals, categories, and brand directory
- Profile editing / avatar upload
- Events hub, blog, support
- Partner deal CRUD / analytics and full admin panel
