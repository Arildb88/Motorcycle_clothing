import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/screens/reset_password_screen.dart';
import 'package:motorcycle_clothing/services/auth_errors.dart';
import 'package:motorcycle_clothing/state/auth_state.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';
import 'package:motorcycle_clothing/widgets/common.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _email = TextEditingController();
  bool _busy = false;
  String? _info;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context);
    final email = _email.text.trim();
    if (email.isEmpty || !email.contains('@')) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.authInvalidEmail)),
      );
      return;
    }

    setState(() {
      _busy = true;
      _info = null;
    });
    final auth = context.read<AuthState>();
    try {
      final res = await auth.requestPasswordReset(email: email);
      final message =
          (res['message'] as String?) ?? l10n.authForgotPasswordSuccess;
      final devToken = res['devResetToken'] as String?;
      if (!mounted) return;
      setState(() => _info = message);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message)),
      );
      if (devToken != null && devToken.isNotEmpty) {
        await Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => ResetPasswordScreen(initialToken: devToken),
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(localizeAuthError(e, l10n))),
      );
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
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          title: Text(l10n.authForgotPasswordTitle),
        ),
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
            children: [
              Text(
                l10n.authForgotPasswordSubtitle,
                style: TextStyle(color: AppTheme.steel, height: 1.35),
              ),
              const SizedBox(height: 24),
              TextField(
                controller: _email,
                decoration: InputDecoration(labelText: l10n.authEmailLabel),
                keyboardType: TextInputType.emailAddress,
                autocorrect: false,
                enabled: !_busy,
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: _busy ? null : _submit,
                child: Text(l10n.authSendResetLink),
              ),
              if (_info != null) ...[
                const SizedBox(height: 16),
                Text(_info!, style: TextStyle(color: AppTheme.steel)),
              ],
              TextButton(
                onPressed: _busy
                    ? null
                    : () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => const ResetPasswordScreen(),
                          ),
                        );
                      },
                child: Text(l10n.authHaveResetToken),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
