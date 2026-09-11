# DEVELOPMENT NOTES

## Completed milestones

- **M1** Domain foundations
- **M2** Wardrobe
- **M2.5** Profile, activity context, identity providers, connected services (Strava foundation)

## M2.5 architecture extensions (accepted)

See PROJECT_PLAN §15 and ARCHITECTURE §3.1–3.2.

Key points:

- `currentActivity` (session) ≠ `defaultActivity` (profile)
- Identity providers ≠ connected services
- No silent account merge by email
- Tokens for Strava encrypted with `TOKEN_ENCRYPTION_KEY`
- Facebook/Microsoft/Strava buttons are **config-gated**

## Environment variables

Copy `apps/api/.env.example` → `apps/api/.env`.

| Variable | Purpose |
|----------|---------|
| `OAUTH_REDIRECT_URI` | Mobile deep link, default `ridewear://oauth/callback` |
| `TOKEN_ENCRYPTION_KEY` | AES key/passphrase for Strava tokens (required to enable Strava) |
| `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` | Facebook Login |
| `MICROSOFT_CLIENT_ID` / `MICROSOFT_TENANT_ID` / optional `MICROSOFT_CLIENT_SECRET` | Entra ID (public client + PKCE preferred) |
| `STRAVA_CLIENT_ID` / `STRAVA_CLIENT_SECRET` / `STRAVA_REDIRECT_URI` | Strava connected service |
| `ALLOW_DEMO_OAUTH` | Non-prod demo tokens via `POST /auth/oauth` |

## Facebook setup

1. Create a Facebook app with **Facebook Login**.
2. Valid OAuth redirect URI: `ridewear://oauth/callback` (and any Facebook-required https redirect if using intermediary).
3. Set `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET` on the API.
4. Minimal scopes: `public_profile`, `email`.
5. Flutter opens authorize URL via `flutter_web_auth_2`; API exchanges code (PKCE).

## Microsoft / Entra setup

1. App registration (mobile/public client).
2. Redirect URI: `ridewear://oauth/callback`.
3. Enable ID tokens; expose scopes `openid profile email offline_access`.
4. Set `MICROSOFT_CLIENT_ID`, `MICROSOFT_TENANT_ID=common` (or your tenant).
5. Prefer PKCE public client (no secret). Optional confidential secret supported.

## Strava setup

1. Create Strava API application.
2. Authorization callback domain / redirect: `ridewear://oauth/callback`.
3. Set `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `TOKEN_ENCRYPTION_KEY`.
4. Connect from Profile → Connected Services (not login screen).
5. M2.5 supports connect / disconnect / minimal athlete sync only.

## Local deep link

- Android: `ridewear` scheme in `AndroidManifest.xml`
- iOS: `CFBundleURLSchemes` = `ridewear`

## Status legend for M2.5 features

| Feature | Status |
|---------|--------|
| Email auth, profile prefs, onboarding, activity chooser/switcher | **WORKING NOW** |
| Wardrobe multi-activity tags | **WORKING NOW** (from M2) |
| FB/MS PKCE authorize + callback API | **ARCHITECTURE READY** — needs real app credentials |
| Strava connect/sync API | **ARCHITECTURE READY** — needs Strava + encryption key |
| Demo social login (`demo:` tokens) | **WORKING in non-prod** when IdPs unset |
| Hiking/cycling recommendation engines | **DEFERRED** (placeholder homes) |
| M3 demand engine | **DEFERRED** |

## Spike leftovers

- `/api/recommend` still baseline motorcycle shim until M3.
- Avatar uploads deferred (initials / optional provider URL only).
