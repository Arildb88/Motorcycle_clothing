import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:motorcycle_clothing/domain/activity.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/l10n/app_localizations_en.dart';
import 'package:motorcycle_clothing/l10n/app_localizations_nb.dart';
import 'package:motorcycle_clothing/l10n/reason_lookup.dart';
import 'package:motorcycle_clothing/l10n/ui_labels.dart';
import 'package:motorcycle_clothing/services/api_client.dart';
import 'package:motorcycle_clothing/services/location/location_models.dart';
import 'package:motorcycle_clothing/state/locale_controller.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('Norwegian covers the main user-facing surfaces', () {
    final en = AppLocalizationsEn();
    final nb = AppLocalizationsNb();

    expect(activityLabel(en, AppActivity.motorcycle), 'Motorcycle');
    expect(activityLabel(nb, AppActivity.motorcycle), 'Motorsykkel');
    expect(activityLabel(nb, AppActivity.hiking), 'Fottur');
    expect(activityLabel(nb, AppActivity.cycling), 'Sykling');
    expect(activityLabel(nb, AppActivity.alpineSkiing), 'Alpint');
    expect(activityLabel(nb, AppActivity.snowboarding), 'Snøbrett');
    expect(activityLabel(nb, AppActivity.xcSkiing), 'Langrenn');

    expect(waypointRole(nb, 0, 3), 'Start');
    expect(waypointRole(nb, 1, 3), 'Stopp 1');
    expect(waypointRole(nb, 2, 3), 'Destinasjon');

    expect(garmentCategoryLabel(nb, 'shell_jacket'), 'Skalljakke');
    expect(garmentPresetLabel(nb, 'motorcycle_jeans'), 'Mc-jeans');
    expect(configCodeLabel(nb, 'VENTS_OPEN'), 'ventiler åpne');
    expect(routeDuration(nb, 90), '~1 t 30 min');

    expect(nb.navToday, 'I dag');
    expect(nb.navRoutes, 'Ruter');
    expect(nb.navWardrobe, 'Garderobe');
    expect(nb.navProfile, 'Profil');
    expect(nb.routesTitle, 'Lagrede ruter');
    expect(nb.feedbackTitle, 'Hvordan kjentes antrekket?');
    expect(nb.placeSearchHint, 'Søk etter sted eller adresse');
    expect(nb.onboardingStart, 'Start RideWear');
    expect(nb.mapSelectEndpoints, isNot(en.mapSelectEndpoints));
    expect(nb.profileSignOut, 'Logg ut');
    expect(nb.wardrobeEmptyTitle, 'Ingen plagg lagt til');
    expect(nb.wardrobeDemoBadge, 'DEMO');
    expect(nb.wardrobeDeleteDemo, 'Slett demo-garderobe');
    expect(en.wardrobeDeleteDemo, 'Delete demo wardrobe');
    expect(nb.wardrobeDeleteDemoBody, isNot(en.wardrobeDeleteDemoBody));
    expect(nb.analysisRainChip('40%'), 'Regn 40%');
    expect(nb.reasonsSection, 'Hvorfor dette antrekket');
    expect(nb.limitsSection, 'Begrensninger og antakelser');
    expect(
      localizeReasonCode(
        'VILLAGE_WEATHER_NOT_USED_AS_SUMMIT',
        AppLocalizationsReasonLookup(nb),
      ),
      nb.reasonVillageWeatherNotUsedAsSummit,
    );
    expect(
      nb.reasonVillageWeatherNotUsedAsSummit,
      isNot(en.reasonVillageWeatherNotUsedAsSummit),
    );
    expect(
      localizeReasonCode('NO_WAX_ADVICE', AppLocalizationsReasonLookup(en)),
      'This recommendation does not include wax advice.',
    );

    expect(
      localizeUserError(
        ApiException(
          'Road routing is temporarily unavailable.',
          code: 'ROUTING_UNAVAILABLE',
        ),
        nb,
      ),
      nb.routeRoutingUnavailable,
    );
    expect(
      localizeUserError(
        ApiException('Could not save route', statusCode: 500),
        nb,
      ),
      nb.errorGeneric,
    );
    expect(
      localizeLocationError(
        LocationProviderException('Place search failed', isNetwork: true),
        nb,
      ),
      nb.placeSearchFailed,
    );
  });

  test('switching language updates the locale without a new account', () async {
    SharedPreferences.setMockInitialValues({});
    final controller = LocaleController();
    await controller.hydrate();
    await controller.setPreferred('en');
    expect(controller.locale.languageCode, 'en');
    await controller.setPreferred('nb');
    expect(controller.locale.languageCode, 'nb');
    expect(controller.preferredCode, 'nb');
    await controller.setPreferred('en');
    expect(controller.locale.languageCode, 'en');
  });

  testWidgets('MaterialApp locale switch exposes Norwegian strings', (
    tester,
  ) async {
    Future<AppLocalizations> load(Locale locale) async {
      late AppLocalizations l10n;
      await tester.pumpWidget(
        MaterialApp(
          locale: locale,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: Builder(
            builder: (context) {
              l10n = AppLocalizations.of(context);
              return const SizedBox.shrink();
            },
          ),
        ),
      );
      await tester.pumpAndSettle();
      return l10n;
    }

    final en = await load(const Locale('en'));
    final nb = await load(const Locale('nb'));
    expect(en.commonSave, 'Save');
    expect(nb.commonSave, 'Lagre');
    expect(nb.plannerTitle, isNot(en.plannerTitle));
    expect(nb.authForgotPasswordTitle, 'Glemt passord');
  });
}
