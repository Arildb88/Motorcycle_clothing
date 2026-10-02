import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/services/auth_errors.dart';
import 'package:motorcycle_clothing/state/auth_state.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';
import 'package:motorcycle_clothing/theme/outline_form_field.dart';
import 'package:motorcycle_clothing/widgets/common.dart';

class ResetPasswordScreen extends StatefulWidget {
  const ResetPasswordScreen({super.key, this.initialToken});

  final String? initialToken;

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  late final TextEditingController _token;
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _token = TextEditingController(text: widget.initialToken ?? '');
  }

  @override
  void dispose() {
    _token.dispose();
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context);
    final token = _token.text.trim();
    final password = _password.text;
    if (token.isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(l10n.authInvalidResetToken)));
      return;
    }
    if (password.length < 8) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(l10n.authPasswordTooShort)));
      return;
    }
    if (password != _confirm.text) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(l10n.authPasswordMismatch)));
      return;
    }

    setState(() => _busy = true);
    final auth = context.read<AuthState>();
    try {
      await auth.resetPassword(token: token, password: password);
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(l10n.authPasswordResetSuccess)));
      Navigator.of(context).popUntil((route) => route.isFirst);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(localizeAuthError(e, l10n))));
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
          title: Text(l10n.authResetPasswordTitle),
        ),
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
            children: [
              Text(
                l10n.authResetPasswordSubtitle,
                style: TextStyle(color: AppTheme.steel, height: 1.35),
              ),
              const SizedBox(height: 24),
              TextField(
                controller: _token,
                decoration: InputDecoration(
                  labelText: l10n.authResetTokenLabel,
                ),
                autocorrect: false,
                enabled: !_busy,
              ),
              OutlineFormField(
                child: TextField(
                  controller: _password,
                  decoration: InputDecoration(
                    labelText: l10n.authNewPasswordLabel,
                  ),
                  obscureText: true,
                  enabled: !_busy,
                ),
              ),
              OutlineFormField(
                child: TextField(
                  controller: _confirm,
                  decoration: InputDecoration(
                    labelText: l10n.authConfirmPasswordLabel,
                  ),
                  obscureText: true,
                  enabled: !_busy,
                ),
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: _busy ? null : _submit,
                child: _busy
                    ? const FilledButtonProgress()
                    : Text(l10n.authSetNewPassword),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
