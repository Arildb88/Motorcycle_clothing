import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:motorcycle_clothing/domain/activity.dart';
import 'package:motorcycle_clothing/services/api_client.dart';
import 'package:motorcycle_clothing/services/oauth_flow.dart';
import 'package:motorcycle_clothing/state/activity_context.dart';
import 'package:motorcycle_clothing/state/auth_state.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';

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
      await activity.applyProfile(
        defaultActivity: profile?['defaultActivity']?.toString(),
        showChooserOnLaunch: profile?['showActivityChooserOnLaunch'] as bool?,
        onboardingCompleted: profile?['onboardingCompleted'] as bool?,
      );
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
    await api.patch('/users/me', {
      'displayName': _name.text.trim(),
      'defaultActivity': activity.defaultActivity.apiValue,
      'showActivityChooserOnLaunch': activity.showChooserOnLaunch,
      'coldSensitivity':
          (_me?['profile'] as Map?)?['coldSensitivity'] ?? 0,
      'units': (_me?['profile'] as Map?)?['units'] ?? 'celsius',
    });
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Profile saved')),
      );
      await _load();
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
          Text('APP', style: _sectionStyle),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Units'),
            subtitle: Text(
              ((_me!['profile'] as Map?)?['units'] ?? 'celsius').toString(),
            ),
          ),
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
