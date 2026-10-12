# Uni Deals — Apple App Store plan

Companion to [PLAY_STORE.md](PLAY_STORE.md). Finish the Play launch first
(steps 13–16 in [REMAINING_WORK.md](REMAINING_WORK.md)); this plan reuses the
same backend, legal pages, delete-account flow, and listing copy.

Expo app `unideals-app`. Bundle ID **`co.unideals.app`** (locked once the App
Store Connect record exists — do not change). Expo owner: `uvaram2004`.
Website: https://unideals.co Support: unideals.lk@gmail.com

No Mac is required: EAS builds and signs in the cloud, EAS Submit uploads to
App Store Connect. You **do** need a physical iPhone for TestFlight QA (iOS
simulator builds only run on a Mac).

---

## Outcome

Students can find **Uni Deals** on the App Store (Sri Lanka), install it,
sign in, verify, redeem deals, and receive push notifications. Partners can
scan QR tickets on an iPhone.

---

## Status today (audited from the repo)

| Item | Status |
|---|---|
| Bundle ID `co.unideals.app` in `app.json` | Done |
| App icon `assets/icon.png` 1024×1024, RGB, no alpha | Done (Apple requires no transparency) |
| Camera purpose string (`NSCameraUsageDescription`) | Done — specific, matches scanner use |
| Photo library purpose string | Done via `expo-image-picker` plugin |
| **Microphone purpose string** | Done — `microphonePermission: false` on `expo-camera` and `expo-image-picker` |
| **Face ID purpose string** | Done — `expo-secure-store` `faceIDPermission: false`. The app stores the session in Keychain and never prompts for Face ID |
| **iPad** | Done — `supportsTablet: false` (iPhone only; no iPad screenshot set) |
| **Export compliance** | Done — `ios.config.usesNonExemptEncryption: false` |
| **Google sign-in** | Done for v1 (Option B) — hidden on iOS in `app/(auth)/login.tsx`. Android and web still show it. Help FAQ explains Forgot password for Google-created accounts |
| Email/password login, reset via `unideals://reset-password` | Works on iOS (same custom scheme) |
| In-app delete account (`src/lib/deleteAccount.ts`) + public `/delete-account` page | Done — satisfies 5.1.1(v) |
| Session in Keychain (`src/lib/secureAuthStorage.ts`, chunked) | Done. Session + push Keychain calls go through `src/lib/keychainLock.ts` so they cannot overlap |
| Push: `upsert_own_push_token` accepts `ios`; `notify-students` sends via Expo push (platform-agnostic) | Code ready. **Needs an APNs key** in Expo credentials |
| iOS-specific UI paths (glass tab bar, `DateTimeField`, keyboard avoiding, `admin/pending-events`) | Coded. TestFlight 1.0.0 (5) reached a real iPhone; Events-tab crash is the Keychain overlap below |
| Third-party privacy manifests (`PrivacyInfo.xcprivacy`) | Shipped by RN / Expo / AsyncStorage pods; EAS aggregates them |
| `eas.json` iOS submit profile | Done — Team ID `WW88LS36YD`, App Store Connect app ID `6818631055` |
| No ads, no analytics SDK, no tracking, no in-app purchases | Good — no App Tracking Transparency prompt, no IAP setup |
| Legal copy (`src/lib/legalContent.ts`, website pages) | Platform-neutral — no Android-only wording to fix |

---

## Timeline

| Step | Time |
|---|---|
| Apple Developer enrollment — Individual | 1–2 days |
| Apple Developer enrollment — Organization (needs D-U-N-S number) | 1–3 weeks |
| Code changes (Phase 2) | 1–2 days (Option B) / 3–5 days (Option A) |
| First iOS build + TestFlight internal QA | 2–4 days |
| App Review per submission | Usually 24–48 h; longer after a rejection |
| **Typical first listing** | **1–3 weeks** after enrollment is approved |

Unlike Play, Apple has **no** mandatory 14-day closed-testing period.

---

## Phase 0 — Prerequisites

- [ ] Play launch done (or at least the Play AAB is in review) so shared backend work is frozen
- [ ] A physical iPhone on a current iOS version for TestFlight QA
- [x] Seller students will see: **Uvaram Mohanaram** (Individual)
- [x] Apple ID with **two-factor authentication** enabled (required for enrollment and for `eas` to log in)

---

## Phase 1 — Apple Developer Program

- [x] Enroll at https://developer.apple.com/programs/enroll/ (US$99/year, auto-renews — if it lapses the app is removed from sale)
- [x] Enrollment approved
- [x] App Store Connect → **Business**: **Free Apps** agreement is Active (Sep 29, 2026 – Sep 30, 2027). Leave the Paid Apps agreement unsigned. Sri Lanka only for v1, so the EU trader form can wait.
- [x] Team ID: `WW88LS36YD` (in `eas.json` → `submit.production.ios.appleTeamId`)
- [ ] (Recommended) App Store Connect → Users and Access → Integrations → **App Store Connect API key** with *App Manager* role. Download the `.p8` once, store **outside git** (`*.p8` is already gitignored). Lets `eas submit` run without Apple ID 2FA prompts
- [ ] (Optional) Invite a second person as Admin so you are not locked out

---

## Phase 2 — Code and config changes (this repo)

### 2.1 Sign-in decision (required — pick one)

**Option B — hide Google on iOS for v1 (chosen)**

- [x] Render `GoogleSignInButton` / `AuthDivider` in `app/(auth)/login.tsx` only when `Platform.OS !== "ios"`
- Result: 4.8 no longer applies, no Safari hand-off, **no new native modules**, so iOS and Android stay on the same runtime `1.0.0` and OTA updates keep reaching both
- Trade-off: students who signed up with Google on Android/web must use **Forgot password** once on iPhone to set a password for the same email. Verify this works on a Google-only test account before submitting. Mentioned in Help FAQ and `app-store/listing-copy.txt`

**Option A — keep Google, add Sign in with Apple**

- [ ] Add `expo-apple-authentication`; set `ios.usesAppleSignIn: true` in `app.json` (adds the capability)
- [ ] Native Apple button on the login screen (Apple's button style; at least as prominent as Google)
- [ ] Sign in with `supabase.auth.signInWithIdToken({ provider: "apple", token, nonce })`
- [ ] Supabase Dashboard → Auth → Providers → **Apple**: enable, client ID `co.unideals.app`
- [ ] Handle "Hide My Email" relay addresses (`@privaterelay.appleid.com`) — student verification must still work via university email / ID upload, not the login email
- [ ] Apple only returns the user's name on the **first** sign-in — save it to the profile then
- [ ] **Account deletion must revoke the Apple token** (Apple requirement): extend `../unideals/supabase/functions/delete-account/index.ts` to call Apple's `/auth/revoke` for users with an Apple identity (needs a Sign in with Apple key `.p8` + Team ID + Key ID as Edge Function secrets — never in Expo env)
- [ ] Switch Google on iOS from `Linking.openURL` to `expo-web-browser` `openAuthSessionAsync` (in-app auth sheet) in `src/lib/googleAuth.ts`
- [ ] Both new packages are native modules: bump `expo.version` to **1.1.0** before the iOS build and rebuild Android too. OTA updates published from 1.1.0 will **not** reach Android 1.0.0 installs (`runtimeVersion.policy = appVersion`), and JS importing these modules must never be OTA'd to a 1.0.0 binary

### 2.2 `app.json`

- [x] Disable the unused microphone permission in both plugins:

  ```json
  ["expo-camera", {
    "cameraPermission": "Uni Deals uses the camera so partner staff can scan student redemption QR codes at the register.",
    "microphonePermission": false,
    "recordAudioAndroid": false
  }],
  ["expo-image-picker", {
    "photosPermission": "Uni Deals needs photo access so students can upload ID proof for verification.",
    "microphonePermission": false
  }]
  ```

  Do **not** set `cameraPermission: false` on `expo-image-picker` — it would block the Android `CAMERA` permission the scanner needs.
- [x] iPhone only for v1: `"ios": { "supportsTablet": false }` (removes the iPad screenshot requirement and iPad review; app still runs on iPad in compatibility mode)
- [x] Export compliance (app only uses HTTPS / OS crypto): `"ios": { "config": { "usesNonExemptEncryption": false } }`
- [x] Disable unused Face ID purpose string: `"expo-secure-store": { "faceIDPermission": false }`
- [ ] Keep `userInterfaceStyle: "light"` (no dark mode — fine)
- [ ] Optional: `"ios": { "privacyManifests": { ... } }` only if Apple's processing email reports **ITMS-91053** (missing required-reason API). Typical entry for this stack: `NSPrivacyAccessedAPICategoryUserDefaults` with reason `CA92.1`

### 2.3 `eas.json`

- [x] Add an iOS submit profile with Team ID `WW88LS36YD` and App Store Connect app ID `6818631055`.

  ```json
  "submit": {
    "production": {
      "android": { "track": "internal", "releaseStatus": "draft" },
      "ios": {
        "appleTeamId": "WW88LS36YD"
      }
    }
  }
  ```

  If you created the API key, either pass it when `eas submit` asks or set `ascApiKeyPath`, `ascApiKeyIssuerId`, `ascApiKeyId` (path outside git).
- [ ] `build.production` already works for iOS (store distribution is the default; `autoIncrement` + `appVersionSource: remote` manage `buildNumber`)

### 2.4 Copy and docs

- [x] `play-store/listing-copy.txt` → create `app-store/listing-copy.txt` (fields differ, see Phase 4)
- [x] `src/lib/legalContent.ts`: mention Apple Push Notification service next to Google/Firebase as processors. Website privacy page still needs the same sentence (that copy lives in the website repo)
- [x] Update [LAUNCH.md](LAUNCH.md) / [REMAINING_WORK.md](REMAINING_WORK.md): both currently say "ignore iOS"

### 2.5 Verify

- [x] `npm run typecheck`
- [x] `npx expo config --type introspect` and check the generated `ios.infoPlist`: camera + photo strings present, **no** `NSMicrophoneUsageDescription`, `ITSAppUsesNonExemptEncryption = false`
- [x] Commit before building (EAS builds the committed tree). Includes the Keychain lock (`src/lib/keychainLock.ts`) that serializes session SecureStore and `expo-notifications` Keychain reads. TestFlight 1.0.0 (5) crashed on iOS 26 when those overlapped (`EXC_BAD_ACCESS` in `SecItemCopyMatching` / `ServerRegistrationModule.getInstallationIdFromKeychain`, tester note: Events tab).

---

## Phase 3 — App Store Connect record

App Store Connect → Apps → **+ New App**:

- [ ] Platform iOS · Name **Uni Deals** (must be unique on the whole App Store — create the record early to reserve it; fall back to e.g. "Uni Deals – Student Offers") · Primary language English (U.K. or U.S.) · Bundle ID `co.unideals.app` (appears after the first `eas build` registers it, or register it manually under Certificates, Identifiers & Profiles) · SKU `unideals-ios-001` · User access Full
- [ ] Copy the **Apple ID** of the app (numeric) into `eas.json` → `ascAppId`
- [ ] **Pricing and Availability:** Free · Availability **Sri Lanka only** for v1 (add countries later)
  - Not distributing in the EU means no Digital Services Act trader-status contact details are published
- [ ] **App Information:** Category **Lifestyle** (secondary: Shopping) · Content rights: confirm you have rights to partner logos/offers shown
- [ ] **Age Rating** questionnaire: answer honestly (no violence, gambling, mature content, unrestricted web browsing; users can contact support / partners publish offers). Expected result **13+** to match Play and the privacy policy. Do **not** select Kids Category
- [ ] **App Privacy** — privacy policy URL `https://unideals.co/privacy`, then the nutrition label (all "Linked to the user", **not** used for tracking):

  | Apple category | Data | Purpose |
  |---|---|---|
  | Contact Info | Name, Email address | App Functionality |
  | User Content | Photos (student ID), Customer support (inquiries), Other user content (partner deals) | App Functionality |
  | Identifiers | User ID | App Functionality |
  | Identifiers | Device ID (Expo/APNs push token) — conservative declaration | App Functionality |
  | Other Data | University / student status, student type | App Functionality |

  No Usage Data / Diagnostics unless you add Sentry or analytics later (update the label then). Data is not sold; no third-party advertising.

---

## Phase 4 — Listing metadata and assets

Draft into `app-store/listing-copy.txt`:

| Field | Limit | Value |
|---|---|---|
| Name | 30 | Uni Deals |
| Subtitle | 30 | Student discounts in Sri Lanka |
| Promotional text | 170 | Editable anytime without review |
| Description | 4000 | Reuse Play full description; no mention of Android/Google Play |
| Keywords | 100, comma-separated, no spaces | student,discount,deals,university,campus,offers,sri lanka,promo code,coupons |
| Support URL | required | https://unideals.co (must show contact info: unideals.lk@gmail.com) |
| Marketing URL | optional | https://unideals.co |
| Privacy Policy URL | required | https://unideals.co/privacy |
| Copyright | required | `2026 <seller legal name>` |
| What's New | per version | Not shown for 1.0 |

### Screenshots

- [ ] **iPhone 6.9"** set (1320×2868 or 1290×2796 portrait), 3–10 images. Apple scales these down for smaller iPhones
- [ ] Capture from the **TestFlight build on an iPhone** (Side button + Volume up). Use a 6.9"/6.7" device if possible; otherwise frame/upscale carefully — wrong dimensions are rejected at upload
- [ ] **Do not reuse Android emulator screenshots** (Android status bar/navigation = rejection under 2.3.3)
- [ ] Suggested set: Home, Deals list, Deal with Reveal code, In-store QR ticket, Student Pass / verification, Partner scanner
- [ ] No placeholder data, no other platforms' devices, no prices that are not real offers
- [ ] iPad 13" screenshots only if you keep `supportsTablet: true`
- [ ] App preview video: optional, skip for v1

---

## Phase 5 — Credentials and push (EAS)

- [ ] `npx eas-cli login` as `uvaram2004`
- [ ] First `npx eas-cli build --profile production --platform ios` — sign in with the Apple ID when asked and let EAS:
  - register Bundle ID `co.unideals.app` (with Push Notifications capability from `expo-notifications`, and Sign in with Apple if Option A)
  - create the **Distribution Certificate** and **App Store provisioning profile**
  - create the **Apple Push Notifications key (APNs .p8)** — say **yes**; without it iOS push silently never arrives
- [ ] Confirm at https://expo.dev/accounts/uvaram2004/projects/unideals-app/credentials?platform=ios that the push key is attached
- [ ] Firebase: **nothing to add** for iOS. Push goes Expo → APNs directly; there is no Firebase iOS SDK, so no `GoogleService-Info.plist` (it stays gitignored)
- [ ] Supabase Auth redirect allowlist: `unideals://auth/callback` and `unideals://reset-password` already cover iOS (same scheme). Add nothing else

---

## Phase 6 — Build and TestFlight

### Build

```bash
npx eas-cli build --profile production --platform ios
```

(`npm run build:production` builds iOS **and** a new Android AAB — use the
explicit `--platform ios` unless you also want a new Android build.)

### Upload

```bash
npx eas-cli submit --platform ios --profile production --latest
```

- [ ] Wait for the "processing complete" email (10–60 min). Fix any **ITMS-** warnings in it before review (missing purpose strings, privacy manifest, icon alpha)
- [ ] App Store Connect → TestFlight: answer export compliance if prompted (should be skipped thanks to `usesNonExemptEncryption: false`)
- [ ] Add yourself and the team as **Internal testers** (up to 100 App Store Connect users, no review)
- [ ] Install the **TestFlight** app on the iPhone → install Uni Deals
- [ ] (Optional) External testers (students, partners): requires a short Beta App Review, needs a "What to Test" note and beta contact email

---

## Phase 7 — iPhone QA (TestFlight build, not Expo Go)

**Student**

- [ ] Cold start, splash, glass floating tab bar renders (iOS 26) and falls back to blur on older iOS
- [ ] Sign up email/password, sign in, sign out, sign in again
- [ ] Forgot password → email link opens the app at `reset-password` → new password works
- [ ] Option A: Sign in with Apple (incl. "Hide My Email"), Google via in-app sheet returns to the app. Option B: no Google button visible; a Google-created account can reset password and sign in
- [ ] Notification permission prompt appears once after student login; deny → app still works; allow → token row with `platform = 'ios'` in `push_tokens`
- [ ] Push arrives from `notify-students` (new deal/event) with the app in background **and** killed; tapping opens the app
- [ ] Verification: OTP email, ID upload via photo picker including iOS **"Select Photos…" (limited access)** mode; size/type cap rejects a large file
- [ ] Browse deals, events, search, saved; Online **Reveal** code; copy to clipboard; external store link opens Safari
- [ ] In-store QR ticket renders and is scannable
- [ ] Student Pass
- [ ] Date picker (iOS spinner branch in `DateTimeField`) on any form that uses it
- [ ] Keyboard does not cover inputs on login, contact, search, edit profile
- [ ] Safe areas on a notch / Dynamic Island device and on a small iPhone (SE size)
- [ ] Privacy, Terms, Help (mailto opens Mail) open
- [ ] **Delete account** from Profile → signed out → cannot sign in again → (Option A) Apple token revoked
- [ ] Delete the app and reinstall: Keychain survives uninstall on iOS, so confirm the app either restores a valid session or cleanly lands on login (no crash / half-signed-in state)

**Partner**

- [ ] Camera permission prompt shows the scanner text; deny → clear message; allow → scanner reads a student QR
- [ ] Create/edit deal with image upload, brand screen, analytics

**Admin**

- [ ] Approve/reject verification, pending events (iOS branch), signed URL for ID images opens

**General**

- [ ] Airplane mode / slow network shows errors, no infinite spinners
- [ ] No red-box / crash in Expo dashboard or TestFlight crash reports
- [ ] OTA: `npm run update:production` after the iOS build reaches the TestFlight install on next launch (same runtime version)

---

## Phase 8 — Submit for review

App Store Connect → the 1.0 version page:

- [ ] Attach the tested build
- [ ] **App Review Information:**
  - Sign-in required: **yes**
  - Demo account: a **pre-verified student** (email + password) — reviewers cannot receive the university OTP
  - In **Notes**: a **partner** login + steps to see the scanner (e.g. "Partner login → Scanner; scan the QR shown in the student account → Tickets"), plus a sample live Online deal to test Reveal
  - Explain the audience: "Uni Deals is for verified students in Sri Lanka. Login is required because every offer is tied to the student's verified status and single-use codes."
  - Contact name, phone, email for the reviewer
- [ ] Make sure the demo accounts **stay** verified and have live deals during review (yearly verification SQL must not expire them)
- [ ] Version release: **Manually release** for v1 (so you control the launch moment) or automatic
- [ ] Optional: **Phased release** (7-day rollout) — only applies to updates, not the first version
- [ ] **Add for Review → Submit**

### Likely rejection reasons for this app (pre-empt them)

| Guideline | Risk | Prevention |
|---|---|---|
| 4.8 Login services | Google sign-in without Sign in with Apple | Option A or B in 2.1 |
| 4.0 Design | Login bounces to the Safari app | Option B, or `openAuthSessionAsync` in Option A |
| 5.1.1(i) Purpose strings | Generic microphone string | `microphonePermission: false` in both plugins |
| 2.1 App completeness | Reviewer cannot get past verification, no live deals, crash | Pre-verified demo accounts, live deals, TestFlight QA |
| 5.1.1(v) Account sign-in | "App requires login to see basic content" | Review note above. If still rejected: add read-only guest browsing of deals (codes/QR stay behind verification) |
| 5.1.1(v) Account deletion | Must be in-app | Already done |
| 2.3.3 Screenshots | Android UI or non-app screens | iPhone captures only |
| 2.3.10 | Mentions of Android / Google Play in metadata | Check description, screenshots, promo text |
| 1.2 User-generated content | Partner offers/inquiries seen as UGC | Partners are vetted by admin; mention admin moderation and report contact in notes if asked |
| 3.1.1 IAP | Selling digital goods | N/A — free, deals redeem physical goods/services with external merchants |

Rejections arrive in **App Review** (Resolution Center). Reply there for
misunderstandings; for real fixes, JS-only changes can ship as OTA **after**
approval, but the reviewed binary must already behave correctly — upload a
new build (`autoIncrement` bumps `buildNumber`) and resubmit.

---

## Phase 9 — Release and after launch

- [ ] Status "Pending Developer Release" → **Release This Version**
- [ ] Listing live in Sri Lanka within ~24 h; search indexing can take a few days. Share the direct link `https://apps.apple.com/lk/app/id<ascAppId>`
- [ ] Add the App Store badge/link on unideals.co next to the Play badge
- [ ] If the Reveal cutover SQL ([md/REVEAL_PROMO_CODE.md](md/REVEAL_PROMO_CODE.md)) is already applied after Play, confirm Reveal works on the App Store install too
- [ ] Watch TestFlight/App Store crash reports and Expo update adoption for the first week
- [ ] Renew the Apple Developer membership yearly; APNs key does not expire, distribution certificate does (EAS renews on next build)

### Shipping updates

| Change | Ship how |
|---|---|
| JS/UI, copy, most bugs | `npm run update:production` — reaches iOS and Android builds with the same `expo.version` |
| New native module, permission, Expo SDK, `app.json` native config | Bump `expo.version`, `eas build --platform ios`, `eas submit`, new App Store version + review |
| Metadata, screenshots, promotional text | App Store Connect (promotional text without review; others with the next version) |

Apple allows OTA JS updates only for bug fixes/improvements that do not change
the app's primary purpose (guideline 3.3.1 / 2.5.2). New features of
significance should go through a new reviewed build.

---

## Command cheat sheet

```bash
# iOS store build
npx eas-cli build --profile production --platform ios

# Upload latest iOS build to App Store Connect / TestFlight
npx eas-cli submit --platform ios --profile production --latest

# Inspect / repair iOS signing and push credentials
npx eas-cli credentials --platform ios

# Check the generated Info.plist before building
npx expo config --type introspect

# JS-only fix for installed store apps (iOS + Android, same version)
npm run update:production
```

Expo iOS credentials:
https://expo.dev/accounts/uvaram2004/projects/unideals-app/credentials?platform=ios

App Store Connect: https://appstoreconnect.apple.com
Review guidelines: https://developer.apple.com/app-store/review/guidelines/

---

## Out of scope for iOS v1

- iPad-optimized layout (`supportsTablet: false`)
- Dark mode, Sinhala, blog reader (same as Play v1)
- Universal Links (custom `unideals://` scheme is enough for auth)
- Home-screen widgets, Apple Wallet pass for Student Pass (good v2 idea)
- Countries other than Sri Lanka
