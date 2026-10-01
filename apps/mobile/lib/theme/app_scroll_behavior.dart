import 'package:flutter/material.dart';

/// Shows a theme-styled vertical scrollbar on every platform when a view
/// can actually scroll. Horizontal lists stay unchanged. Flutter hides the
/// thumb when [ScrollMetrics.maxScrollExtent] is zero.
class AppScrollBehavior extends MaterialScrollBehavior {
  const AppScrollBehavior();

  @override
  Widget buildScrollbar(
    BuildContext context,
    Widget child,
    ScrollableDetails details,
  ) {
    switch (axisDirectionToAxis(details.direction)) {
      case Axis.horizontal:
        return child;
      case Axis.vertical:
        return Scrollbar(controller: details.controller, child: child);
    }
  }
}
