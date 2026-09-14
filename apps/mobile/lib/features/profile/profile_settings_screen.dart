import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:motorcycle_clothing/domain/activity.dart';
import 'package:motorcycle_clothing/services/api_client.dart';
import 'package:motorcycle_clothing/services/oauth_flow.dart';
import 'package:motorcycle_clothing/state/activity_context.dart';
import 'package:motorcycle_clothing/state/auth_state.dart';
import 'package:motorcycle_clothing/state/locale_controller.dart';
import 'package:motorcycle_clothing/state/unit_preferences_controller.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';

class ProfileSettingsScreen extends StatefulWidget {
  const ProfileSettingsScreen({super.key});

  @override
  State<ProfileSettingsScreen> createState() => _ProfileSettingsScreenState();
}

class _ProfileSettingsScreenState extends State<ProfileSettingsScreen> {
  Map<String, dynamic>? _me;
  Map<String, dynamic>? _providers;
  Map<String, dynamic>? _connectionStatus;
  bool _loading = true;
  final _name = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final api = context.read<ApiClient>();
    try {
      final me = await api.get('/users/me');
      final providers = await api.get('/auth/providers', auth: false);
      final connStatus = await api.get('/connections/status', auth: false);
      if (!mounted) return;
      _name.text = me['displayName']?.toString() ?? '';
      final profile = me['profile'] as Map<String, dynamic>?;
      final activity = context.read<ActivityContext>();
      final unitsCtrl = context.read<UnitPreferencesController>();
      await activity.applyProfile(
        defaultActivity: profile?['defaultActivity']?.toString(),
        showChooserOnLaunch: profile?['showActivityChooserOnLaunch'] as bool?,
        onboardingCompleted: profile?['onboardingCompleted'] as bool?,
      );
      await unitsCtrl.applyFromProfile(profile);
      if (!mounted) return;
      setState(() {
        _me = me;
        _providers = providers;
        _connectionStatus = connStatus;
        _loading = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not load profile: $e')),
        );
      }
    }
  }

  Future<void> _saveBasics() async {
    final api = context.read<ApiClient>();
    final activity = context.read<ActivityContext>();
    final units = context.read<UnitPreferencesController>();
    await api.patch('/users/me', {
      'displayName': _name.text.trim(),
      'defaultActivity': activity.defaultActivity.apiValue,
      'showActivityChooserOnLaunch': activity.showChooserOnLaunch,
      'coldSensitivity':
          (_me?['profile'] as Map?)?['coldSensitivity'] ?? 0,
      ...units.toApiBody(),
    });
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(AppLocalizations.of(context).profileSaved)),
      );
      await _load();
    }
  }

  Future<void> _saveUnits() async {
    final api = context.read<ApiClient>();
    final units = context.read<UnitPreferencesController>();
    final l10n = AppLocalizations.of(context);
    try {
      await api.patch('/users/me', units.toApiBody());
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.unitsSaved)),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final activity = context.watch<ActivityContext>();
    if (_loading || _me == null) {
      return const Center(child: CircularProgressIndicator());
    }

    final identities =
        (_me!['authIdentities'] as List? ?? const []).cast<dynamic>();
    final connections =
        (_me!['connectedAccounts'] as List? ?? const []).cast<dynamic>();
    final strava = connections.cast<Map>().where((c) => c['provider'] == 'strava');
    final stravaConnected = strava.isNotEmpty;
    final stravaCfg =
        (_connectionStatus?['strava'] as Map?)?['enabled'] == true;
    final fbEnabled = (_providers?['facebook'] as Map?)?['enabled'] == true;
    final msEnabled = (_providers?['microsoft'] as Map?)?['enabled'] == true;
    final demo = _providers?['demoOAuthAllowed'] == true;

    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(24, 24, 24, 40),
        children: [
          Text(
            'Profile',
            style: GoogleFonts.barlowCondensed(
              fontSize: 32,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 16),
          Text('PROFILE', style: _sectionStyle),
          TextField(
            controller: _name,
            decoration: const InputDecoration(labelText: 'Display name'),
          ),
          const SizedBox(height: 8),
          Text(
            'Avatar: initials for now'
            '${(_me!['profile'] as Map?)?['avatarUrl'] != null ? ' · provider image available' : ''}',
            style: TextStyle(color: AppTheme.steel.withValues(alpha: 0.85)),
          ),
          const SizedBox(height: 16),
          Text(AppLocalizations.of(context).language.toUpperCase(), style: _sectionStyle),
          DropdownButtonFormField<String>(
            // ignore: deprecated_member_use
            value: context.watch<LocaleController>().preferredCode ??
                context.watch<LocaleController>().locale.languageCode,
            decoration: InputDecoration(
              labelText: AppLocalizations.of(context).language,
            ),
            items: [
              DropdownMenuItem(
                value: 'nb',
                child: Text(AppLocalizations.of(context).languageNorwegian),
              ),
              DropdownMenuItem(
                value: 'en',
                child: Text(AppLocalizations.of(context).languageEnglish),
              ),
            ],
            onChanged: (code) async {
              if (code == null) return;
              final locale = context.read<LocaleController>();
              final api = context.read<ApiClient>();
              final messenger = ScaffoldMessenger.of(context);
              final savedMsg = AppLocalizations.of(context).languageSaved;
              await locale.setPreferred(code);
              try {
                await api.patch('/users/me', {'preferredLanguage': code});
              } catch (_) {
                /* local preference still applied */
              }
              if (!mounted) return;
              messenger.showSnackBar(SnackBar(content: Text(savedMsg)));
            },
          ),
          const SizedBox(height: 16),
          Text('ACTIVITY', style: _sectionStyle),
          DropdownButtonFormField<AppActivity>(
            // ignore: deprecated_member_use
            value: activity.defaultActivity,
            decoration: const InputDecoration(labelText: 'Default activity'),
            items: AppActivity.selectable
                .map(
                  (a) => DropdownMenuItem(value: a, child: Text(a.label)),
                )
                .toList(),
            onChanged: (v) async {
              if (v != null) await activity.setDefaultActivity(v);
            },
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Show activity chooser at startup'),
            value: activity.showChooserOnLaunch,
            onChanged: (v) => activity.setShowChooserOnLaunch(v),
          ),
          const SizedBox(height: 8),
          Text('CONNECTED LOGIN METHODS', style: _sectionStyle),
          ...identities.map((raw) {
            final i = Map<String, dynamic>.from(raw as Map);
            return ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(_providerLabel(i['provider']?.toString())),
              subtitle: Text(i['providerEmail']?.toString() ?? 'Linked'),
              leading: const Icon(Icons.check_circle_outline),
            );
          }),
          _linkButton(
            label: 'Connect Facebook login',
            enabled: fbEnabled || demo,
            onPressed: () => _linkIdentity('facebook', demo && !fbEnabled),
          ),
          _linkButton(
            label: 'Connect Microsoft login',
            enabled: msEnabled || demo,
            onPressed: () => _linkIdentity('microsoft', demo && !msEnabled),
          ),
          const SizedBox(height: 12),
          Text('CONNECTED SERVICES', style: _sectionStyle),
          if (stravaConnected)
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(
                'Strava · ${strava.first['displayName'] ?? 'Connected'}',
              ),
              subtitle: const Text('Connected'),
              trailing: Wrap(
                spacing: 4,
                children: [
                  TextButton(
                    onPressed: stravaCfg ? _syncStrava : null,
                    child: const Text('Sync'),
                  ),
                  TextButton(
                    onPressed: () => _disconnect('strava'),
                    child: const Text('Disconnect'),
                  ),
                ],
              ),
            )
          else
            _linkButton(
              label: 'Connect Strava',
              enabled: stravaCfg,
              onPressed: _connectStrava,
              disabledHint: 'Configure STRAVA_* and TOKEN_ENCRYPTION_KEY',
            ),
          const SizedBox(height: 12),
          Text(AppLocalizations.of(context).unitsSection, style: _sectionStyle),
          _UnitsSection(onChanged: _saveUnits),
          FilledButton(onPressed: _saveBasics, child: const Text('Save profile')),
          const SizedBox(height: 16),
          Text('ACCOUNT', style: _sectionStyle),
          FilledButton.tonal(
            onPressed: () async => auth.logout(),
            child: const Text('Sign out'),
          ),
          TextButton(
            onPressed: _deleteAccount,
            child: const Text('Delete account'),
          ),
        ],
      ),
    );
  }

  TextStyle get _sectionStyle => GoogleFonts.barlowCondensed(
        fontSize: 14,
        letterSpacing: 1.1,
        color: AppTheme.steel,
        fontWeight: FontWeight.w600,
      );

  String _providerLabel(String? p) {
    switch (p) {
      case 'local':
        return 'Email';
      case 'facebook':
        return 'Facebook';
      case 'microsoft':
        return 'Microsoft';
      default:
        return p ?? 'Login';
    }
  }

  Widget _linkButton({
    required String label,
    required bool enabled,
    required VoidCallback onPressed,
    String? disabledHint,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          OutlinedButton(
            onPressed: enabled ? onPressed : null,
            child: Text(label),
          ),
          if (!enabled && disabledHint != null)
            Text(
              disabledHint,
              style: const TextStyle(fontSize: 12),
            ),
        ],
      ),
    );
  }

  Future<void> _linkIdentity(String provider, bool useDemo) async {
    final api = context.read<ApiClient>();
    try {
      if (useDemo) {
        await api.post('/auth/oauth', {
          'provider': provider,
          'accessToken': 'demo:link-$provider',
        });
        // Legacy demo creates/logs in as different user — for link use identities when configured.
        // When only demo is available, show guidance:
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                'Configure real Facebook/Microsoft apps to link to this account. Demo tokens cannot safely attach to an existing email user.',
              ),
            ),
          );
        }
        return;
      }
      await OAuthFlow.linkIdentity(api: api, provider: provider);
      await _load();
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message)),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$e')),
        );
      }
    }
  }

  Future<void> _connectStrava() async {
    final api = context.read<ApiClient>();
    try {
      await OAuthFlow.connectStrava(api: api);
      await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$e')),
        );
      }
    }
  }

  Future<void> _syncStrava() async {
    final api = context.read<ApiClient>();
    await api.post('/connections/strava/sync', {}, auth: true);
    await _load();
  }

  Future<void> _disconnect(String provider) async {
    final api = context.read<ApiClient>();
    await api.delete('/connections/$provider');
    await _load();
  }

  Future<void> _deleteAccount() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete account?'),
        content: const Text(
          'This permanently deletes your RideWear account, wardrobe, and history.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    final api = context.read<ApiClient>();
    final auth = context.read<AuthState>();
    await api.delete('/users/me');
    await auth.logout();
  }
}

class _UnitsSection extends StatelessWidget {
  const _UnitsSection({required this.onChanged});

  final Future<void> Function() onChanged;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final units = context.watch<UnitPreferencesController>();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Wrap(
          spacing: 8,
          children: [
            ChoiceChip(
              label: Text(l10n.unitsPresetMetric),
              selected:
                  units.temperatureUnit == 'celsius' &&
                  units.distanceUnit == 'kilometer' &&
                  units.speedUnit == 'kmh' &&
                  units.windSpeedUnit == 'ms',
              onSelected: (_) async {
                await units.applyPreset('metric');
                await onChanged();
              },
            ),
            ChoiceChip(
              label: Text(l10n.unitsPresetImperial),
              selected:
                  units.temperatureUnit == 'fahrenheit' &&
                  units.distanceUnit == 'mile' &&
                  units.speedUnit == 'mph' &&
                  units.windSpeedUnit == 'mph',
              onSelected: (_) async {
                await units.applyPreset('imperial');
                await onChanged();
              },
            ),
          ],
        ),
        const SizedBox(height: 8),
        DropdownButtonFormField<String>(
          // ignore: deprecated_member_use
          value: units.temperatureUnit,
          decoration: InputDecoration(labelText: l10n.unitsTemperature),
          items: [
            DropdownMenuItem(value: 'celsius', child: Text(l10n.unitCelsius)),
            DropdownMenuItem(
              value: 'fahrenheit',
              child: Text(l10n.unitFahrenheit),
            ),
          ],
          onChanged: (v) async {
            if (v == null) return;
            await units.setAll(temperatureUnit: v);
            await onChanged();
          },
        ),
        DropdownButtonFormField<String>(
          // ignore: deprecated_member_use
          value: units.distanceUnit,
          decoration: InputDecoration(labelText: l10n.unitsDistance),
          items: [
            DropdownMenuItem(
              value: 'kilometer',
              child: Text(l10n.unitKilometers),
            ),
            DropdownMenuItem(value: 'mile', child: Text(l10n.unitMiles)),
          ],
          onChanged: (v) async {
            if (v == null) return;
            await units.setAll(distanceUnit: v);
            await onChanged();
          },
        ),
        DropdownButtonFormField<String>(
          // ignore: deprecated_member_use
          value: units.speedUnit,
          decoration: InputDecoration(labelText: l10n.unitsRidingSpeed),
          items: [
            DropdownMenuItem(value: 'kmh', child: Text(l10n.unitKmh)),
            DropdownMenuItem(value: 'mph', child: Text(l10n.unitMph)),
          ],
          onChanged: (v) async {
            if (v == null) return;
            await units.setAll(speedUnit: v);
            await onChanged();
          },
        ),
        DropdownButtonFormField<String>(
          // ignore: deprecated_member_use
          value: units.windSpeedUnit,
          decoration: InputDecoration(labelText: l10n.unitsWindSpeed),
          items: [
            DropdownMenuItem(value: 'ms', child: Text(l10n.unitMs)),
            DropdownMenuItem(value: 'kmh', child: Text(l10n.unitKmh)),
            DropdownMenuItem(value: 'mph', child: Text(l10n.unitMph)),
          ],
          onChanged: (v) async {
            if (v == null) return;
            await units.setAll(windSpeedUnit: v);
            await onChanged();
          },
        ),
        const SizedBox(height: 12),
      ],
    );
  }
}
