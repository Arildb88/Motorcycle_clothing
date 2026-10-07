import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:motorcycle_clothing/features/plan/device_location_service.dart';
import 'package:motorcycle_clothing/features/plan/ride_planner_screen.dart';
import 'package:motorcycle_clothing/features/profile/profile_settings_screen.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/screens/login_screen.dart';
import 'package:motorcycle_clothing/services/api_client.dart';
import 'package:motorcycle_clothing/services/location/fake_location_services.dart';
import 'package:motorcycle_clothing/services/location/location_services.dart';
import 'package:motorcycle_clothing/services/resorts/resort_directory.dart';
import 'package:motorcycle_clothing/services/resorts/ski_resort.dart';
import 'package:motorcycle_clothing/state/activity_context.dart';
import 'package:motorcycle_clothing/state/auth_state.dart';
import 'package:motorcycle_clothing/state/locale_controller.dart';
import 'package:motorcycle_clothing/state/unit_preferences_controller.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  testWidgets('filled buttons keep a 48dp touch target', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: Scaffold(
          body: FilledButton(onPressed: () {}, child: const Text('Save')),
        ),
      ),
    );

    final size = tester.getSize(find.byType(FilledButton));
    expect(size.height, greaterThanOrEqualTo(48));
    expect(size.width, greaterThanOrEqualTo(48));
  });

  testWidgets('profile load failure stays on screen and can be retried', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final api = _QuietApi()..failMe = true;
    await tester.pumpWidget(_profileApp(api));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    expect(find.byKey(const Key('profile-load-error')), findsOneWidget);
    expect(find.byType(CircularProgressIndicator), findsNothing);
    expect(
      find.text('Something went wrong. Please try again.'),
      findsOneWidget,
    );

    api.failMe = false;
    await tester.tap(find.widgetWithText(FilledButton, 'Retry'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    expect(find.byKey(const Key('profile-load-error')), findsNothing);
    expect(find.text('Save profile'), findsOneWidget);
  });

  testWidgets('login validation stays on the form', (tester) async {
    final api = _QuietApi();
    await tester.pumpWidget(_loginApp(api));
    await tester.pump();

    await tester.tap(find.widgetWithText(FilledButton, 'Continue with email'));
    await tester.pump();

    expect(find.byKey(const Key('login-form-error')), findsOneWidget);
    expect(find.text('Enter a valid email address.'), findsOneWidget);
    expect(find.byType(SnackBar), findsNothing);
  });

  testWidgets('alpine planning does not use road-route labels', (tester) async {
    tester.view.physicalSize = const Size(400, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(_plannerApp(activityType: 'alpine_skiing'));
    await tester.pump();

    expect(find.text('Route options'), findsNothing);
    expect(find.text('e.g. Work commute'), findsNothing);
    expect(find.text('Avoid motorways'), findsNothing);
    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is TextField && widget.decoration?.labelText == 'Name',
      ),
      findsOneWidget,
    );
    expect(find.text('Lifts'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('a narrow planner keeps departure and arrival on screen', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(_plannerApp(activityType: 'motorcycle'));
    await tester.pump();

    expect(find.text('Departure'), findsOneWidget);
    expect(find.text('Arrival'), findsOneWidget);
    expect(find.text('Route options'), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is TextField &&
            widget.decoration?.labelText == 'Route name' &&
            widget.decoration?.hintText == 'e.g. Work commute',
      ),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });
}

Widget _profileApp(_QuietApi api) {
  return MultiProvider(
    providers: [
      Provider<ApiClient>.value(value: api),
      ChangeNotifierProvider<AuthState>(create: (_) => AuthState(api)),
      ChangeNotifierProvider<ActivityContext>(create: (_) => ActivityContext()),
      ChangeNotifierProvider<LocaleController>(
        create: (_) => LocaleController(),
      ),
      ChangeNotifierProvider<UnitPreferencesController>(
        create: (_) => UnitPreferencesController(),
      ),
    ],
    child: MaterialApp(
      theme: AppTheme.light(),
      locale: const Locale('en'),
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: const Scaffold(body: ProfileSettingsScreen()),
    ),
  );
}

Widget _loginApp(_QuietApi api) {
  return MultiProvider(
    providers: [
      Provider<ApiClient>.value(value: api),
      ChangeNotifierProvider<AuthState>(create: (_) => AuthState(api)),
    ],
    child: MaterialApp(
      theme: AppTheme.light(),
      locale: const Locale('en'),
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: const LoginScreen(),
    ),
  );
}

Widget _plannerApp({required String activityType}) {
  return MultiProvider(
    providers: [
      Provider<LocationServices>(
        create: (_) => LocationServices(
          search: FakeLocationSearchService(),
          geometry: FakeRouteGeometryService(),
        ),
      ),
      Provider<DeviceLocationService>(
        create: (_) => FakeDeviceLocationService(),
      ),
      Provider<ResortDirectory>(create: (_) => _EmptyResorts()),
    ],
    child: MaterialApp(
      theme: AppTheme.light(),
      locale: const Locale('en'),
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: RidePlannerScreen(activityType: activityType),
    ),
  );
}

class _EmptyResorts implements ResortDirectory {
  @override
  Future<List<SkiResort>> nearby({
    required double lat,
    required double lon,
  }) async {
    return const [];
  }

  @override
  Future<List<SkiResort>> searchByName(String query) async => const [];
}

class _QuietApi extends ApiClient {
  _QuietApi() : super(baseUrl: 'http://example.test');

  bool failMe = false;

  @override
  Future<Map<String, dynamic>> get(String path, {bool auth = true}) async {
    if (path == '/users/me') {
      if (failMe) throw ApiException('unavailable', statusCode: 503);
      return {
        'email': 'ase@example.com',
        'displayName': 'Åse',
        'authIdentities': [
          {'provider': 'local', 'providerEmail': 'ase@example.com'},
        ],
        'connectedAccounts': <Map<String, dynamic>>[],
        'profile': <String, dynamic>{
          'defaultActivity': 'cycling',
          'showActivityChooserOnLaunch': false,
          'onboardingCompleted': true,
        },
      };
    }
    if (path == '/auth/providers') {
      return {
        'facebook': {'enabled': false},
        'microsoft': {'enabled': false},
        'demoOAuthAllowed': false,
      };
    }
    if (path == '/connections/status') {
      return {
        'strava': {'enabled': false},
      };
    }
    throw UnsupportedError(path);
  }
}
