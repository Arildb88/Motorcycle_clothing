import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:motorcycle_clothing/services/api_client.dart';
import 'package:motorcycle_clothing/state/auth_state.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Map<String, dynamic>? _me;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final api = context.read<ApiClient>();
    final me = await api.get('/users/me');
    if (mounted) {
      setState(() {
        _me = me;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    if (_loading || _me == null) {
      return const Center(child: CircularProgressIndicator());
    }

    final providers = (_me!['authProviders'] as List?)
            ?.map((p) => (p as Map)['provider']?.toString() ?? '')
            .where((p) => p.isNotEmpty)
            .toList() ??
        const <String>[];

    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
        children: [
          Text(
            'Profile',
            style: GoogleFonts.barlowCondensed(
              fontSize: 32,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            _me!['displayName']?.toString() ?? 'Rider',
            style: GoogleFonts.sourceSerif4(fontSize: 28),
          ),
          Text(
            _me!['email']?.toString() ?? 'No email',
            style: TextStyle(color: AppTheme.steel.withValues(alpha: 0.9)),
          ),
          const SizedBox(height: 12),
          Text(
            'Signed in via: ${providers.isEmpty ? 'local' : providers.join(', ')}',
            style: const TextStyle(fontSize: 13),
          ),
          const SizedBox(height: 28),
          FilledButton.tonal(
            onPressed: () async {
              await auth.logout();
            },
            child: const Text('Sign out'),
          ),
        ],
      ),
    );
  }
}
