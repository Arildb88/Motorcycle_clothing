# Idiot-proof start guide (Windows + Git Bash + Android Studio)

Do these steps **in order**. Keep **two Git Bash windows** open when running.

---

## 0) One-time installs (only if missing)

### A. Node.js
1. Install from https://nodejs.org (LTS).
2. Close and reopen Git Bash.
3. Check:
   ```bash
   node -v
   npm -v
   ```

### B. Flutter
1. Install Flutter: https://docs.flutter.dev/get-started/install/windows
2. Add Flutter `bin` to your PATH.
3. In Git Bash:
   ```bash
   flutter doctor
   ```
4. Install anything it says is missing for **Android toolchain** (Android Studio usually covers this).

### C. Android Studio
1. Open Android Studio → **More Actions** → **Virtual Device Manager**.
2. Create a device if you don’t have one (Pixel + recent system image is fine).
3. Click **Play** so the emulator is running **before** you start the app.

### D. Get the code
```bash
cd ~/source/repos/Motorcycle_clothing
git checkout cursor/motorcycle-clothing-app-plan-7616
git pull
```

---

## 1) Start the API (Git Bash window #1)

```bash
cd ~/source/repos/Motorcycle_clothing
./scripts/start-api.sh
```

Wait until you see something like:

`API listening on http://localhost:3000/api`

**Leave this window open.** Don’t close it.

Quick check (optional, new Git Bash tab):
```bash
curl http://localhost:3000/api/health
```
You should see `"status":"ok"`.

---

## 2) Start the Android app (Git Bash window #2)

Make sure the **emulator is already running** in Android Studio.

```bash
cd ~/source/repos/Motorcycle_clothing
./scripts/start-android.sh
```

First run can take several minutes (Gradle download).  
When it finishes, RideWear opens on the emulator.

---

## 3) Use the app

1. Tap **Register** → enter name, email, password (min 8 chars) → **Create account**  
   *(or tap Facebook / Microsoft — demo login works in local mode)*
2. Go to **Routes** → tap **+** (or **Add normal commute**)
3. Go to **Today** → see weather + what to wear
4. Adjust **Comfort** sliders anytime
5. After a pretend ride, tap **How was the ride?**

---

## If something breaks

| Problem | Fix |
|--------|-----|
| `DATABASE_URL` not found | Run `cd apps/api && npm run setup:env` then start API again |
| `flutter: command not found` | Install Flutter and reopen Git Bash; run `flutter doctor` |
| `No devices found` | Start an emulator in Android Studio Device Manager first |
| App can’t reach API | Keep API window running; emulator uses `http://10.0.2.2:3000/api` |
| Port 3000 in use | Close the other API, or change `PORT=3001` in `apps/api/.env` and update the android script URL |
| `npm` / Prisma errors | From `apps/api`: `rm -rf node_modules && npm install && npm run setup:env && npx prisma migrate dev` |

---

## Manual commands (if you prefer not to use scripts)

**API**
```bash
cd ~/source/repos/Motorcycle_clothing/apps/api
npm install
npm run setup:env
npx prisma migrate dev
npm run start:dev
```

**Android**
```bash
cd ~/source/repos/Motorcycle_clothing/apps/mobile
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000/api
```
