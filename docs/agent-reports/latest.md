# DEPENDENCY-MAINTENANCE-002

## Task

`DEPENDENCY-MAINTENANCE-002`, generation 53, authorized from `THERMAL-ZONE-FEEDBACK-001`. This run did not write a claim commit. The validated `next-task.md` token stayed the ownership record until this branch's final control state.

- Branch: `feature/dependency-maintenance-002`
- Implementation commit: `f65daacbb7826978c6178cfee477aece781d1165`
- PR: https://github.com/Arildb88/Motorcycle_clothing/pull/85 into `dev_test` only. Not merged to `dev` or `main`.

## Result

Compatible updates only. Architecture, schema, providers, and product behavior stay as they were.

API, locked versions:

- `google-auth-library` 11.1.0 → 11.2.0. Release engines require Node `>=22`. CI and this run use Node 22. No application source imports this package.
- `nodemailer` 10.0.13 → 10.0.16. Patch fixes for address parsing, cookies, and error types. Password-reset mail still uses `createTransport`.
- `dotenv` 17.4.2 → 18.0.6. Direct dev dependency. 18.0.0 removes `.env.vault` and preload and adds a CLI. Application code does not import `dotenv`. `@nestjs/config` keeps its own nested `dotenv` 17.4.1.
- `eslint` 9.39.5 → 10.12.0 and `@eslint/js` 9.39.5 → 10.0.1. The project already uses flat config. ESLint 10 requires Node `^20.19 || ^22.13 || >=24`. Local Node is 22.14.0. `eslint:recommended` adds `no-useless-assignment`, which flags one existing assignment in `auth.service.ts`. CI does not run ESLint.
- `typescript-eslint` 8.71.0 → 8.71.1.

Flutter, locked versions:

- `shared_preferences` 2.5.5 → 2.5.6. Documentation and a higher minimum Flutter SDK in the package. `shared_preferences_android` stays 2.4.28.
- `url_launcher` 6.3.2 → 6.3.3. Fixes `supportsCloseForLaunchMode` reporting. `url_launcher_android` stays 6.3.33.
- Transitive: `cupertino_ui` 1.1.1 → 1.1.2, `material_ui` 1.5.0 → 1.6.0, `jni_flutter` 1.0.3 → 1.0.4+1.

Deferred:

- NestJS 12.1.2. Official migration says Jest can load the ESM-only packages only on Node 24.9 or later. CI is Node 22. `@nestjs/schematics` 12 requires Node `^22.22.3 || ^24.15 || >=26` and TypeScript `>=6`. Lifecycle hooks run by component hierarchy. The family stays on NestJS 11.2.7, `@nestjs/config` 4.0.4, and the matching JWT, Passport, CLI, and testing packages.
- Prisma. `@prisma/client` and `prisma` stay 5.22.0, the newest 5.x, and they match. Prisma 7.10.0 moves the datasource URL into `prisma.config.ts`, removes `directUrl`, and changes the generator and `migrate diff` flags. That is a persistence and CLI migration outside this task. The `prisma` latest dist-tag is `8.0.0-rc.21`, a prerelease, while `@prisma/client` latest stable is 7.10.0.
- TypeScript 6.0.3 and 7.0.2. 6.0.3 is inside the `typescript-eslint` `<6.1` and `ts-jest` `<7` ranges, and the production build typechecked, but `tsc` then reported new errors in existing auth, wardrobe, catalogue, feedback, and recommendation specs. TypeScript 7.0.2 is outside both peers. Stay on 5.9.3.
- `@types/node` stays 24.19.1, the newest 24.x. Latest is 26.6.4. CI and this machine run Node 22, so Node 26 types are not required.
- Flutter packages that are not resolvable inside current constraints: `dbus` 0.8.0, `gsettings` 0.2.9, `material_color_utilities` 0.13.1, `window_to_front` 1.0.0, and dev `test_api` 0.7.14. `window_to_front` 1.0.0 is a new major. No `--major-versions` upgrade.
- `npm audit` stayed at 20 moderate, all through Jest 30.5.2 → Istanbul → `js-yaml` 3 → `sprintf-js`. `npm audit fix --force` proposes downgrading `jest` and `ts-jest` and was not run. No transitive override was added. Jest and `ts-jest` are already at their latest releases.

`flutter_web_auth_2` is already at 5.1.0, its latest. The debug APK build warned that this plugin applies the Kotlin Gradle Plugin and that a future Flutter release will reject that. This Flutter 3.47.6 build still completed.

No schema, provider, dependency-family, or CI workflow change. Node stays 22. Flutter SDK constraint stays `^3.13.1`. The lockfile already required Flutter `>=3.47.0`.

## Checks

- Install from the updated API lockfile, then Prisma generate and `prisma validate`: passed. Validate used a local `DATABASE_URL` and `DIRECT_URL` and did not contact a hosted database.
- API production build: passed (`dist/main.js`).
- Focused API test `src/auth/auth.password.spec.ts`: 14 passed. This covers the nodemailer password-reset path. No full API suite and no smoke run.
- `flutter pub get` via `flutter pub upgrade`, then `flutter analyze`: no issues found.
- No Dart compatibility edits, so no extra Flutter test suite.
- Android debug APK: passed (`build/app/outputs/flutter-apk/app-debug.apk`) because `jni_flutter` and the direct native plugins changed. iOS was not built.

## Final control state

`DEPENDENCY-MAINTENANCE-002` is completed and appended once to `consumed.md`. `active_id` is `ALPINE-PLANNER-SIMPLIFY-001`. `handoff_state` is `authorized`. `handoff_generation` is 54. `promotion` stays `automatic`. `next-task.md` authorizes `ALPINE-PLANNER-SIMPLIFY-001` with `Handoff-From: DEPENDENCY-MAINTENANCE-002`. This run does not execute that ID.
