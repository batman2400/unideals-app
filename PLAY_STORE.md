# Uni Deals — Google Play Store plan

**Do not start Phase 1 (Play account, listing, or production AAB) until every
Blocker in [SECURITY.md](SECURITY.md) is checked off.**

Expo app `unideals-app`. Package **`co.unideals.app`** (locked on first Play
upload — do not change). Expo owner: `uvaram2004`. Firebase: `unideals-6d728`.
Website: https://unideals.co Support: unideals.lk@gmail.com

This is **Android on Google Play only**. Preview APKs and OTA updates do not
publish the app to the store.

---

## Outcome

Students can find **Uni Deals** on Play, install it, sign in, verify, redeem
deals, and receive push notifications.

The store binary is a **production App Bundle (`.aab`)**, not a preview APK.

---

## What this repo already has

| Item | Status |
|---|---|
| Package name | `co.unideals.app` |
| App name | Uni Deals |
| User-facing version | `0.1.0` in `app.json` — bump to `1.0.0` before the first store build |
| Version code | EAS remote (`appVersionSource: "remote"` + `autoIncrement`) |
| Production profile | `eas.json` → `production` (AAB, channel `production`) |
| Submit profile | `eas.json` → `submit.production` |
| Preview profile | Internal APK only — **do not upload to Play** |
| Firebase Android config | Local `google-services.json` (gitignored; EAS uploads via `.easignore`) |
| FCM send key | Expo credentials — never commit `*firebase-adminsdk*.json` |
| Android API key | Restricted to `co.unideals.app` + EAS SHA-1. **Add Play app-signing SHA-1 after first AAB** |
| In-app privacy / terms | `/privacy` and `/terms` — Play also needs a **public https URL** |
| OTA | `runtimeVersion.policy = appVersion` — JS updates only while native version stays the same |

---

## Timeline

| Path | Time |
|---|---|
| Technical work (listing, AAB, internal test) | 2–4 days |
| Play identity verification | 1–7 days |
| Play review per submission | 1–7 days (longer after a rejection) |
| **If closed testing is required** (~12 opted-in testers for 14 consecutive days) | **+2 weeks** |
| **Typical first listing** | **2–4 weeks** |
| **If closed testing is required** | **4–6 weeks** |

Check **Play Console → Publishing overview** after the app exists. That screen
tells you whether production is blocked until closed testing is done.

Pay the $25 and start identity verification **in parallel** with finishing
SECURITY.md QA. Do not promise a public date until you know if the 14-day
tester rule applies.

---

## Accounts — they do not have to be the same Gmail

| Account | Role |
|---|---|
| Google Play developer | Paid $25. Legal publisher students see. |
| Firebase / Google Cloud (`unideals-6d728`) | Android API key, `google-services.json`, FCM |
| Expo (`uvaram2004`) | EAS builds, credentials, OTA |

Same Gmail is simplest for a solo launch. Different Gmails are fine: invite
the Play account on the Firebase project, and invite the Expo/Firebase account
on Play Console as Release manager.

Do **not** create a second Firebase project to match the Play Gmail.

---

## Phase 0 — Security gate

- [ ] Every **Blocker** in [SECURITY.md](SECURITY.md) is done and signed off
- [ ] Preview APK works on real Android phones (not only Expo Go)
- [ ] You accept package name `co.unideals.app` forever

Pay the Play fee **now** if you want the store in the next few weeks **and**
Phase 0 is complete (or will be before review). Skip the fee if you are still
only circulating EAS preview links.

---

## Phase 1 — Google Play developer account

1. Open [Google Play Console](https://play.google.com/console) with the publisher Gmail.
2. Register as a developer (~US$25 **one-time**, not yearly).
3. Complete identity verification. Wait until the account is approved.
4. **Create app**
   - Name: Uni Deals
   - Default language: English (add Sinhala later if needed)
   - Type: App
   - Free
5. Confirm later uploads use application id `co.unideals.app`.

---

## Phase 2 — Store listing and policy

Play will not send the app to review until these are complete. Track them
under **Grow → Store presence** and **Policy → App content**.

### 2.1 Public legal pages

Host the same copy as `src/lib/legalContent.ts` (after the SECURITY.md privacy
updates) at:

- `https://unideals.co/privacy` (or `/privacy-policy`)
- `https://unideals.co/terms`

Must open in a browser **without** installing the app. Contact:
`unideals.lk@gmail.com`. In-app `/privacy` is **not** enough for Play.

### 2.2 Store listing assets

| Asset | Spec |
|---|---|
| App icon | 512×512 PNG, 32-bit, **no transparency** |
| Feature graphic | 1024×500 PNG (not in the repo yet — design this) |
| Phone screenshots | At least 2; ~1080×1920. Capture Home, Deals, a deal, Student Pass / verify |
| Short description | ≤ 80 characters |
| Full description | Verified student discounts in Sri Lanka; partner offers; in-store QR; student verification |
| Contact email | unideals.lk@gmail.com |
| Privacy policy URL | Public https page from 2.1 |

Suggested short description:

`Verified student discounts at Sri Lankan partners. Codes online, QR in store.`

### 2.3 App content questionnaires

- [ ] Privacy policy URL
- [ ] Data safety (table below)
- [ ] Content rating (IARC)
- [ ] Target audience — be honest if under-18 university students are allowed
- [ ] News / financial / health — no, unless you add those features
- [ ] App access — student test login (and partner if they test the scanner)
- [ ] Ads — declare if you show ads
- [ ] Government / political — no

### 2.4 Data safety (declare what the app actually does)

| Data | Collected? | Purpose | Notes |
|---|---|---|---|
| Email, name | Yes | Account | Supabase Auth |
| University / student status | Yes | App functionality | Verification |
| Photos (student ID) | Yes | App functionality | Image picker; not sold |
| Device IDs / push token | Yes | Notifications | Expo + FCM |
| User-generated content | Partner deals, inquiries | App functionality | |

- Data is **not sold**
- Used for app functionality, account, fraud prevention
- Processors: Supabase, Firebase/Google, Expo

### 2.5 Permission justifications (must match the in-app prompt)

| Permission | Why |
|---|---|
| Camera | Partner staff scan student redemption QR codes at the register |
| Photos / media | Students upload ID proof for verification |
| Notifications | Deal and event alerts |

Do not write “to improve experience.” Play rejects vague camera/photo use.

### 2.6 Countries

Start with **Sri Lanka**. Add others only if you support them.

---

## Phase 3 — Firebase / signing keys (Play-specific)

Preview APKs are signed with the **EAS upload keystore**.
Play Store installs are re-signed with **Google Play App Signing**. That SHA-1
is different.

### Before the first AAB

- [ ] `google-services.json` exists locally (Firebase → Project settings → Android `co.unideals.app`)
- [ ] FCM V1 service account is in [Expo credentials](https://expo.dev/accounts/uvaram2004/projects/unideals-app/credentials)
- [ ] Android API key already has package `co.unideals.app` + **EAS SHA-1**

### After the first AAB is on Play (internal track is enough)

1. Play Console → **Test and release → App integrity** (App signing)
2. Copy **App signing key certificate** SHA-1 (not only Upload key SHA-1)
3. [Google Cloud credentials](https://console.cloud.google.com/apis/credentials?project=unideals-6d728) → **Android key (auto created by Firebase)**
4. Application restrictions = Android apps → **Add Android app**
   - Package: `co.unideals.app`
   - SHA-1: Play **app signing** fingerprint
5. Keep the existing EAS SHA-1 row. Save. Wait up to 5 minutes.

Until this is done, Play review devices and store installs can fail
Firebase/FCM with `API_KEY_ANDROID_APP_BLOCKED` even though preview APKs work.

Do **not** delete or rotate the Android API key for this launch.

---

## Phase 4 — Production AAB (the store binary)

### Do not upload

- Preview APK (`npm run build:preview:android`)
- Development client APK
- Anything from `expo run:android` debug

### Before `eas build`

- [ ] [SECURITY.md](SECURITY.md) signed off
- [ ] Bump `expo.version` in `app.json` from `0.1.0` to `1.0.0` (user-visible). Leave version code to EAS.
- [ ] `google-services.json` on the machine that runs the build
- [ ] `eas login` as `uvaram2004`
- [ ] Smoke-test the latest **preview** build once more

### Build

```bash
npx eas-cli build --profile production --platform android
```

(`npm run build:production` also builds iOS — skip that if Android-only.)

First production Android build: let EAS create/manage the upload keystore and
**download the backup** when prompted.

Output: `.aab` on Expo. Production profile has no `buildType: "apk"`, so this
is an App Bundle, which Play requires for new apps.

---

## Phase 5 — Upload

### Option A — EAS Submit (matches this repo)

```bash
npx eas-cli submit --platform android --profile production --latest
```

First run: connect Play Console (Google API service account with Play access,
or paste the JSON key Expo asks for). Store that JSON **outside git**.

### Option B — Manual

Play Console → **Test and release → Testing → Internal testing** → Create
release → upload the `.aab`.

### Which track

1. **Internal testing** — up to 100 testers, no full review, same day. Use this first.
2. **Closed testing** — review; required before production on many new personal accounts.
3. **Open testing** — public beta (optional).
4. **Production** — live store listing.

Internal testers install from the opt-in link, not from search.

---

## Phase 6 — Internal QA (install from Play internal track)

- [ ] Install from the Play internal link (not the old preview APK)
- [ ] Cold start, login, logout
- [ ] Student verify (OTP + ID photo)
- [ ] Browse deals / events, online code, in-store ticket QR
- [ ] Partner scanner on a physical device
- [ ] Push notification arrives
- [ ] No Firebase / FCM errors after Play SHA-1 was added
- [ ] Privacy and terms open
- [ ] Reviewer test account works on a clean device

---

## Phase 7 — Review and production

1. Promote the **same** AAB Internal → Closed (if required) → Production.
2. Complete **Publishing overview** until every section is green.
3. If Console requires closed testing: add testers, wait until they stay opted
   in for the required consecutive days, then apply for production.
4. Wait for review. Typical first review: 1–7 days.

### Common rejection reasons for this app

- Privacy URL missing, login-walled, or 404
- Camera / photos not explained in listing **and** in the system prompt
- Student ID images not declared in Data safety
- No reviewer credentials
- Crash on launch (missing `google-services.json` in the AAB)
- Firebase blocked on Play-signed builds (missing app-signing SHA-1)
- Uploaded APK instead of AAB
- Misleading screenshots

Fix, upload a new AAB if native/config changed (`autoIncrement` raises version
code), resubmit.

5. When approved: roll out Production (start at 20% if you want a safety net,
   then 100%).
6. **Publish** if Console uses manual publishing.

---

## Phase 8 — After launch

`runtimeVersion` follows `appVersion`.

| Change | Ship how |
|---|---|
| JS/UI, copy, most bugs | `npm run update:production` — same native `1.0.0` |
| New native module, permission, Expo SDK, `google-services.json` | New production AAB + Play release; bump `expo.version` (e.g. `1.0.1`) |
| Add another SHA-1 on the Android API key | Google Cloud only — no app update if the key in the AAB is unchanged |

OTA does **not** put the app on Play. It only updates people who already
installed that native version.

Each new store binary:

1. Bump `expo.version` when you want users to see a new version name
2. `eas build --profile production --platform android` (version code auto-increments)
3. `eas submit` or upload AAB
4. Release notes in Play Console
5. Production rollout

---

## Command cheat sheet

```bash
# Preview testers only (not Play)
npm run build:preview:android

# Store binary
npx eas-cli build --profile production --platform android

# Upload latest Android production build
npx eas-cli submit --platform android --profile production --latest

# JS-only fix after the store app is installed
npm run update:production
```

Expo Android credentials:  
https://expo.dev/accounts/uvaram2004/projects/unideals-app/credentials?platform=android

Firebase API keys:  
https://console.cloud.google.com/apis/credentials?project=unideals-6d728

---

## Suggested calendar

**Week 0**  
Finish [SECURITY.md](SECURITY.md). Host privacy/terms. Draft feature graphic +
screenshots. Pay $25 only after the security gate (or in parallel if the gate
is days from done).

**Week 1**  
Play listing + Data safety. Account verified. Bump to `1.0.0`. Production AAB.
Internal testing. Add Play app-signing SHA-1.

**Week 2**  
Closed testing and/or first review. Fix rejects.

**Week 3–4**  
Production (or still in the 14-day tester window).

**Week 5–6**  
Buffer if closed testing + a rejection loop.

---

## Out of scope (do later)

- Apple App Store (separate Apple Developer Program, $99/year)
- Changing package name
- Deleting/rotating the Firebase Android API key
- Putting `google-services.json` back in git
