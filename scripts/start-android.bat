@echo off
cd /d "%~dp0..\apps\mobile"
echo Checking Flutter...
where flutter >nul 2>&1 || (echo Install Flutter and add to PATH. Run: flutter doctor & pause & exit /b 1)

echo Checking API...
curl -sf http://127.0.0.1:3000/api/health >nul 2>&1 || (
  echo API is not running. Double-click scripts\start-api.bat first.
  pause & exit /b 1
)

echo Getting packages...
call flutter pub get

echo Launching app on Android emulator...
echo Make sure an emulator is running in Android Studio first.
call flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000/api
pause
