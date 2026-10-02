import 'package:flutter_test/flutter_test.dart';
import 'package:motorcycle_clothing/features/plan/recommendation_presentation.dart';

void main() {
  test(
    'splits wear, pack, kit reasons, and limits without inventing elevation',
    () {
      final view = presentRecommendation({
        'route': {'startLabel': 'Depot', 'endLabel': 'Pass'},
        'recommendation': {
          'effectiveTempC': -3.2,
          'wear': [
            {'garmentName': 'Shell'},
          ],
          'pack': [
            {'genericLabel': 'Gloves'},
          ],
          'reasons': [
            {'code': 'SUSTAINED_COLD_EXPOSURE'},
            {'code': 'BASELINE_NO_PERSONAL_EVIDENCE'},
            {'code': 'ELEVATION_USED'},
            {'code': 'UNKNOWN_CODE'},
          ],
          'confidence': {
            'level': 'LOW',
            'reasons': ['INCOMPLETE_WEATHER', 'BASELINE_NO_PERSONAL_EVIDENCE'],
          },
        },
      });

      expect(view.wear.single['garmentName'], 'Shell');
      expect(view.pack.single['genericLabel'], 'Gloves');
      expect(view.kitReasons, ['SUSTAINED_COLD_EXPOSURE', 'UNKNOWN_CODE']);
      expect(view.contextNotes, ['ELEVATION_USED']);
      expect(view.limitReasons, [
        'BASELINE_NO_PERSONAL_EVIDENCE',
        'INCOMPLETE_WEATHER',
      ]);
      expect(view.confidenceLevel, 'LOW');
      expect(view.routeLine, 'Depot → Pass');
      expect(view.exposureC, -3.2);
      expect(view.hasElevationRange, isFalse);
      expect(view.sites, isEmpty);
      expect(view.elevationAttribution, isNull);
    },
  );

  test('uses saved-point heights only when no mountain sites are present', () {
    final view = presentRecommendation({
      'weather': {
        'points': [
          {'groundElevationM': 120},
          {'groundElevationM': null},
          {'groundElevationM': 940.2},
        ],
        'elevation': {'attribution': '© Kartverket'},
      },
      'recommendation': {
        'elevation': 'partial',
        'reasons': [
          {'code': 'ELEVATION_PARTIAL'},
        ],
      },
    });

    expect(view.elevationMinM, 120);
    expect(view.elevationMaxM, 940);
    expect(view.elevationAttribution, '© Kartverket');
    expect(view.limitReasons, ['ELEVATION_PARTIAL']);
    expect(view.contextNotes, isEmpty);
  });

  test('keeps estimated mid height and does not invent a missing summit', () {
    final view = presentRecommendation({
      'recommendation': {
        'exposure': {
          'baseTempC': 2,
          'midTempC': -4.2,
          'upperTempC': null,
          'sites': [
            {'role': 'base', 'elevationM': 200, 'estimated': false},
            {'role': 'mid', 'elevationM': 800, 'estimated': true},
            {'role': 'upper', 'elevationM': null, 'estimated': false},
          ],
        },
        'reasons': [
          {'code': 'UPPER_MOUNTAIN_SETS_KIT'},
          {'code': 'VILLAGE_WEATHER_NOT_USED_AS_SUMMIT'},
          {'code': 'UPPER_SITE_MISSING'},
          {'code': 'MID_ELEVATION_ESTIMATED'},
        ],
        'confidence': {'level': 'LOW', 'reasons': []},
      },
    });

    expect(view.sites, hasLength(2));
    expect(view.sites[0].role, 'base');
    expect(view.sites[0].airTempC, 2);
    expect(view.sites[0].elevationM, 200);
    expect(view.sites[0].estimated, isFalse);
    expect(view.sites[1].role, 'mid');
    expect(view.sites[1].estimated, isTrue);
    expect(view.sites[1].airTempC, -4.2);
    expect(view.sites.map((site) => site.role), isNot(contains('upper')));
    expect(view.hasElevationRange, isFalse);
    expect(view.kitReasons, ['UPPER_MOUNTAIN_SETS_KIT']);
    expect(view.limitReasons, [
      'VILLAGE_WEATHER_NOT_USED_AS_SUMMIT',
      'UPPER_SITE_MISSING',
      'MID_ELEVATION_ESTIMATED',
    ]);
  });
}
