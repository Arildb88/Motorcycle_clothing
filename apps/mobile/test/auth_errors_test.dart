import 'package:flutter_test/flutter_test.dart';
import 'package:motorcycle_clothing/l10n/app_localizations_en.dart';
import 'package:motorcycle_clothing/l10n/app_localizations_nb.dart';
import 'package:motorcycle_clothing/services/api_client.dart';
import 'package:motorcycle_clothing/services/auth_errors.dart';

void main() {
  final en = AppLocalizationsEn();
  final nb = AppLocalizationsNb();

  test('maps duplicate email conflict to clear message', () {
    expect(
      localizeAuthError(
        ApiException(
          'An account with this email already exists.',
          statusCode: 409,
          code: 'EMAIL_ALREADY_REGISTERED',
        ),
        en,
      ),
      'An account with this email already exists.',
    );
    expect(
      localizeAuthError(
        ApiException('Email already registered', statusCode: 409),
        nb,
      ),
      'En konto med denne e-postadressen finnes allerede.',
    );
  });

  test('maps invalid credentials', () {
    expect(
      localizeAuthError(
        ApiException(
          'Invalid email or password.',
          statusCode: 401,
          code: 'INVALID_CREDENTIALS',
        ),
        en,
      ),
      'Invalid email or password.',
    );
  });

  test('maps network failures', () {
    expect(
      localizeAuthError(Exception('SocketException: Connection refused'), en),
      'Could not reach the server. Check your connection and try again.',
    );
  });

  test('maps invalid reset token', () {
    expect(
      localizeAuthError(
        ApiException(
          'This password reset link is invalid or has expired.',
          statusCode: 400,
          code: 'INVALID_RESET_TOKEN',
        ),
        en,
      ),
      'This password reset link is invalid or has expired.',
    );
  });
}
