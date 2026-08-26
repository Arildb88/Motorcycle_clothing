#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/apps/mobile"

echo "==> Checking Flutter..."
command -v flutter >/dev/null || {
  echo "Flutter is not on your PATH."
  echo "Install from https://docs.flutter.dev/get-started/install/windows"
  echo "Then reopen Git Bash and run: flutter doctor"
  exit 1
}

echo "==> Checking for a running Android emulator/device..."
if ! flutter devices 2>/dev/null | grep -qiE 'android|emulator|pixel|sdk'; then
  echo "No Android device found."
  echo "1) Open Android Studio"
  echo "2) Virtual Device Manager → Play on an emulator"
  echo "3) Run this script again"
  exit 1
fi

echo "==> Checking API is up..."
if ! curl -sf http://127.0.0.1:3000/api/health >/dev/null; then
  echo "API is not running on port 3000."
  echo "Open another Git Bash window and run: ./scripts/start-api.sh"
  exit 1
fi

echo "==> Getting Flutter packages..."
flutter pub get

echo "==> Launching RideWear on Android emulator..."
echo "    (first build can take several minutes)"
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000/api
