import 'package:flutter/material.dart';
import 'package:motorcycle_clothing/domain/activity.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/l10n/ui_labels.dart';

/// Alpine skiing or snowboarding inside the shared resort planner.
///
/// This does not change exposure, weather, or thermal offsets. Both values
/// stay on the existing recommendation engines.
class ResortDisciplineControl extends StatelessWidget {
  const ResortDisciplineControl({
    super.key,
    required this.activityType,
    required this.onChanged,
  });

  final String activityType;
  final ValueChanged<AppActivity> onChanged;

  @override
  Widget build(BuildContext context) {
    final selected = AppActivity.fromApi(activityType);
    if (!selected.isResortSnowSport) return const SizedBox.shrink();
    final l10n = AppLocalizations.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(l10n.plannerResortDiscipline),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final discipline in AppActivity.resortDisciplines)
              ChoiceChip(
                label: Text(activityLabel(l10n, discipline)),
                selected: selected == discipline,
                onSelected: (_) => onChanged(discipline),
              ),
          ],
        ),
        const SizedBox(height: 12),
      ],
    );
  }
}
