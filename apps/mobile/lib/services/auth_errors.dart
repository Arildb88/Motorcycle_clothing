import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/services/api_client.dart';

/// Maps API / network failures to safe, localized auth messages.
String localizeAuthError(Object error, AppLocalizations l10n) {
  if (error is ApiException) {
    final code = error.code;
    if (code == 'EMAIL_ALREADY_REGISTERED' || error.statusCode == 409) {
      final lower = error.message.toLowerCase();
      if (lower.contains('email') || code == 'EMAIL_ALREADY_REGISTERED') {
        return l10n.authEmailAlreadyRegistered;
      }
    }
    if (code == 'INVALID_CURRENT_PASSWORD') {
      return l10n.authInvalidCurrentPassword;
    }
    if (code == 'NO_LOCAL_PASSWORD') {
      return l10n.authNoLocalPassword;
    }
    if (code == 'INVALID_CREDENTIALS' || error.statusCode == 401) {
      return l10n.authInvalidCredentials;
    }
    if (code == 'INVALID_RESET_TOKEN') {
      return l10n.authInvalidResetToken;
    }
    final lower = error.message.toLowerCase();
    if (lower.contains('email already') ||
        lower.contains('already registered') ||
        lower.contains('already exists')) {
      return l10n.authEmailAlreadyRegistered;
    }
    if (lower.contains('invalid email or password') ||
        lower.contains('invalid credentials')) {
      return l10n.authInvalidCredentials;
    }
    if (lower.contains('must be an email') ||
        lower.contains('email must be')) {
      return l10n.authInvalidEmail;
    }
    if (lower.contains('password') &&
        (lower.contains('longer') ||
            lower.contains('min') ||
            lower.contains('least'))) {
      return l10n.authPasswordTooShort;
    }
    return l10n.authGenericFailure;
  }

  final text = error.toString().toLowerCase();
  if (text.contains('socketexception') ||
      text.contains('failed host lookup') ||
      text.contains('connection refused') ||
      text.contains('network is unreachable') ||
      text.contains('clientexception')) {
    return l10n.authNetworkError;
  }
  return l10n.authGenericFailure;
}
