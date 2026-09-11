import 'package:flutter/foundation.dart';
import 'package:motorcycle_clothing/services/api_client.dart';

class AuthState extends ChangeNotifier {
  AuthState(this.api);

  final ApiClient api;
  bool isLoading = true;
  bool isAuthenticated = false;
  Map<String, dynamic>? user;
  String? error;

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
    notifyListeners();
    try {
      final res = await api.post('/auth/register', {
        'email': email,
        'password': password,
        'displayName': displayName,
      });
      await _acceptAuth(res);
    } on ApiException catch (e) {
      error = e.message;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> login({required String email, required String password}) async {
    error = null;
    notifyListeners();
    try {
      final res = await api.post('/auth/login', {
        'email': email,
        'password': password,
      });
      await _acceptAuth(res);
    } on ApiException catch (e) {
      error = e.message;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> oauth({
    required String provider,
    required String accessToken,
  }) async {
    error = null;
    notifyListeners();
    try {
      final res = await api.post('/auth/oauth', {
        'provider': provider,
        'accessToken': accessToken,
      });
      await _acceptAuth(res);
    } on ApiException catch (e) {
      error = e.message;
      notifyListeners();
      rethrow;
    }
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
    await api.setToken(res['accessToken'] as String);
    user = Map<String, dynamic>.from(res['user'] as Map);
    isAuthenticated = true;
    error = null;
    notifyListeners();
  }
}
