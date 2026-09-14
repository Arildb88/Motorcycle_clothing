import 'package:flutter_test/flutter_test.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:flutter/material.dart';

void main() {
  testWidgets('units labels exist in English and Norwegian', (tester) async {
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
    expect(en.unitsSection, 'Units');
    expect(en.unitsTemperature, 'Temperature');
    expect(en.unitCelsius, contains('Celsius'));
    expect(en.unitsPresetMetric, 'Metric');

    final nb = await load(const Locale('nb'));
    expect(nb.unitsSection, 'Enheter');
    expect(nb.unitsTemperature, 'Temperatur');
    expect(nb.unitCelsius, contains('Celsius'));
    expect(nb.unitsPresetMetric, 'Metersystem');
  });
}
