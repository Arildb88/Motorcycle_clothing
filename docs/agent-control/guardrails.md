# RideWear Agent Guardrails

## Branch policy
- `dev_test` is the integration/testing branch.
- `dev` and `main` are human-controlled. NEVER merge, push, rebase, reset, force-push, or otherwise modify them.
- Start implementation work from the latest `dev_test`.
- Use a `feature/*` or `fix/*` branch.
- Merge to `dev_test` only after all required tests pass.

## Scope control
- Read this file and `docs/agent-control/next-task.md` before implementation.
- Implement only the task explicitly authorized in `next-task.md`.
- Do not invent features or expand scope.
- Do not change architecture, database schema, external providers, paid services, or dependency versions unless `next-task.md` explicitly authorizes it.
- Do not remove existing functionality.
- If a required decision is ambiguous or outside the authorized scope, STOP and report the decision needed instead of guessing.

## Quality
- Preserve the existing Flutter -> NestJS API -> external-provider architecture.
- Keep provider secrets server-side.
- Prefer existing abstractions and provider-independent domain models.
- Add/update focused tests for changed behavior.
- Run every test/build command required by `next-task.md`.
- If required tests fail, do not merge.

## Completion
After successful implementation:
1. Commit the feature/fix branch.
2. Open a PR targeting `dev_test`.
3. Merge only to `dev_test` after required tests pass.
4. Update `docs/agent-reports/latest.md` with task, branch/commit/PR, files changed, tests/build results, config/architecture changes, manual checks, and remaining issues.
5. STOP. Do not begin another task unless `next-task.md` explicitly authorizes another one.
