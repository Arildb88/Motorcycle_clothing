import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:motorcycle_clothing/theme/app_scroll_behavior.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';

void main() {
  testWidgets('overflowing vertical content gets a scrollbar', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        scrollBehavior: const AppScrollBehavior(),
        home: ListView(
          children: List.generate(40, (i) => Text('row $i')),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byType(Scrollbar), findsOneWidget);
    final position = tester.state<ScrollableState>(find.byType(Scrollable)).position;
    expect(position.maxScrollExtent, greaterThan(0));
  });

  testWidgets('content that fits does not report a scroll extent', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        scrollBehavior: const AppScrollBehavior(),
        home: ListView(
          children: const [Text('only row')],
        ),
      ),
    );
    await tester.pumpAndSettle();

    final position = tester.state<ScrollableState>(find.byType(Scrollable)).position;
    expect(position.maxScrollExtent, 0);
  });
}
