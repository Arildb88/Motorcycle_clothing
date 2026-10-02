import 'package:flutter_test/flutter_test.dart';
import 'package:motorcycle_clothing/domain/activity.dart';
import 'package:motorcycle_clothing/state/activity_context.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('current activity change does not alter default', () async {
    final ctx = ActivityContext();
    await ctx.hydrateLocal();
    await ctx.setDefaultActivity(AppActivity.motorcycle);
    ctx.setCurrentActivity(AppActivity.cycling);
    expect(ctx.currentActivity, AppActivity.cycling);
    expect(ctx.defaultActivity, AppActivity.motorcycle);
  });

  test('chooser shows once per session when enabled', () async {
    final ctx = ActivityContext();
    await ctx.hydrateLocal();
    await ctx.setShowChooserOnLaunch(true);
    expect(ctx.shouldShowChooserOnLaunch(), isTrue);
    ctx.markChooserShownThisSession();
    expect(ctx.shouldShowChooserOnLaunch(), isFalse);
  });

  test('chooser skipped when preference off', () async {
    final ctx = ActivityContext();
    await ctx.hydrateLocal();
    await ctx.setShowChooserOnLaunch(false);
    expect(ctx.shouldShowChooserOnLaunch(), isFalse);
  });

  test('app brand name is set', () {
    expect(AppActivity.hiking.label, 'Hiking');
    expect(AppActivity.hiking.hasRecommendationEngine, isFalse);
    expect(AppActivity.motorcycle.hasRecommendationEngine, isTrue);
    expect(AppActivity.cycling.hasRecommendationEngine, isTrue);
    expect(AppActivity.alpineSkiing.hasRecommendationEngine, isTrue);
    expect(AppActivity.snowboarding.hasRecommendationEngine, isTrue);
    expect(AppActivity.xcSkiing.hasRecommendationEngine, isTrue);
  });

  test('profile activities stay on the API allow-list', () {
    expect(
      AppActivity.selectable.map((activity) => activity.apiValue).toList(),
      ['motorcycle', 'hiking', 'cycling'],
    );
    expect(AppActivity.alpineSkiing.apiValue, 'alpine_skiing');
    expect(AppActivity.xcSkiing.apiValue, 'xc_skiing');
    expect(AppActivity.snowboarding.apiValue, 'snowboarding');
    expect(
      AppActivity.sessionChoices.map((activity) => activity.apiValue),
      containsAll(['alpine_skiing', 'snowboarding', 'xc_skiing', 'cycling']),
    );
    expect(
      AppActivity.userFacingChoices
          .map((activity) => activity.apiValue)
          .toList(),
      ['motorcycle', 'hiking', 'cycling', 'alpine_skiing', 'xc_skiing'],
    );
    expect(AppActivity.alpineSkiing.savedRouteActivityTypes, [
      'alpine_skiing',
      'snowboarding',
    ]);
    expect(
      AppActivity.snowboarding.savedRouteActivityTypes,
      AppActivity.alpineSkiing.savedRouteActivityTypes,
    );
    expect(AppActivity.xcSkiing.savedRouteActivityTypes, ['xc_skiing']);
    expect(AppActivity.hiking.hasRecommendationEngine, isFalse);
  });

  test('resort menu keeps the current discipline', () async {
    final ctx = ActivityContext();
    await ctx.hydrateLocal();
    ctx.setCurrentActivity(AppActivity.snowboarding);
    ctx.selectUserFacingActivity(AppActivity.alpineSkiing);
    expect(ctx.currentActivity, AppActivity.snowboarding);
    ctx.selectUserFacingActivity(AppActivity.cycling);
    expect(ctx.currentActivity, AppActivity.cycling);
    ctx.selectUserFacingActivity(AppActivity.alpineSkiing);
    expect(ctx.currentActivity, AppActivity.alpineSkiing);
  });
}
