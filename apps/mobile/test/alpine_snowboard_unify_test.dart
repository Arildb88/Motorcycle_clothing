import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:motorcycle_clothing/domain/activity.dart';
import 'package:motorcycle_clothing/domain/saved_route.dart';
import 'package:motorcycle_clothing/features/activity/activity_chooser_screen.dart';
import 'package:motorcycle_clothing/features/plan/device_location_service.dart';
import 'package:motorcycle_clothing/features/plan/resort_discipline_control.dart';
import 'package:motorcycle_clothing/features/plan/ride_planner_screen.dart';
import 'package:motorcycle_clothing/features/plan/saved_activity_routes.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/services/location/fake_location_services.dart';
import 'package:motorcycle_clothing/services/location/location_models.dart';
import 'package:motorcycle_clothing/services/location/location_search_service.dart';
import 'package:motorcycle_clothing/services/location/location_services.dart';
import 'package:motorcycle_clothing/services/resorts/resort_directory.dart';
import 'package:motorcycle_clothing/services/resorts/ski_resort.dart';
import 'package:motorcycle_clothing/state/activity_context.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  test('resort route lists combine both stored disciplines once', () {
    SavedRoute route(String id, {bool favorite = false}) => SavedRoute(
      id: id,
      name: id,
      activityType: id.startsWith('s') ? 'snowboarding' : 'alpine_skiing',
      routeKind: 'point_to_point',
      isFavorite: favorite,
      isDefaultCommute: false,
      typicalDurationMin: 240,
      waypoints: const [],
    );

    final merged = mergeSavedRouteGroups([
      [route('alpine-fav', favorite: true), route('shared')],
      [route('shared'), route('snow')],
    ]);
    expect(merged.map((item) => item.id), ['alpine-fav', 'shared', 'snow']);
    expect(merged.first.isFavorite, isTrue);
  });

  testWidgets('chooser shows one resort entry and keeps hiking and langrenn', (
    tester,
  ) async {
    await _pumpChooser(tester, const Locale('en'));
    expect(find.text('Alpine & snowboard'), findsOneWidget);
    expect(find.text('Alpine skiing'), findsNothing);
    expect(find.text('Snowboarding'), findsNothing);
    expect(find.text('Cross-country skiing'), findsOneWidget);
    expect(find.text('Hiking'), findsOneWidget);
    expect(find.text('Soon'), findsOneWidget);
    expect(find.byType(FilledButton), findsNWidgets(5));
  });

  testWidgets('Norwegian chooser uses Alpint & snowboard', (tester) async {
    await _pumpChooser(tester, const Locale('nb'));
    expect(find.text('Alpint & snowboard'), findsOneWidget);
    expect(find.text('Snøbrett'), findsNothing);
    expect(find.text('Snowboard'), findsNothing);
    expect(find.text('Alpint'), findsNothing);
    expect(find.text('Langrenn'), findsOneWidget);
    expect(find.text('Fottur'), findsOneWidget);
  });

  testWidgets('discipline switch keeps the selected resort and skips Fnugg', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 2000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final directory = _CountingDirectory(
      const SkiResort(
        id: '141',
        name: 'Ål Skisenter',
        lat: 60.6301,
        lon: 8.5604,
      ),
    );
    final activity = ActivityContext();
    SharedPreferences.setMockInitialValues({});
    await activity.hydrateLocal();
    activity.setCurrentActivity(AppActivity.alpineSkiing);

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<ActivityContext>.value(value: activity),
          Provider<LocationServices>.value(
            value: LocationServices(
              search: _QuietPlaces(),
              geometry: FakeRouteGeometryService(),
            ),
          ),
          Provider<DeviceLocationService>.value(
            value: FakeDeviceLocationService(),
          ),
          Provider<ResortDirectory>.value(value: directory),
        ],
        child: const MaterialApp(
          locale: Locale('en'),
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: RidePlannerScreen(activityType: 'alpine_skiing'),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Skiing or snowboarding'), findsOneWidget);
    expect(find.text('Resort information from Fnugg.no'), findsOneWidget);
    expect(directory.searches, 0);

    final name = find.byWidgetPredicate(
      (widget) =>
          widget is TextField && widget.decoration?.labelText == 'Ski resort',
    );
    await tester.enterText(name, 'Ål');
    await tester.pump(const Duration(milliseconds: 400));
    await tester.tap(find.text('Ål Skisenter'));
    await tester.pump();
    expect(find.text('Selected resort: Ål Skisenter'), findsOneWidget);
    expect(directory.searches, 1);

    final snowboard = find.widgetWithText(ChoiceChip, 'Snowboarding');
    await tester.ensureVisible(snowboard);
    await tester.tap(snowboard);
    await tester.pump();

    expect(directory.searches, 1);
    expect(find.text('Selected resort: Ål Skisenter'), findsOneWidget);
    expect(
      tester
          .widget<ChoiceChip>(find.widgetWithText(ChoiceChip, 'Snowboarding'))
          .selected,
      isTrue,
    );
    expect(
      tester
          .widget<ChoiceChip>(find.widgetWithText(ChoiceChip, 'Alpine skiing'))
          .selected,
      isFalse,
    );
    expect(find.text('Lifts'), findsOneWidget);
    expect(activity.currentActivity, AppActivity.snowboarding);

    final alpine = find.widgetWithText(ChoiceChip, 'Alpine skiing');
    await tester.ensureVisible(alpine);
    await tester.tap(alpine);
    await tester.pump();
    expect(directory.searches, 1);
    expect(find.text('Selected resort: Ål Skisenter'), findsOneWidget);
    expect(activity.currentActivity, AppActivity.alpineSkiing);
  });

  testWidgets('Norwegian planner says Snowboard and keeps snowboarding', (
    tester,
  ) async {
    AppActivity? chosen;
    await tester.pumpWidget(
      MaterialApp(
        locale: const Locale('nb'),
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Scaffold(
          body: ResortDisciplineControl(
            activityType: 'alpine_skiing',
            onChanged: (activity) => chosen = activity,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Alpint eller snowboard'), findsOneWidget);
    expect(find.text('Snøbrett'), findsNothing);
    expect(find.text('Alpint'), findsOneWidget);
    expect(find.text('Snowboard'), findsOneWidget);
    expect(find.text('Snowboarding'), findsNothing);

    await tester.tap(find.widgetWithText(ChoiceChip, 'Snowboard'));
    await tester.pump();

    expect(chosen, AppActivity.snowboarding);
    expect(chosen!.apiValue, 'snowboarding');
  });
}

Future<void> _pumpChooser(WidgetTester tester, Locale locale) async {
  tester.view.physicalSize = const Size(800, 1400);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  SharedPreferences.setMockInitialValues({});
  final activity = ActivityContext();
  await activity.hydrateLocal();
  await tester.pumpWidget(
    ChangeNotifierProvider<ActivityContext>.value(
      value: activity,
      child: MaterialApp(
        locale: locale,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: ActivityChooserScreen(onChosen: (_) {}),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

class _CountingDirectory implements ResortDirectory {
  _CountingDirectory(this.hit);

  final SkiResort hit;
  int searches = 0;

  @override
  Future<List<SkiResort>> searchByName(String query) async {
    searches++;
    return [hit];
  }

  @override
  Future<List<SkiResort>> nearby({
    required double lat,
    required double lon,
  }) async {
    return const [];
  }
}

class _QuietPlaces implements LocationSearchService {
  @override
  Future<List<PlaceSuggestion>> autocomplete(
    String query, {
    String? sessionToken,
  }) async {
    return const [];
  }

  @override
  Future<ResolvedPlace> resolve(PlaceSuggestion suggestion) {
    throw UnimplementedError();
  }
}
