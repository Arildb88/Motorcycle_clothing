# Authorized RideWear Task
## Type: SECURITY_AUDIT_AND_FIX
## ID: SECURITY-HARDENING-001
## Generation: 37
## Handoff-From: PERFORMANCE-001
## Authorization: authorized
## Promoted: 2026-10-03T01:46:46Z
## Task: Audit and harden RideWear mobile/API security before release

Use current OWASP MASVS/MASTG guidance as the baseline. Inspect the existing Flutter + NestJS architecture before changing anything.

Scope:
- authentication/session/token handling, password/reset/change flows, authorization boundaries and IDOR risks
- sensitive local storage, logs, backups, error messages and accidental secret/PII exposure
- API input validation, rate limiting/brute-force protection, CORS/security headers where applicable
- TLS/cleartext configuration and production network settings
- secrets/API keys must remain server-side; verify release config does not package server secrets
- dependency/audit findings relevant to exploitable runtime risk
- add focused regression/security tests for safe fixes

Constraints:
- Fix only low-risk issues that fit the existing architecture.
- No new identity provider, paid service, schema migration or broad architecture rewrite.
- If a security fix requires a breaking/auth architecture change, document it as a concrete follow-up recommendation in latest report and do not invent/enqueue a task.
- Never commit secrets or real credentials.
- Preserve existing user data and auth compatibility.
- Run API tests/build and Flutter analyze/tests as applicable.
- Follow queue/control rules; dev and main untouched.
