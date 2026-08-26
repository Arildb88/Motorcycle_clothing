#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/apps/api"

echo "==> Checking Node/npm..."
command -v node >/dev/null || { echo "Node.js is not installed. Install LTS from https://nodejs.org then reopen Git Bash."; exit 1; }
command -v npm >/dev/null || { echo "npm is missing. Reinstall Node.js LTS."; exit 1; }

echo "==> Installing API dependencies (first time can take a minute)..."
npm install

echo "==> Ensuring .env exists..."
npm run setup:env

echo "==> Migrating database..."
npx prisma migrate dev --name init --skip-seed 2>/dev/null || npx prisma migrate dev

echo "==> Starting API on http://localhost:3000/api"
echo "    Keep this window open."
npm run start:dev
