import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:motorcycle_clothing/domain/activity.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/l10n/ui_labels.dart';
import 'package:motorcycle_clothing/services/api_client.dart';
import 'package:motorcycle_clothing/state/activity_context.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';
import 'package:motorcycle_clothing/widgets/common.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key, required this.onDone});

  final VoidCallback onDone;

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _selected = <AppActivity>{AppActivity.motorcycle};
  AppActivity _default = AppActivity.motorcycle;
  bool _showChooser = true;
  int _cold = 0;
  bool _busy = false;
  int _step = 0;

  Future<void> _finish() async {
    setState(() => _busy = true);
    final api = context.read<ApiClient>();
    final activity = context.read<ActivityContext>();
    try {
      await api.post('/users/me/onboarding', {
        'interestedActivities': _selected.map((e) => e.apiValue).toList(),
        'defaultActivity': _default.apiValue,
        'showActivityChooserOnLaunch': _showChooser,
        'coldSensitivity': _cold,
      }, auth: true);
      await activity.completeOnboardingLocal(
        defaultActivity: _default,
        showChooser: _showChooser,
      );
      widget.onDone();
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              localizeUserError(e, AppLocalizations.of(context)),
            ),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return AtmosphereBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const BrandMark(compact: true),
                const SizedBox(height: 8),
                Text(
                  _step == 0
                      ? l10n.onboardingInterests
                      : _step == 1
                          ? l10n.onboardingOpen
                          : l10n.onboardingTemperature,
                  style: GoogleFonts.sourceSerif4(
                    fontSize: 22,
                    color: AppTheme.steel,
                  ),
                ),
                const SizedBox(height: 20),
                Expanded(child: _stepBody(l10n)),
                FilledButton(
                  onPressed: _busy
                      ? null
                      : () {
                          if (_step < 2) {
                            setState(() => _step += 1);
                          } else {
                            _finish();
                          }
                        },
                  child: Text(_step < 2 ? l10n.commonContinue : l10n.onboardingStart),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _stepBody(AppLocalizations l10n) {
    if (_step == 0) {
      return ListView(
        children: AppActivity.selectable.map((a) {
          final on = _selected.contains(a);
          return CheckboxListTile(
            value: on,
            title: Text(activityLabel(l10n, a)),
            subtitle: a.hasRecommendationEngine
                ? null
                : Text(l10n.onboardingComingLater),
            onChanged: (v) {
              setState(() {
                if (v == true) {
                  _selected.add(a);
                } else if (_selected.length > 1) {
                  _selected.remove(a);
                }
                if (!_selected.contains(_default)) {
                  _default = _selected.first;
                }
              });
            },
          );
        }).toList(),
      );
    }
    if (_step == 1) {
      return ListView(
        children: [
          Text(l10n.profileDefaultActivity, style: GoogleFonts.barlowCondensed(fontSize: 18)),
          ..._selected.map(
            (a) => ListTile(
              title: Text(activityLabel(l10n, a)),
              selected: _default == a,
              trailing: _default == a ? const Icon(Icons.check) : null,
              onTap: () => setState(() => _default = a),
            ),
          ),
          SwitchListTile(
            title: Text(l10n.onboardingShowChooser),
            value: _showChooser,
            onChanged: (v) => setState(() => _showChooser = v),
          ),
        ],
      );
    }
    return Column(
      children: [
        ListTile(
          title: Text(l10n.onboardingCold),
          selected: _cold == -1,
          trailing: _cold == -1 ? const Icon(Icons.check) : null,
          onTap: () => setState(() => _cold = -1),
        ),
        ListTile(
          title: Text(l10n.onboardingAverage),
          selected: _cold == 0,
          trailing: _cold == 0 ? const Icon(Icons.check) : null,
          onTap: () => setState(() => _cold = 0),
        ),
        ListTile(
          title: Text(l10n.onboardingWarm),
          selected: _cold == 1,
          trailing: _cold == 1 ? const Icon(Icons.check) : null,
          onTap: () => setState(() => _cold = 1),
        ),
      ],
    );
  }
}
