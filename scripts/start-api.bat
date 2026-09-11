@echo off
cd /d "%~dp0..\apps\api"
echo Checking Node...
where node >nul 2>&1 || (echo Install Node.js LTS from https://nodejs.org & pause & exit /b 1)

echo Installing dependencies...
call npm install

echo Creating .env if missing...
if not exist .env copy .env.example .env

echo Migrating database...
call npx prisma migrate dev

echo.
echo Starting API at http://localhost:3000/api
echo Keep this window open.
call npm run start:dev
pause
