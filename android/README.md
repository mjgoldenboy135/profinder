# Profinder — Android app (Play Store)

The Android app is a **TWA (Trusted Web Activity)**: a thin, native shell that
opens the live site (`https://www.profinderhome.com`) full‑screen using Chrome's
engine. It's tiny (~1–2 MB), loads fast, and always stays in sync with the
website — no separate app codebase to maintain.

This folder contains the build config (`twa-manifest.json`). The web app itself
is already PWA‑ready (manifest, icons, service worker, Digital Asset Links).

There are two build paths. **Local is the most reliable** (Bubblewrap installs
the JDK/Android SDK for you and walks you through creating the keystore). CI is
optional once the keystore exists.

---

## 0. One‑time: create your signing keystore (you own this — never commit it)

You need a keystore to sign the app. **Keep it safe and back it up** — if you
lose it you can't publish updates under the same app.

```bash
keytool -genkeypair -v \
  -keystore profinder-release.keystore \
  -alias profinder \
  -keyalg RSA -keysize 2048 -validity 10000
```

Answer the prompts and pick a strong password. This creates
`profinder-release.keystore` with a key alias `profinder` (the alias the config
expects).

Get its SHA‑256 fingerprint (needed later for domain verification):

```bash
keytool -list -v -keystore profinder-release.keystore -alias profinder | grep SHA256
```

---

## 1a. Build locally (recommended)

Prereqs: Node 18+ and a JDK 17 on your machine (Bubblewrap can install the
Android SDK itself).

```bash
npm install -g @bubblewrap/cli

cd android
# Generate the native project from the committed twa-manifest.json:
bubblewrap init --manifest https://www.profinderhome.com/manifest.webmanifest
#   When prompted, point the signing key at your keystore file and use
#   alias "profinder". Bubblewrap reads the rest from twa-manifest.json.

# Build the signed release:
bubblewrap build
```

Outputs in `android/`:
- `app-release-bundle.aab` → **upload this to the Play Store**
- `app-release-signed.apk` → install on a device to test

Test the APK on a phone:
```bash
adb install app-release-signed.apk
```

## 1b. Build in GitHub Actions (optional)

1. Base64‑encode your keystore and add repo secrets
   (**Settings → Secrets and variables → Actions**):
   ```bash
   base64 -w0 profinder-release.keystore   # copy the output
   ```
   - `ANDROID_KEYSTORE_BASE64` = that base64 string
   - `ANDROID_KEYSTORE_PASSWORD` = your keystore password
   - `ANDROID_KEY_PASSWORD` = your key password
2. Actions tab → **Build signed Android app (TWA)** → **Run workflow**.
3. Download the `profinder-android-release` artifact (contains the `.aab`).

> The CI flow is best‑effort — if Bubblewrap's CLI prompts change, build locally
> (1a); that path is Google's documented one and always works.

---

## 2. Verify domain ownership (removes the browser URL bar)

For the app to run full‑screen (no address bar), the site must publish a
**Digital Asset Links** file listing the app's signing certificate. This app
already serves it at `https://www.profinderhome.com/.well-known/assetlinks.json`
— it just needs the fingerprint(s).

Set this backend/host env var (on Render, for the Next.js service) to the
SHA‑256 from step 0, then redeploy:

```
TWA_SHA256_FINGERPRINTS = AA:BB:CC:...:FF
TWA_PACKAGE_NAME        = com.profinderhome.app   # optional, this is the default
```

You can list multiple fingerprints comma‑separated (see step 4).

Check it:
```bash
curl https://www.profinderhome.com/.well-known/assetlinks.json
```

---

## 3. Upload to the Play Console

1. Create the app in the [Play Console](https://play.google.com/console) with
   package name **`com.profinderhome.app`**.
2. Create a release (Internal testing first) and upload `app-release-bundle.aab`.
3. Keep **Play App Signing** enabled (default) — Google re‑signs your app.

## 4. Add the Play App Signing fingerprint (important!)

Because Play re‑signs your app, the certificate users actually get is Google's,
not your upload key. After uploading:

1. Play Console → your app → **Test and release → App integrity → App signing**.
2. Copy the **SHA‑256 certificate fingerprint** under *App signing key
   certificate*.
3. Add it to `TWA_SHA256_FINGERPRINTS` (comma‑separated alongside your upload
   key's fingerprint from step 0), and redeploy.

Now the installed app verifies the domain and runs with no URL bar.

---

## 5. Shipping updates

The app content updates automatically whenever you deploy the website — no new
Play release needed for content/UI changes.

You only rebuild + re‑upload the app to change native things (name, icon, splash,
Android version). When you do, **bump the version** so Play accepts it:

- Edit `android/twa-manifest.json`: increase `appVersionCode` (integer, +1) and
  `appVersionName` (e.g. `1.0.1`), or pass them as inputs to the CI workflow.
- Rebuild (step 1) and upload the new `.aab`.

---

## Config reference (`twa-manifest.json`)

| Field | Value |
| --- | --- |
| `packageId` | `com.profinderhome.app` |
| `host` | `www.profinderhome.com` |
| `startUrl` | `/` |
| `themeColor` | `#0ea5e9` (sky blue) |
| `signingKey.alias` | `profinder` |

If you change the domain, update `host`, `startUrl`, `iconUrl`,
`maskableIconUrl`, `webManifestUrl`, and `fullScopeUrl` here and the
`TWA_*` env vars, then rebuild.
