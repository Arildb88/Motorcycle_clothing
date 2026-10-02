# DEPENDENCY-MAINTENANCE-001

## Task

`DEPENDENCY-MAINTENANCE-001`, generation 22, authorized by the automatic final control update on `dev_test` from `293d49fff8edfbfe0d3a4c020f8b7368fbb57cff` to `9748a92f4fe37baeea6ace3be97f744f69a2e002`. This run did not write a claim commit. The token stayed the ownership record until this branch's final control state.

- Branch: `feature/dependency-maintenance-001`
- Implementation: `93864eca10bcb05f5d16e2be6e5780de6d236511`
- PR: opened against `dev_test` only. Not merged to `dev` or `main`.

## Inventory

Recorded from the package managers and current registries on 2026-10-02.

API, before this change: NestJS 11.2.3, Prisma 5.22.0, nodemailer 6.10.1, TypeScript 5.9.3, ESLint 9.39.5, Jest 30.4.2. `npm audit` reported 7 findings (6 high, 1 moderate), including `@nestjs/platform-express` `<=11.2.5` and nodemailer `<=10.0.5`.

Flutter direct packages, before this change: `cupertino_icons` 1.0.9, `flutter_secure_storage` 11.1.0, `geolocator` 14.0.3, `google_fonts` 8.2.1. `http` 1.6.0, `provider` 6.1.5+1, `shared_preferences` 2.5.5, `google_mobile_ads` 9.1.0, `uuid` 4.6.0, `flutter_web_auth_2` 5.1.0, and `flutter_lints` 6.0.0 were already current.

Android toolchain in the repo: Gradle 9.3.1, Android Gradle Plugin 9.1.0, Kotlin 2.4.0. This environment has no Android SDK, so those files were not changed.

## Implementation

Compatible updates that stayed on the current major:

- NestJS packages that publish 11.2.7 (`common`, `core`, `platform-express`, `testing`) and the current 11.x CLI/schematics. This includes the `platform-express` advisory fix.
- `google-auth-library` 11.1.0, `jose` 6.2.12, `@types/node` 24.19.1, Jest 30.5.2, Prettier 3.9.9, `typescript-eslint` 8.71.0, and the other same-major dev-tool patches listed in `apps/api/package.json`.
- `npm audit fix` without `--force`. After the accepted set, `npm audit` reports 0 vulnerabilities.
- Flutter: `geolocator` 14.1.1, `flutter_secure_storage` 11.2.0 (its Android plugin still uses `flutter.compileSdkVersion`), `cupertino_icons` 2.0.0, and `google_fonts` 9.0.0. `flutter pub upgrade` also moved in-range transitive packages.
- `google_fonts` 9 types `dmSansTextTheme` as `material_ui`'s `TextTheme`, which does not assign to Flutter `ThemeData.textTheme`. The app theme now applies `GoogleFonts.dmSans` onto Flutter's own `TextTheme`. The fonts already used (`dmSans`, `barlowCondensed`, `sourceSerif4`) remain.

Nodemailer moved from 6.10.1 to 10.0.13. That is the current security fix. Node 22 satisfies its Node 20 requirement. `createTransport` and `sendMail` stay the same for the password-reset message, and `@types/nodemailer` was removed because version 10 ships its own types.

## Deferred

- Prisma stays at 5.22.0. Prisma 6.19.3 keeps `directUrl` in `schema.prisma` and its migration diff against the existing PostgreSQL baseline was empty, but 6.13.0 through 6.19.3 depend on `deepmerge-ts` `<8` (`GHSA-ggr8-5vv4-36mx`). npm's only suggested remediation is `prisma@6.12.0`. Prisma 7 moves the datasource URL into `prisma.config.ts` and requires a driver adapter. The `prisma` latest tag is `8.0.0-rc.19`, a release candidate, and it is inside the same advisory range. No schema migration was added.
- NestJS 12 is not applied. The platform advisory is fixed in 11.2.7. `@nestjs/schematics` 12 requires Node `^22.22.3 || ^24.15.0 || >=26`, and this environment is Node 22.14.0.
- TypeScript stays at 5.9.3, already the latest 5.x. TypeScript 7.0.2 is outside the `typescript-eslint` 8.71 peer range (`<6.1.0`). TypeScript 6.0.3 is a compiler major and was not required for the advisory fixes.
- ESLint stays at 9.39.5. ESLint 10 is the current major and the repo already uses flat config, but the existing type-checked config reports 386 errors on ESLint 9 and 402 on ESLint 10. That is a lint cleanup, not a package bump. `npm audit` is clean on 9.39.5.
- dotenv stays at 17.4.2. Application code does not import it, and `@nestjs/config` still depends on dotenv 17. dotenv 18 was not applied.
- `@types/node` stays on the 24 line. CI and this environment run Node 22, so Node 26 types were not applied.
- Android Gradle Plugin 9.4.1 needs Gradle 9.6.0 or newer. Kotlin 2.4.20's fully supported Android Gradle Plugin ceiling is 9.3.1. Kotlin 2.4.10 still lists 9.1.0 as its fully supported ceiling, which matches the current plugin. No Android SDK is installed here, so Gradle 9.3.1, Android Gradle Plugin 9.1.0, and Kotlin 2.4.0 were left unchanged.
- Flutter packages still blocked by their parents: `dbus` 0.8.0, `gsettings` 0.2.9, `material_color_utilities` 0.13.1, `window_to_front` 1.0.0, and `test_api` 0.7.14.

## Final control state

Promotion is automatic. The first queued unconsumed item is authorized. This run does not execute it.

- `DEPENDENCY-MAINTENANCE-001` completed and appended once to `consumed.md`
- `STABILIZATION-001` is active
- `active_id: STABILIZATION-001`
- `promotion: automatic` unchanged
- `handoff_generation: 23`
- `handoff_state: authorized`
- `paused: false`
- `next-task.md`: `STABILIZATION-001`, Generation 23, Handoff-From `DEPENDENCY-MAINTENANCE-001`, Authorization `authorized`

## Checks

Node 22.14.0, in `apps/api`:

- After the NestJS 11.2.7 group: `npm test -- --runInBand --no-coverage` — 34 suites, 232 tests passed
- After nodemailer 10: `npx tsc --noEmit -p tsconfig.build.json` and `npx jest src/auth/auth.password.spec.ts --runInBand --no-coverage` — passed
- Final, with Prisma 5.22.0 regenerated: `npm test -- --runInBand --no-coverage` — 34 suites, 232 tests passed; `npm run build` — passed; `npm audit` — 0 vulnerabilities
- `npx prisma migrate diff` was run only while evaluating Prisma 6.19.3 against local Postgres 16. The diff was empty, and Prisma 6 was not kept.

Flutter 3.47.6 / Dart 3.13.5, in `apps/mobile`:

- `flutter analyze` — no issues
- `flutter test` — 109 tests passed

Android build was not run. `flutter doctor` reports no Android SDK. iOS was not validated.

## Architecture / config

Flutter -> NestJS -> provider stays the same. Secrets stay server-side. No schema migration, new provider, or paid service. `google_fonts` 9 and `cupertino_icons` 2 bring their published `material_ui` and `cupertino_ui` packages transitively. `dev` and `main` were not modified.

## Remaining

No Android emulator or device pass was run. `STABILIZATION-001` is authorized for a later run. This run stops after merge.
