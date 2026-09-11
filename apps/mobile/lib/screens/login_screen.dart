import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:motorcycle_clothing/state/auth_state.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';
import 'package:motorcycle_clothing/widgets/common.dart';
import 'package:motorcycle_clothing/services/api_client.dart';
import 'package:motorcycle_clothing/services/oauth_flow.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with SingleTickerProviderStateMixin {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _name = TextEditingController();
  bool _registerMode = false;
  bool _busy = false;
  Map<String, dynamic>? _providers;
  late final AnimationController _fade;

  @override
  void initState() {
    super.initState();
    _fade = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    )..forward();
    _loadProviders();
  }

  Future<void> _loadProviders() async {
    try {
      final api = context.read<ApiClient>();
      final p = await api.get('/auth/providers', auth: false);
      if (mounted) setState(() => _providers = p);
    } catch (_) {
      /* email-only fallback */
    }
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _name.dispose();
    _fade.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _busy = true);
    final auth = context.read<AuthState>();
    try {
      if (_registerMode) {
        await auth.register(
          email: _email.text.trim(),
          password: _password.text,
          displayName: _name.text.trim(),
        );
      } else {
        await auth.login(
          email: _email.text.trim(),
          password: _password.text,
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(auth.error ?? 'Login failed')),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _social(String provider) async {
    setState(() => _busy = true);
    final auth = context.read<AuthState>();
    final api = context.read<ApiClient>();
    final enabled =
        (_providers?[provider] as Map?)?['enabled'] == true;
    final demo = _providers?['demoOAuthAllowed'] == true;
    try {
      if (enabled) {
        final res = await OAuthFlow.login(api: api, provider: provider);
        await auth.acceptAuthResponse(res);
      } else if (demo) {
        await auth.oauth(
          provider: provider,
          accessToken: 'demo:$provider-rider',
        );
      } else {
        throw ApiException(
          '$provider login is not configured on the server',
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString())),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final fbEnabled = (_providers?['facebook'] as Map?)?['enabled'] == true;
    final msEnabled = (_providers?['microsoft'] as Map?)?['enabled'] == true;
    final demo = _providers?['demoOAuthAllowed'] == true;

    return AtmosphereBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: SafeArea(
          child: FadeTransition(
            opacity: _fade,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(24, 48, 24, 24),
              children: [
                const BrandMark(),
                const SizedBox(height: 8),
                Text(
                  'Dress for the ride — personalized across outdoor activities.',
                  style: GoogleFonts.sourceSerif4(
                    fontSize: 18,
                    height: 1.35,
                    color: AppTheme.steel,
                  ),
                ),
                const SizedBox(height: 36),
                if (_registerMode) ...[
                  TextField(
                    controller: _name,
                    decoration: const InputDecoration(labelText: 'Display name'),
                    textCapitalization: TextCapitalization.words,
                  ),
                  const SizedBox(height: 12),
                ],
                TextField(
                  controller: _email,
                  decoration: const InputDecoration(labelText: 'Email'),
                  keyboardType: TextInputType.emailAddress,
                  autocorrect: false,
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _password,
                  decoration: const InputDecoration(labelText: 'Password'),
                  obscureText: true,
                ),
                const SizedBox(height: 20),
                FilledButton(
                  onPressed: _busy ? null : _submit,
                  child: Text(_registerMode ? 'Create account' : 'Continue with email'),
                ),
                TextButton(
                  onPressed: _busy
                      ? null
                      : () => setState(() => _registerMode = !_registerMode),
                  child: Text(
                    _registerMode
                        ? 'Have an account? Sign in'
                        : 'New here? Register',
                  ),
                ),
                const SizedBox(height: 12),
                OutlinedButton(
                  onPressed: _busy || !(msEnabled || demo)
                      ? null
                      : () => _social('microsoft'),
                  child: Text(
                    msEnabled
                        ? 'Continue with Microsoft'
                        : 'Continue with Microsoft (dev)',
                  ),
                ),
                const SizedBox(height: 8),
                OutlinedButton(
                  onPressed: _busy || !(fbEnabled || demo)
                      ? null
                      : () => _social('facebook'),
                  child: Text(
                    fbEnabled
                        ? 'Continue with Facebook'
                        : 'Continue with Facebook (dev)',
                  ),
                ),
                if (!fbEnabled && !msEnabled && !demo)
                  const Padding(
                    padding: EdgeInsets.only(top: 8),
                    child: Text(
                      'Social login buttons enable when Facebook/Microsoft apps are configured on the API.',
                      style: TextStyle(fontSize: 12),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
