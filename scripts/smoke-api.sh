#!/usr/bin/env bash
# HTTP smoke checks against a freshly migrated SQLite DB.
# Prints the exact step that fails (instead of a bare exit 1).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/apps/api"

export DATABASE_URL="${DATABASE_URL:-file:./smoke.db}"
export PORT="${PORT:-3001}"
export JWT_SECRET="${JWT_SECRET:-smoke-secret}"
export JWT_EXPIRES_IN="${JWT_EXPIRES_IN:-1d}"
export WEATHER_PROVIDER="${WEATHER_PROVIDER:-mock}"
export NODE_ENV="${NODE_ENV:-test}"
export MET_USER_AGENT="${MET_USER_AGENT:-MotorcycleClothingApp/smoke}"
# Required for legacy demo OAuth smoke (IdPs unset in CI).
export ALLOW_DEMO_OAUTH="${ALLOW_DEMO_OAUTH:-true}"
export TOKEN_ENCRYPTION_KEY="${TOKEN_ENCRYPTION_KEY:-smoke-only-token-encryption-key}"

FAILED_STEP=""
API_LOG="$(mktemp)"
PID=""

fail() {
  echo "SMOKE FAIL: $1" >&2
  if [[ -n "${2:-}" ]]; then
    echo "Details: $2" >&2
  fi
  if [[ -f "$API_LOG" ]]; then
    echo "----- API log (tail) -----" >&2
    tail -n 40 "$API_LOG" >&2 || true
  fi
  exit 1
}

step() {
  FAILED_STEP="$1"
  echo "==> $1"
}

cleanup() {
  if [[ -n "$PID" ]]; then
    kill "$PID" 2>/dev/null || true
    wait "$PID" 2>/dev/null || true
  fi
  rm -f "$API_LOG"
}
trap cleanup EXIT

on_err() {
  fail "${FAILED_STEP:-unknown step} (exit $?)"
}
trap on_err ERR

expect_http() {
  # expect_http LABEL METHOD URL [curl args...]
  # Last optional --body-file / --contains handled by caller via helper below.
  local label="$1"
  shift
  local tmp
  tmp="$(mktemp)"
  local code
  set +e
  code=$(curl -sS -o "$tmp" -w "%{http_code}" "$@")
  local curl_ec=$?
  set -e
  if [[ $curl_ec -ne 0 ]]; then
    fail "$label" "curl failed (exit $curl_ec) for $*"
  fi
  if [[ "$code" != 2* ]]; then
    fail "$label" "HTTP $code — body: $(head -c 500 "$tmp")"
  fi
  cat "$tmp"
  rm -f "$tmp"
}

expect_contains() {
  local label="$1"
  local needle="$2"
  local body="$3"
  if ! grep -q -- "$needle" <<<"$body"; then
    fail "$label" "response missing '$needle' — body: $(head -c 500 <<<"$body")"
  fi
}

step "clean smoke database"
rm -f prisma/smoke.db prisma/smoke.db-journal

step "prisma migrate deploy"
npx prisma migrate deploy

if [[ "${SMOKE_SKIP_UNIT:-}" != "1" ]]; then
  step "unit tests"
  npm test
fi

if [[ "${SMOKE_SKIP_BUILD:-}" != "1" ]]; then
  step "nest build"
  npm run build
elif [[ ! -f dist/main.js ]]; then
  step "nest build (dist missing)"
  npm run build
fi

step "start API on :${PORT}"
node dist/main.js >"$API_LOG" 2>&1 &
PID=$!

step "wait for /api/health"
ready=0
for _ in $(seq 1 40); do
  if curl -sf "http://localhost:${PORT}/api/health" >/dev/null; then
    ready=1
    break
  fi
  # Bail early if process died
  if ! kill -0 "$PID" 2>/dev/null; then
    fail "wait for /api/health" "API process exited early"
  fi
  sleep 0.5
done
if [[ "$ready" != "1" ]]; then
  fail "wait for /api/health" "timed out after ~20s"
fi

step "GET /api/health"
HEALTH=$(expect_http "GET /api/health" -X GET "http://localhost:${PORT}/api/health")
expect_contains "GET /api/health" "ok" "$HEALTH"

step "POST /api/auth/register"
EMAIL="rider_${RANDOM}@test.local"
REG=$(expect_http "POST /api/auth/register" \
  -X POST "http://localhost:${PORT}/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"password123\",\"displayName\":\"Test Rider\"}")
expect_contains "POST /api/auth/register" "accessToken" "$REG"
TOKEN=$(python3 -c 'import sys,json; print(json.load(sys.stdin)["accessToken"])' <<<"$REG")

step "POST /api/routes (default commute)"
ROUTE=$(expect_http "POST /api/routes" \
  -X POST "http://localhost:${PORT}/api/routes" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Normal commute","isDefaultCommute":true,"startLat":59.91,"startLon":10.75,"startLabel":"Home","endLat":59.95,"endLon":10.77,"endLabel":"Work"}')
expect_contains "POST /api/routes" "Normal commute" "$ROUTE"

step "GET /api/recommend"
REC=$(expect_http "GET /api/recommend" \
  -X GET "http://localhost:${PORT}/api/recommend" \
  -H "Authorization: Bearer ${TOKEN}")
expect_contains "GET /api/recommend" "effectiveTempC" "$REC"

step "POST /api/wardrobe (base_layer)"
GARM=$(expect_http "POST /api/wardrobe" \
  -X POST "http://localhost:${PORT}/api/wardrobe" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Merino 200","category":"base_layer"}')
expect_contains "POST /api/wardrobe" '"layer":"base"' "$GARM"

step "POST /api/wardrobe/actions/seed-demo"
SEED=$(expect_http "POST /api/wardrobe/actions/seed-demo" \
  -X POST "http://localhost:${PORT}/api/wardrobe/actions/seed-demo?force=true" \
  -H "Authorization: Bearer ${TOKEN}")
# Demo wardrobe size evolves with garment presets; assert a successful seed, not a frozen count.
expect_contains "POST /api/wardrobe/actions/seed-demo" '"created":' "$SEED"
CREATED=$(python3 -c 'import sys,json; print(json.load(sys.stdin)["created"])' <<<"$SEED")
if [[ "$CREATED" -lt 1 ]]; then
  fail "POST /api/wardrobe/actions/seed-demo" "created=$CREATED (expected >= 1)"
fi

step "GET /api/wardrobe (seeded gloves)"
WARDROBE=$(expect_http "GET /api/wardrobe" \
  -X GET "http://localhost:${PORT}/api/wardrobe" \
  -H "Authorization: Bearer ${TOKEN}")
expect_contains "GET /api/wardrobe" "Insulated winter gloves" "$WARDROBE"

step "PATCH /api/users/me (activity prefs)"
ME=$(expect_http "PATCH /api/users/me" \
  -X PATCH "http://localhost:${PORT}/api/users/me" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{"defaultActivity":"hiking","showActivityChooserOnLaunch":false,"coldSensitivity":-1}')
expect_contains "PATCH /api/users/me" '"defaultActivity":"hiking"' "$ME"

step "GET /api/auth/providers"
PROV=$(expect_http "GET /api/auth/providers" \
  -X GET "http://localhost:${PORT}/api/auth/providers")
expect_contains "GET /api/auth/providers" '"email"' "$PROV"

step "GET /api/connections/status"
CONN=$(expect_http "GET /api/connections/status" \
  -X GET "http://localhost:${PORT}/api/connections/status")
expect_contains "GET /api/connections/status" "strava" "$CONN"

step "POST /api/auth/oauth (demo facebook)"
OAUTH=$(expect_http "POST /api/auth/oauth" \
  -X POST "http://localhost:${PORT}/api/auth/oauth" \
  -H 'Content-Type: application/json' \
  -d '{"provider":"facebook","accessToken":"demo:fb-smoke-m25"}')
expect_contains "POST /api/auth/oauth" "accessToken" "$OAUTH"

FAILED_STEP=""
echo "API smoke test passed"
