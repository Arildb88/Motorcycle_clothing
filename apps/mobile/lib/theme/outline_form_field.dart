import 'package:flutter/material.dart';

/// Slot for one outlined form field whose label floats on the border.
///
/// Flutter's outline [InputDecorator] does not include the floating label in
/// the field's layout height. It paints the label at
/// `-(labelHeight * 0.75) / 2`, halfway above the border
/// (`_kFinalLabelScale` in `input_decorator.dart`). A gap between fields is
/// therefore eaten by the label, which collides with the outline above it.
///
/// This slot reserves that overhang inside the field and keeps [fieldGap] of
/// clear space between the previous outline and this label. [fieldGap] is the
/// same 12px rhythm used between other RideWear form controls.
class OutlineFormField extends StatelessWidget {
  const OutlineFormField({super.key, required this.child});

  final Widget child;

  /// Clear space between the previous outline and this floating label.
  static const double fieldGap = 12;

  /// Must match Flutter's outline floating-label scale.
  static const double labelScale = 0.75;

  /// How far the floating label paints above the field's top border.
  static double labelOverhang(BuildContext context) {
    final theme = Theme.of(context);
    final style =
        theme.inputDecorationTheme.floatingLabelStyle ??
        theme.inputDecorationTheme.labelStyle ??
        theme.textTheme.bodyLarge ??
        const TextStyle(fontSize: 16);
    final painter = TextPainter(
      text: TextSpan(text: 'Ag', style: style),
      textDirection: Directionality.of(context),
      textScaler: MediaQuery.textScalerOf(context),
      maxLines: 1,
    )..layout();
    final border =
        theme.inputDecorationTheme.enabledBorder ??
        theme.inputDecorationTheme.border;
    final strokeOffset = border?.borderSide.strokeOffset ?? 0;
    final overhang = (painter.height * labelScale) / 2 + strokeOffset / 2;
    return overhang < 0 ? 0 : overhang;
  }

  /// Top inset for one stacked outlined field.
  static double topSlot(BuildContext context) =>
      labelOverhang(context) + fieldGap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(top: topSlot(context)),
      child: child,
    );
  }
}
