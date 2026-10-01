import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/screens/forgot_password_screen.dart';
import 'package:motorcycle_clothing/services/auth_errors.dart';
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

  String? _validate(AppLocalizations l10n) {
    final email = _email.text.trim();
    final password = _password.text;
    if (email.isEmpty || !email.contains('@')) {
      return l10n.authInvalidEmail;
    }
    if (_registerMode) {
      if (_name.text.trim().isEmpty) {
        return l10n.authDisplayNameRequired;
      }
      if (password.length < 8) {
        return l10n.authPasswordTooShort;
      }
    } else if (password.isEmpty) {
      return l10n.authPasswordRequired;
    }
    return null;
  }

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context);
    final validationError = _validate(l10n);
    if (validationError != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(validationError)),
      );
      return;
    }

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
    } catch (e) {
      if (mounted) {
        final message = localizeAuthError(auth.lastError ?? e, l10n);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(message)),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _social(String provider) async {
    setState(() => _busy = true);
    final l10n = AppLocalizations.of(context);
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
          SnackBar(content: Text(localizeAuthError(e, l10n))),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
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
                  l10n.authTagline,
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
                    decoration:
                        InputDecoration(labelText: l10n.authDisplayNameLabel),
                    textCapitalization: TextCapitalization.words,
                  ),
                  const SizedBox(height: 12),
                ],
                TextField(
                  controller: _email,
                  decoration: InputDecoration(labelText: l10n.authEmailLabel),
                  keyboardType: TextInputType.emailAddress,
                  autocorrect: false,
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _password,
                  decoration: InputDecoration(labelText: l10n.authPasswordLabel),
                  obscureText: true,
                ),
                if (!_registerMode)
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      onPressed: _busy
                          ? null
                          : () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) =>
                                      const ForgotPasswordScreen(),
                                ),
                              );
                            },
                      child: Text(l10n.authForgotPassword),
                    ),
                  ),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: _busy ? null : _submit,
                  child: Text(
                    _registerMode
                        ? l10n.authCreateAccount
                        : l10n.authContinueWithEmail,
                  ),
                ),
                TextButton(
                  onPressed: _busy
                      ? null
                      : () => setState(() => _registerMode = !_registerMode),
                  child: Text(
                    _registerMode
                        ? l10n.authHaveAccountSignIn
                        : l10n.authNewHereRegister,
                  ),
                ),
                const SizedBox(height: 12),
                OutlinedButton(
                  onPressed: _busy || !(msEnabled || demo)
                      ? null
                      : () => _social('microsoft'),
                  child: Text(
                    msEnabled
                        ? l10n.authContinueMicrosoft
                        : l10n.authContinueMicrosoftDev,
                  ),
                ),
                const SizedBox(height: 8),
                OutlinedButton(
                  onPressed: _busy || !(fbEnabled || demo)
                      ? null
                      : () => _social('facebook'),
                  child: Text(
                    fbEnabled
                        ? l10n.authContinueFacebook
                        : l10n.authContinueFacebookDev,
                  ),
                ),
                if (!fbEnabled && !msEnabled && !demo)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      l10n.authSocialLoginHint,
                      style: const TextStyle(fontSize: 12),
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
