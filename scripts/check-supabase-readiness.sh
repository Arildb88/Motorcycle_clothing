#!/usr/bin/env bash
# Static checks for the first manual Supabase deployment.
# Does not open a network connection, a database, or any .env file.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

fail() {
  echo "READINESS FAIL: $*" >&2
  exit 1
}

ok() {
  echo "ok: $*"
}

require_file() {
  [[ -f "$ROOT/$1" ]] || fail "missing $1"
}

require_literal() {
  local file="$1"
  local needle="$2"
  grep -F -q -- "$needle" "$ROOT/$file" || fail "$file missing required text: $needle"
}

forbid_regex() {
  local file="$1"
  local pattern="$2"
  local label="$3"
  if grep -E -q -- "$pattern" "$ROOT/$file"; then
    fail "$file contains forbidden $label"
  fi
}

database_url_problem() {
  local url="$1"
  case "$url" in
    postgresql://motorcycle:motorcycle@localhost:5432/motorcycle) return 1 ;;
    postgresql://motorcycle:motorcycle@postgres:5432/motorcycle) return 1 ;;
  esac
  case "$url" in
    *supabase.co*|*pooler.supabase*) echo "hosted host" ;;
    *pgbouncer*) echo "pgbouncer" ;;
    *:6543*|*6543/*) echo "transaction-pooler port" ;;
    *) echo "not a local Postgres 16 URL" ;;
  esac
  return 0
}

check_database_urls() {
  local file="$1"
  local url
  local problem
  while IFS= read -r url; do
    [[ -n "$url" ]] || continue
    if problem="$(database_url_problem "$url")"; then
      fail "$file has a database URL ($problem)"
    fi
  done < <(grep -oE 'postgresql://[^"[:space:]}]+' "$ROOT/$file" || true)
}

CONFIG_FILES=(
  apps/api/.env.example
  apps/api/.env.test
  docker-compose.yml
  .github/workflows/api-ci.yml
  apps/api/Dockerfile
  scripts/smoke-api.sh
  apps/api/prisma/schema.prisma
)

run_tree() {
  local file

  require_file apps/api/prisma/schema.prisma
  require_literal apps/api/prisma/schema.prisma 'provider  = "postgresql"'
  require_literal apps/api/prisma/schema.prisma 'url       = env("DATABASE_URL")'
  require_literal apps/api/prisma/schema.prisma 'directUrl = env("DIRECT_URL")'
  ok "Prisma datasource uses postgresql, DATABASE_URL, and DIRECT_URL"

  require_file apps/api/prisma/migrations/migration_lock.toml
  require_literal apps/api/prisma/migrations/migration_lock.toml 'provider = "postgresql"'
  ok "migration lock is postgresql"

  local baseline="apps/api/prisma/migrations/20261002120000_postgres_baseline/migration.sql"
  require_file "$baseline"
  forbid_regex "$baseline" 'PRAGMA' 'PRAGMA'
  forbid_regex "$baseline" 'DATETIME' 'DATETIME'
  forbid_regex "$baseline" '[[:space:]]REAL[[:space:]]' 'REAL'
  require_literal "$baseline" '"isDemo" BOOLEAN NOT NULL DEFAULT false'
  forbid_regex "$baseline" 'CREATE TABLE "(AuthProvider|Profile|ComfortSettings|RideFeedback)"' 'retired SQLite table'
  ok "baseline SQL matches the reviewed PostgreSQL shape"

  for file in "${CONFIG_FILES[@]}"; do
    require_file "$file"
    forbid_regex "$file" 'supabase\.co|pooler\.supabase' 'Supabase host'
    forbid_regex "$file" 'pgbouncer' 'pgbouncer'
    forbid_regex "$file" ':6543' 'port 6543'
    forbid_regex "$file" 'service_role|SUPABASE_(URL|ANON|SERVICE|KEY|SECRET|DB)' 'Supabase secret name'
    check_database_urls "$file"
  done
  ok "committed config URLs are local Postgres 16 only"

  for file in apps/api/.env.example apps/api/.env.test docker-compose.yml .github/workflows/api-ci.yml apps/api/Dockerfile scripts/smoke-api.sh; do
    require_literal "$file" 'DATABASE_URL'
    require_literal "$file" 'DIRECT_URL'
  done
  require_literal apps/api/Dockerfile 'npx prisma migrate deploy'
  ok "runtime and migrate variables are both set, and the image migrates on startup"

  local doc="docs/operations/SUPABASE_FIRST_DEPLOY.md"
  require_file "$doc"
  require_literal "$doc" '## Environment variable roles'
  require_literal "$doc" '## Pooled runtime and direct migration'
  require_literal "$doc" '## Migration commands'
  require_literal "$doc" '## Empty-public preflight'
  require_literal "$doc" '## Rollback and recovery'
  require_literal "$doc" '## Operator steps'
  require_literal "$doc" 'DATABASE_URL'
  require_literal "$doc" 'DIRECT_URL'
  require_literal "$doc" 'sslmode=require'
  require_literal "$doc" '6543'
  require_literal "$doc" 'pgbouncer=true'
  require_literal "$doc" 'npx prisma migrate deploy'
  require_literal "$doc" 'prisma migrate dev'
  require_literal "$doc" 'prisma db push'
  require_literal "$doc" "nspname = 'public'"
  require_literal "$doc" '_prisma_migrations'
  require_literal "$doc" 'isDemo'
  require_literal "$doc" 'does not connect to a database'
  local stripped
  stripped="$(sed -e 's/db\.\[project-id\]\.supabase\.co//g' -e 's/\*\.pooler\.supabase\.com//g' "$ROOT/$doc")"
  if grep -E -q 'supabase\.co|pooler\.supabase' <<<"$stripped"; then
    fail "$doc contains a Supabase host other than the documented placeholders"
  fi
  ok "operator runbook covers env roles, pooling, migrate, preflight, and rollback"

  for file in README.md SECURITY.md ARCHITECTURE.md docs/architecture/SUPABASE_POSTGRES_MIGRATION_PLAN.md; do
    require_literal "$file" 'docs/operations/SUPABASE_FIRST_DEPLOY.md'
  done
  ok "architecture and operator docs link the runbook"
}

run_self_test() {
  local problem
  if problem="$(database_url_problem "postgresql://motorcycle:motorcycle@localhost:5432/motorcycle")"; then
    fail "self-test rejected the local URL: $problem"
  fi
  if problem="$(database_url_problem "postgresql://motorcycle:motorcycle@postgres:5432/motorcycle")"; then
    fail "self-test rejected the compose URL: $problem"
  fi
  problem="$(database_url_problem "postgresql://user:secret@db.example.supabase.co:5432/postgres")"
  [[ "$problem" == "hosted host" ]] || fail "self-test missed a hosted host ($problem)"
  problem="$(database_url_problem "postgresql://user:secret@localhost:6543/postgres")"
  [[ "$problem" == "transaction-pooler port" ]] || fail "self-test missed port 6543 ($problem)"
  problem="$(database_url_problem "postgresql://user:secret@localhost:5432/postgres?pgbouncer=true")"
  [[ "$problem" == "pgbouncer" ]] || fail "self-test missed pgbouncer ($problem)"
  ok "URL rules reject hosted hosts, port 6543, and pgbouncer"
}

if [[ "${1:-}" == "--self-test" ]]; then
  run_self_test
  run_tree
  echo "supabase readiness self-test passed"
  exit 0
fi

run_tree
echo "supabase readiness check passed"
