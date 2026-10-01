import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/services/auth_errors.dart';
import 'package:motorcycle_clothing/state/auth_state.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';
import 'package:motorcycle_clothing/widgets/common.dart';

class ChangePasswordScreen extends StatefulWidget {
  const ChangePasswordScreen({super.key});

  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final _current = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _current.dispose();
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context);
    final current = _current.text;
    final password = _password.text;
    if (current.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.authCurrentPasswordRequired)),
      );
      return;
    }
    if (password.length < 8) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.authPasswordTooShort)),
      );
      return;
    }
    if (password != _confirm.text) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.authPasswordMismatch)),
      );
      return;
    }

    setState(() => _busy = true);
    final auth = context.read<AuthState>();
    try {
      await auth.changePassword(
        currentPassword: current,
        newPassword: password,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.authPasswordChanged)),
      );
      Navigator.of(context).pop();
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
          title: Text(l10n.authChangePasswordTitle),
        ),
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
            children: [
              Text(
                l10n.authChangePasswordSubtitle,
                style: TextStyle(color: AppTheme.steel, height: 1.35),
              ),
              const SizedBox(height: 24),
              TextField(
                controller: _current,
                decoration:
                    InputDecoration(labelText: l10n.authCurrentPasswordLabel),
                obscureText: true,
                enabled: !_busy,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _password,
                decoration: InputDecoration(labelText: l10n.authNewPasswordLabel),
                obscureText: true,
                enabled: !_busy,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _confirm,
                decoration:
                    InputDecoration(labelText: l10n.authConfirmPasswordLabel),
                obscureText: true,
                enabled: !_busy,
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: _busy ? null : _submit,
                child: _busy
                    ? const SizedBox(
                        height: 18,
                        width: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text(l10n.authChangePassword),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
