import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:motorcycle_clothing/state/auth_state.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';
import 'package:motorcycle_clothing/widgets/common.dart';

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
  late final AnimationController _fade;

  @override
  void initState() {
    super.initState();
    _fade = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    )..forward();
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

  Future<void> _oauth(String provider) async {
    setState(() => _busy = true);
    final auth = context.read<AuthState>();
    try {
      // Demo tokens work in non-production API when OAuth apps are not configured.
      await auth.oauth(
        provider: provider,
        accessToken: 'demo:$provider-rider',
      );
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(auth.error ?? 'OAuth failed')),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
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
                  'Dress for the ride, not the forecast guess.',
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
                  child: Text(_registerMode ? 'Create account' : 'Sign in'),
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
                Text(
                  'Or continue with',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppTheme.steel.withValues(alpha: 0.8)),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _busy ? null : () => _oauth('facebook'),
                        child: const Text('Facebook'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _busy ? null : () => _oauth('microsoft'),
                        child: const Text('Microsoft'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
