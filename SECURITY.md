# SECURITY ARCHITECTURE — RideWear

Companion to [`ARCHITECTURE.md`](./ARCHITECTURE.md) and [`PRIVACY_ARCHITECTURE.md`](./PRIVACY_ARCHITECTURE.md).  
Status labels: **IMPLEMENT NOW** · **BEFORE BETA** · **BEFORE PRODUCTION** · **FUTURE**

---

## 1. Trust boundaries

```
Flutter app  ──JWT──►  NestJS API  ──►  Prisma / DB
                          │
                          ├── Weather providers (MET, …)
                          ├── Identity providers (FB, MS)
                          └── Connected services (Strava)
```

- Flutter never holds DB credentials, IdP client secrets, Strava secrets, or service-role keys.
- NestJS owns authorization, validation, recommendation, wardrobe, routes, tokens.
- Prefer portable PostgreSQL; Supabase is a **managed Postgres host**, not a second app backend.

---

## 2. Authentication vs authorization

| | Question | Mechanism |
|---|----------|-----------|
| Authentication | Who is this? | JWT after email/password or IdP OAuth (PKCE) |
| Authorization | May they access this resource? | Every query scoped by `userId` from JWT |

**Rule (IMPLEMENT NOW / enforce continuously):**  
Prefer `findFirst({ where: { id, userId } })` (or equivalent). Never “load by id then hope.” Cross-user access must fail closed (403/404). Ownership tests exist for wardrobe and routes; keep adding them for every user-owned resource.

---

## 3. Secrets inventory

| Secret | Where allowed | Notes |
|--------|---------------|-------|
| `JWT_SECRET` | API only | BEFORE PRODUCTION: strong random, rotated |
| `DATABASE_URL` | API / migrate CI only | Never in Flutter |
| `FACEBOOK_APP_SECRET` | API only | |
| `MICROSOFT_CLIENT_SECRET` | API only (optional if public+PKCE) | |
| `STRAVA_CLIENT_SECRET` | API only | |
| `TOKEN_ENCRYPTION_KEY` | API only | AES-GCM for Strava tokens |
| AdMob app/unit IDs | Mobile build config | Test IDs in CI; no production IDs in tests |
| Supabase service role | API only if ever used | Never embed in Flutter; prefer Nest-only access |

`.env` gitignored; `.env.example` documents names only.  
**IMPLEMENT NOW:** never log tokens, passwords, or Authorization headers.

---

## 4. Connected-service token lifecycle (Strava)

1. User connects from Profile (not login).
2. PKCE authorize → API callback → encrypt tokens at rest (`TOKEN_ENCRYPTION_KEY`).
3. Mobile APIs return connection **status/metadata**, not refresh tokens.
4. Disconnect deletes/revokes local vault row; FUTURE: call provider revoke.
5. Sync of activities is FUTURE (not M2.5 foundation).

---

## 5. Security baseline checklist

| Control | Timing |
|---------|--------|
| class-validator on DTOs | IMPLEMENT NOW |
| bcrypt password hashes | IMPLEMENT NOW |
| JWT auth guards on private routes | IMPLEMENT NOW |
| Ownership checks | IMPLEMENT NOW (expand coverage) |
| HTTPS-only production | BEFORE PRODUCTION |
| CORS allowlist for known clients | BEFORE BETA |
| Rate limit auth + recommend | BEFORE BETA |
| Brute-force / lockout on login | BEFORE PRODUCTION |
| Secure mobile token storage (`flutter_secure_storage`) | IMPLEMENT NOW |
| Sanitized error messages (no stack to clients in prod) | BEFORE BETA |
| Dependency audit in CI | BEFORE BETA |
| Account deletion cascade | BEFORE PRODUCTION (stub exists) |
| Row Level Security on Supabase | ONLY if client ever hits Supabase directly — prefer Nest-only (**BEFORE PRODUCTION** if dual access) |

---

## 6. Database / Supabase timing

| Stage | Recommendation |
|-------|----------------|
| Local | SQLite via Prisma (**IMPLEMENT NOW**) |
| BEFORE BETA | Migrate staging to **PostgreSQL** (Supabase OK as host) |
| BEFORE PRODUCTION | Postgres + automated backups + restore drill |

SQLite → Postgres notes: booleans/JSON fine; verify DateTime; no SQLite-only raw SQL; set `provider = "postgresql"` per env; connection pooling (PgBouncer / Supabase pooler) for serverless-like deploys.

**Do not rewrite Flutter → Supabase direct.** Nest remains the application boundary.

---

## 7. Backups

| Env | Expectation |
|-----|-------------|
| Local | Disposable; no SLA |
| Test/beta | Daily snapshot; 7-day retention |
| Production | Automated backups + **tested restore** + monitoring |

A backup never restored is not a backup (**BEFORE PRODUCTION**).

---

## 8. Observability (minimal PII)

Track: API health, DB health, error rates, weather/OAuth failures.  
Do not log: exact route coordinates unnecessarily, tokens, passwords, full profiles.  
Structured redacted logs — **BEFORE BETA**.

---

## 9. Advertising security/privacy

Ads must not influence recommendations (separate domain). Consent for EEA/Norway — **BEFORE PRODUCTION** if ads enabled. See ARCHITECTURE § Advertising.
