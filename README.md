# DPS-INVENTORY

An offline-first mobile inventory management app. PIN login, barcode/QR
scanning, stock in/out tracking, dashboard analytics, and printable
reports — all running **100% offline** on local IndexedDB storage, no
backend or cloud service of any kind.

---

## Features

- **Splash → PIN login → Admin Portal** flow with smooth animations
- **4-digit circular PIN lock** (default `1234`, changeable anytime)
- **Offline barcode/QR scanning** via the device camera (`BarcodeDetector`
  Web API — no network calls, see `js/scanner.js`)
- **Add / search / filter products**, with category, unit, and
  pieces-per-unit logic (e.g. 1 Carton = 24 pcs)
- **Stock In / Stock Out** with Sold / Damaged / B.O. reason tracking
- **Dashboard** with animated stat cards and a recent activity feed
- **Printable inventory reports** via the browser's native print dialog
- **Toasts, modals, ripples, skeleton loaders** — no `alert()` anywhere
- **IndexedDB** storage (`js/storage.js`) with `products`, `activities`,
  and `settings` object stores

---

## Project structure

```
DPS-INVENTORY/
├── index.html          Splash screen
├── login.html           PIN entry screen
├── home.html             Admin Portal (Home / Add Items / All Items)
├── config.xml            Apache Cordova project configuration
├── manifest.json           Web app manifest
├── css/
│   ├── fonts.css            Local @font-face declarations (no CDN)
│   ├── style.css              Design tokens + components
│   ├── responsive.css           Breakpoints for all screen sizes
│   └── animation.css              Keyframes & transition classes
├── js/
│   ├── storage.js       IndexedDB data layer
│   ├── inventory.js      Product & stock business logic
│   ├── scanner.js          Offline camera barcode/QR scanning
│   ├── app.js                Admin Portal controller (views, modals)
│   ├── pin.js                  PIN screen logic
│   ├── ui.js                     Ripple / modal / drawer / skeleton helpers
│   ├── toast.js                    Toast notification system
│   └── print.js                      Printable report generator
├── assets/
│   ├── icons/            App icons (72–512px, placeholders included)
│   ├── images/             logo.png
│   └── fonts/                 See README.txt — add local font files here
├── libraries/
│   ├── cordova.js         Placeholder (CLI-generated at build time)
│   └── README.txt           Optional offline barcode decoder fallback
└── res/android/          Launcher icons per density (Cordova platform)
```

---

## Running in a browser (quick preview)

Because the app uses IndexedDB and camera access, open it through a
local web server rather than `file://`:

```bash
cd DPS-INVENTORY
npx serve .
# or: python3 -m http.server 8080
```

Then visit `http://localhost:8080` (or the printed port) on your
phone or desktop browser. Default PIN is **1234**.

> Camera-based scanning requires HTTPS or `localhost` per browser
> security rules — this is automatic on `localhost` and inside the
> built Android app.

---

## Building the Android APK with Apache Cordova

1. **Install prerequisites** (one-time):
   ```bash
   npm install -g cordova
   ```
   Also install Android Studio + the Android SDK, and set
   `ANDROID_HOME` / `JAVA_HOME` per Cordova's Android platform guide.

2. **Create the Cordova project shell:**
   ```bash
   cordova create DPS-INVENTORY-APP com.dps.inventory DPS-INVENTORY
   cd DPS-INVENTORY-APP
   ```

3. **Replace the generated `www/` folder** with the contents of this
   project (everything except `config.xml`, which goes at the project
   root):
   ```bash
   rm -rf www
   cp -R /path/to/DPS-INVENTORY www
   cp www/config.xml ./config.xml
   rm www/config.xml
   ```

4. **Add the Android platform and required plugins:**
   ```bash
   cordova platform add android
   cordova plugin add cordova-plugin-camera
   cordova plugin add cordova-plugin-file
   cordova plugin add cordova-plugin-android-permissions
   ```
   (These are already declared in `config.xml` and will be installed
   automatically on `cordova prepare` in most Cordova versions — running
   the commands above ensures they're present.)

5. **Add font files** (optional but recommended) — see
   `assets/fonts/README.txt`.

6. **Build the APK:**
   ```bash
   cordova build android
   ```
   The debug APK will be at:
   ```
   platforms/android/app/build/outputs/apk/debug/app-debug.apk
   ```
   For a signed release build, use `cordova build android --release`
   and follow Cordova's Android signing guide.

7. **Run on a connected device or emulator:**
   ```bash
   cordova run android
   ```

The app requests the **Camera** permission on first scan for offline
barcode/QR reading. No other permissions are required — there is no
internet permission because the app never makes network requests.

---

## Data & storage

All data lives in the device's IndexedDB (`dps_inventory_db`), scoped
to the app's own storage sandbox. Uninstalling the app removes all
data. There is currently no built-in export/backup feature — back this
up at the OS level if needed.

## Default credentials

- **PIN:** `1234` (change anytime from the Admin Portal top bar → lock icon)
