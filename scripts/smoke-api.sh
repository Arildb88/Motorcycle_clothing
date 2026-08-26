#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/apps/api"

export DATABASE_URL="file:./smoke.db"
export PORT=3001
export JWT_SECRET="smoke-secret"
export JWT_EXPIRES_IN="1d"
export WEATHER_PROVIDER="mock"
export NODE_ENV="test"
export MET_USER_AGENT="MotorcycleClothingApp/smoke"

rm -f prisma/smoke.db prisma/smoke.db-journal
npx prisma migrate deploy
npm test
npm run build

node dist/main.js &
PID=$!
cleanup() { kill "$PID" 2>/dev/null || true; }
trap cleanup EXIT

for i in $(seq 1 30); do
  if curl -sf "http://localhost:${PORT}/api/health" >/dev/null; then
    break
  fi
  sleep 0.5
done

curl -sf "http://localhost:${PORT}/api/health" | grep -q ok

EMAIL="rider_$RANDOM@test.local"
TOKEN=$(curl -sf -X POST "http://localhost:${PORT}/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"password123\",\"displayName\":\"Test Rider\"}" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["accessToken"])')

curl -sf -X POST "http://localhost:${PORT}/api/routes" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Normal commute","isDefaultCommute":true,"startLat":59.91,"startLon":10.75,"startLabel":"Home","endLat":59.95,"endLon":10.77,"endLabel":"Work"}' >/dev/null

curl -sf "http://localhost:${PORT}/api/recommend" \
  -H "Authorization: Bearer ${TOKEN}" \
  | grep -q effectiveTempC

curl -sf -X POST "http://localhost:${PORT}/api/auth/oauth" \
  -H 'Content-Type: application/json' \
  -d '{"provider":"facebook","accessToken":"demo:fb-smoke"}' \
  | grep -q accessToken

echo "API smoke test passed"
