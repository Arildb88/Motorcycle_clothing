import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';
import 'package:motorcycle_clothing/theme/outline_form_field.dart';

void main() {
  testWidgets('stacked outline labels stay clear of the field above', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: Scaffold(
          body: Column(
            children: [
              _field('Temperature', 'celsius', 'Celsius'),
              _field('Distance', 'kilometer', 'Kilometres'),
              _field('Riding speed', 'kmh', 'km/h'),
              _field('Wind speed', 'ms', 'm/s'),
            ],
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    final labels = ['Temperature', 'Distance', 'Riding speed', 'Wind speed'];
    final fields = find.byType(DropdownButtonFormField<String>);
    expect(fields, findsNWidgets(4));

    for (var i = 1; i < labels.length; i++) {
      final label = tester.getRect(find.text(labels[i]));
      final previous = tester.getRect(fields.at(i - 1));
      expect(
        label.top,
        greaterThanOrEqualTo(previous.bottom + OutlineFormField.fieldGap - 0.5),
        reason: '${labels[i]} floats into the outline above it',
      );
    }
  });
}

Widget _field(String label, String value, String valueLabel) {
  return OutlineFormField(
    child: DropdownButtonFormField<String>(
      // ignore: deprecated_member_use
      value: value,
      decoration: InputDecoration(labelText: label),
      items: [
        DropdownMenuItem(value: value, child: Text(valueLabel)),
      ],
      onChanged: (_) {},
    ),
  );
}
