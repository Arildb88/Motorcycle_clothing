import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/services/api_client.dart';

const thermalFeedbackActivities = <String>{
  'motorcycle',
  'hiking',
  'cycling',
  'alpine_skiing',
  'snowboarding',
  'xc_skiing',
};

/// Cold / comfortable / hot feedback for the recommendation on screen.
/// The activity comes from that payload. A missing activity does not default
/// to motorcycle, so one sport cannot update another sport's offset.
Future<void> showFeedbackSheet(
  BuildContext context,
  Map<String, dynamic> recommendPayload,
) async {
  String? selected;
  final route = recommendPayload['route'];
  final routeMap = route is Map
      ? Map<String, dynamic>.from(route)
      : const <String, dynamic>{};
  final activityType = routeMap['activityType']?.toString();
  final knownActivity =
      activityType != null && thermalFeedbackActivities.contains(activityType);

  await showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    builder: (ctx) {
      return StatefulBuilder(
        builder: (ctx, setModal) {
          final l10n = AppLocalizations.of(ctx);
          final ratings = <String, String>{
            'too_cold': l10n.feedbackTooCold,
            'ok': l10n.feedbackJustRight,
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
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: ratings.entries.map((e) {
                    final selectedNow = selected == e.key;
                    return ChoiceChip(
                      key: Key('thermal-feedback-${e.key}'),
                      label: Text(e.value),
                      selected: selectedNow,
                      onSelected: (_) => setModal(() => selected = e.key),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  key: const Key('thermal-feedback-submit'),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(48, 48),
                  ),
                  onPressed: selected == null || !knownActivity
                      ? null
                      : () async {
                          final api = context.read<ApiClient>();
                          final departure = recommendPayload['departureAt'];
                          final weather = recommendPayload['weather'];
                          final recommendation =
                              recommendPayload['recommendation'];
                          final body = <String, dynamic>{
                            'activityType': activityType,
                            'departureAt': departure is String
                                ? departure
                                : DateTime.now().toUtc().toIso8601String(),
                            'weatherSnapshot': weather is Map
                                ? Map<String, dynamic>.from(weather)
                                : <String, dynamic>{},
                            'recommendation': recommendation is Map
                                ? Map<String, dynamic>.from(recommendation)
                                : <String, dynamic>{},
                            'rating': selected,
                          };
                          final routeId = routeMap['id'];
                          if (routeId is String && routeId.isNotEmpty) {
                            body['routeId'] = routeId;
                          }
                          final planId = recommendPayload['planId'];
                          if (planId is String && planId.isNotEmpty) {
                            body['planId'] = planId;
                          }
                          await api.post('/feedback', body, auth: true);
                          if (ctx.mounted) Navigator.pop(ctx);
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text(l10n.feedbackThanks)),
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
