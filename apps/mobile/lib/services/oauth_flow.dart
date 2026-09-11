import 'package:flutter_web_auth_2/flutter_web_auth_2.dart';
import 'package:motorcycle_clothing/services/api_client.dart';

/// Browser-based OAuth helper. Requires real provider configuration.
class OAuthFlow {
  static Future<Map<String, dynamic>> login({
    required ApiClient api,
    required String provider,
  }) async {
    final start = await api.post('/auth/oauth/$provider/start', {});
    final result = await FlutterWebAuth2.authenticate(
      url: start['authorizationUrl'] as String,
      callbackUrlScheme: 'ridewear',
    );
    final uri = Uri.parse(result);
    final code = uri.queryParameters['code'];
    final state = uri.queryParameters['state'];
    if (code == null || state == null) {
      throw ApiException('OAuth callback missing code/state');
    }
    return api.post('/auth/oauth/$provider/callback', {
      'code': code,
      'state': state,
    });
  }

  static Future<void> linkIdentity({
    required ApiClient api,
    required String provider,
  }) async {
    final start = await api.post(
      '/auth/identities/$provider/start',
      {},
      auth: true,
    );
    final result = await FlutterWebAuth2.authenticate(
      url: start['authorizationUrl'] as String,
      callbackUrlScheme: 'ridewear',
    );
    final uri = Uri.parse(result);
    final code = uri.queryParameters['code'];
    final state = uri.queryParameters['state'];
    if (code == null || state == null) {
      throw ApiException('OAuth callback missing code/state');
    }
    await api.post('/auth/identities/$provider/callback', {
      'code': code,
      'state': state,
    }, auth: true);
  }

  static Future<void> connectStrava({required ApiClient api}) async {
    final start = await api.post('/connections/strava/start', {}, auth: true);
    final result = await FlutterWebAuth2.authenticate(
      url: start['authorizationUrl'] as String,
      callbackUrlScheme: 'ridewear',
    );
    final uri = Uri.parse(result);
    final code = uri.queryParameters['code'];
    final state = uri.queryParameters['state'];
    if (code == null || state == null) {
      throw ApiException('Strava callback missing code/state');
    }
    await api.post('/connections/strava/callback', {
      'code': code,
      'state': state,
    }, auth: true);
  }
}
