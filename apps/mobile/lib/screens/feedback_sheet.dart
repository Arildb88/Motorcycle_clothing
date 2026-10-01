import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/services/api_client.dart';

Future<void> showFeedbackSheet(
  BuildContext context,
  Map<String, dynamic> recommendPayload,
) async {
  String? selected;

  await showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    builder: (ctx) {
      return StatefulBuilder(
        builder: (ctx, setModal) {
          final l10n = AppLocalizations.of(ctx);
          final ratings = <String, String>{
            'too_cold': l10n.feedbackTooCold,
            'slightly_cold': l10n.feedbackSlightlyCold,
            'ok': l10n.feedbackJustRight,
            'slightly_warm': l10n.feedbackSlightlyWarm,
            'too_warm': l10n.feedbackTooWarm,
          };
          return Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  l10n.feedbackTitle,
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: ratings.entries.map((e) {
                    final selectedNow = selected == e.key;
                    return ChoiceChip(
                      label: Text(e.value),
                      selected: selectedNow,
                      onSelected: (_) => setModal(() => selected = e.key),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: selected == null
                      ? null
                      : () async {
                          final api = context.read<ApiClient>();
                          final route =
                              recommendPayload['route'] as Map<String, dynamic>;
                          await api.post('/feedback', {
                            'routeId': route['id'],
                            'departureAt': DateTime.now().toUtc().toIso8601String(),
                            'weatherSnapshot': recommendPayload['weather'],
                            'recommendation': recommendPayload['recommendation'],
                            'rating': selected,
                          }, auth: true);
                          if (ctx.mounted) Navigator.pop(ctx);
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(l10n.feedbackThanks),
                              ),
                            );
                          }
                        },
                  child: Text(l10n.feedbackSubmit),
                ),
              ],
            ),
          );
        },
      );
    },
  );
}
