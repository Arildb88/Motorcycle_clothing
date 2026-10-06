# SOCIAL-AUTH-RESEARCH-001

## Task

`SOCIAL-AUTH-RESEARCH-001`, generation 41, authorized by the automatic final control update that completed `PRIVACY-DATA-001`. This run did not write a claim commit. The validated `next-task.md` token stayed the ownership record until this branch's final control state.

- Branch: `feature/social-auth-research-001`
- Implementation commit: `acd018becf8c537195f2d8b1d1d9f05e0fbefcd1`
- Design: `docs/research/SOCIAL_AUTH_LOGIN_PLAN.md`
- PR: https://github.com/Arildb88/Motorcycle_clothing/pull/72 into `dev_test` only. Not merged to `dev` or `main`.

## Result

Research and design only. Microsoft and Facebook login stay disabled. No dependency, credential, schema migration, login button, or production OAuth code was added. Email and password are unchanged.

The plan reads the current NestJS and Flutter auth path and the Microsoft, Meta, and App Store documents fetched on 2026-10-06. It keeps authorization-code plus PKCE in the system browser, with the code exchange and the PKCE verifier on the API. RideWear's own JWT remains the session. Provider access tokens and refresh tokens are not stored.

Recommendation: enable neither provider now. Microsoft personal accounts are the only later candidate, and only after the token-validation gaps in the plan are fixed and a human decides how App Store Review Guideline 4.8 is met. Facebook needs a redirect URI the manual-flow guide does not document for `ridewear://`, a current Graph version, a token debug check, and a data-deletion instruction. Enabling both does not remove the iOS requirement.

`DEVELOPMENT_NOTES.md` now points at the plan and says not to enable either provider from the older setup steps.

## Checks

This task does not change runtime code, so the API and Flutter suites were not re-run. The plan's test matrix is for a later implementation task. No live Microsoft, Meta, or Apple call was made beyond reading public documentation. No secret was added.

## Final control state

`SOCIAL-AUTH-RESEARCH-001` is completed and appended once to `consumed.md`. Automatic promotion authorizes `RELEASE-READINESS-001` at generation 42. This run must not execute generation 42.
