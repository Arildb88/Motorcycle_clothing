import 'package:flutter/foundation.dart';
import 'package:motorcycle_clothing/services/api_client.dart';

class AuthState extends ChangeNotifier {
  AuthState(this.api);

  final ApiClient api;
  bool isLoading = true;
  bool isAuthenticated = false;
  Map<String, dynamic>? user;
  String? error;

  /// Last raw exception from login/register (for localized UI mapping).
  Object? lastError;

  Future<void> hydrate() async {
    isLoading = true;
    notifyListeners();
    try {
      await api.loadToken();
      if (api.token != null) {
        user = await api.get('/users/me');
        isAuthenticated = true;
      }
    } catch (_) {
      await api.setToken(null);
      isAuthenticated = false;
      user = null;
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  Future<void> register({
    required String email,
    required String password,
    required String displayName,
  }) async {
    error = null;
    lastError = null;
    notifyListeners();
    try {
      final res = await api.post('/auth/register', {
        'email': email,
        'password': password,
        'displayName': displayName,
      });
      await _acceptAuth(res);
    } catch (e) {
      lastError = e;
      error = e is ApiException ? e.message : e.toString();
      notifyListeners();
      rethrow;
    }
  }

  Future<void> login({required String email, required String password}) async {
    error = null;
    lastError = null;
    notifyListeners();
    try {
      final res = await api.post('/auth/login', {
        'email': email,
        'password': password,
      });
      await _acceptAuth(res);
    } catch (e) {
      lastError = e;
      error = e is ApiException ? e.message : e.toString();
      notifyListeners();
      rethrow;
    }
  }

  Future<void> oauth({
    required String provider,
    required String accessToken,
  }) async {
    error = null;
    lastError = null;
    notifyListeners();
    try {
      final res = await api.post('/auth/oauth', {
        'provider': provider,
        'accessToken': accessToken,
      });
      await _acceptAuth(res);
    } catch (e) {
      lastError = e;
      error = e is ApiException ? e.message : e.toString();
      notifyListeners();
      rethrow;
    }
  }

  Future<Map<String, dynamic>> requestPasswordReset({
    required String email,
  }) async {
    return api.post('/auth/forgot-password', {'email': email});
  }

  Future<void> resetPassword({
    required String token,
    required String password,
  }) async {
    await api.post('/auth/reset-password', {
      'token': token,
      'password': password,
    });
  }

  Future<void> acceptAuthResponse(Map<String, dynamic> res) async {
    await _acceptAuth(res);
  }

  Future<void> logout() async {
    await api.setToken(null);
    isAuthenticated = false;
    user = null;
    notifyListeners();
  }

  Future<void> _acceptAuth(Map<String, dynamic> res) async {
    final token = res['accessToken'];
    final userMap = res['user'];
    if (token is! String || token.isEmpty || userMap is! Map) {
      throw ApiException(
        'Unexpected auth response from server',
        code: 'INVALID_AUTH_RESPONSE',
      );
    }
    await api.setToken(token);
    user = Map<String, dynamic>.from(userMap);
    isAuthenticated = true;
    error = null;
    lastError = null;
    notifyListeners();
  }
}
