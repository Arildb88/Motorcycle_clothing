import 'dart:async';

import 'package:flutter/material.dart';
import 'package:motorcycle_clothing/services/resorts/fnugg_source.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';
import 'package:url_launcher/url_launcher.dart';

/// Opens a Fnugg attribution link in the external browser.
Future<void> openFnuggAttribution(Uri uri) async {
  final allowed = fnuggAttributionUri(uri.toString());
  try {
    await launchUrl(allowed, mode: LaunchMode.externalApplication);
  } catch (_) {
    // A failed browser handoff leaves the attribution text in place.
  }
}

/// Readable Fnugg attribution. Same size as body text, not microtext.
class FnuggAttributionLink extends StatelessWidget {
  const FnuggAttributionLink({
    super.key,
    required this.label,
    required this.uri,
    this.onOpen,
  });

  final String label;
  final Uri uri;
  final Future<void> Function(Uri uri)? onOpen;

  static const TextStyle labelStyle = TextStyle(
    fontSize: 14,
    height: 1.4,
    color: AppTheme.steel,
    decoration: TextDecoration.underline,
    decorationColor: AppTheme.steel,
  );

  @override
  Widget build(BuildContext context) {
    return TextButton(
      style: TextButton.styleFrom(
        foregroundColor: AppTheme.steel,
        minimumSize: const Size(48, 48),
        padding: const EdgeInsets.symmetric(vertical: 8),
        alignment: Alignment.centerLeft,
        tapTargetSize: MaterialTapTargetSize.padded,
        textStyle: labelStyle,
      ),
      onPressed: () {
        final open = onOpen ?? openFnuggAttribution;
        unawaited(open(uri));
      },
      child: Text(label, style: labelStyle),
    );
  }
}
