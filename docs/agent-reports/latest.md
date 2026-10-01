# Norwegian localization completion

## Task

Norwegian localization completion. When the user selects Norwegian (`nb`), normal user-facing RideWear UI text uses Norwegian Bokmål through the existing Flutter gen-l10n setup (`apps/mobile/lib/l10n`, `app_en.arb` / `app_nb.arb`). English remains the template locale. No localization package was added.

Language switching uses the existing `LocaleController` (`preferred_language` in SharedPreferences, profile `preferredLanguage`). Changing English ↔ Norwegian updates `MaterialApp.locale` without creating a new account.

## Commit / PR

- Branch: `feature/nb-localization-completion` from `dev_test` (`24cc7f4`)
- Commit: recorded in the follow-up docs commit on this branch
- PR: against `dev_test` only. Not merged to `dev` or `main`.

## Files changed

- `apps/mobile/lib/l10n/app_en.arb`, `app_nb.arb`, generated `app_localizations*.dart`
- `apps/mobile/lib/l10n/ui_labels.dart` (activity, waypoint, route, garment, kit, and error helpers)
- Screens: home, routes, profile, wardrobe, garment form, route editor, planner, analysis, onboarding, activity chooser, activity home, feedback sheet, place search, map preview, forgot-password success copy
- `apps/mobile/lib/services/auth_errors.dart`, `services/location/route_preview_copy.dart`, `fake_location_services.dart`
- `apps/mobile/test/nb_localization_test.dart`

## Areas audited

- Navigation (Today, Routes, Wardrobe, Profile)
- Home recommendations, kit lines, confidence, feedback
- Profile / settings, units, login methods, account actions
- Authentication (login, register, forgot/reset/change password) — already localized; unknown API text no longer passes through in English
- Wardrobe and garment form (categories, materials, presets, tiers)
- Recommendations and ride analysis chips
- Route planner, route editor, saved routes
- Activity chooser, activity home, onboarding
- Validation, dialogs, buttons, empty states, loading/error/success
- Place search and route-preview notices
- Units and preferences
- Tooltips and field labels used as accessibility text

## Remaining intentionally untranslated text

- Product and provider names: RideWear, Facebook, Microsoft, Strava, HeiGIT, OpenRouteService
- Place names returned by search (for example Kristiansand)
- Brand example in the garment name hint: Dainese Carve Master
- Established material words: Mesh, Denim, Merino
- Unit symbols: °C, °F, km, mi, km/h, mph, m/s, and the short label “Temp”
- Domain helpers kept in English for existing tests: `AppActivity.label`, `WaypointListOps.roleLabel`. Widgets use `ui_labels.dart` instead
- Internal identifiers, API codes, logs, URLs, and test descriptions
- Unknown reason codes, garment categories, and configuration codes fall back to the identifier
- Model fallback route name `Ride plan` only if a save body is built with an empty name. The planner fills `Turplan` / `Ride plan` from l10n before saving
- Device-location default parameter `Current location` when a caller omits a label. The planner passes the localized label

## flutter analyze

`apps/mobile`: `flutter analyze` — no issues.

## flutter test

`apps/mobile`: `flutter test` — 57 tests passed, including `nb_localization_test.dart` (Norwegian strings, error mapping, and locale switch without a new account).

## Manual checks recommended

- Sign in, open Profile, switch Language from English to Norsk and back. Confirm Home, Routes, Wardrobe, Profile, planner, and wardrobe update immediately without creating a new account.
- Walk onboarding, the activity chooser, an empty wardrobe, the garment form, a saved-route delete dialog, place search with no results, and the ride-feedback sheet in Norwegian.
- Trigger a failed route preview and a failed save and confirm the message is Norwegian rather than a raw API sentence.
