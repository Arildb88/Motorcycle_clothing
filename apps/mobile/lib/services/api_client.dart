import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiException implements Exception {
  ApiException(this.message, {this.statusCode});
  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient({required this.baseUrl});

  final String baseUrl;
  final _storage = const FlutterSecureStorage();
  String? _token;

  String? get token => _token;

  Future<void> setToken(String? token) async {
    _token = token;
    if (token == null) {
      await _storage.delete(key: 'accessToken');
    } else {
      await _storage.write(key: 'accessToken', value: token);
    }
  }

  Future<void> loadToken() async {
    _token = await _storage.read(key: 'accessToken');
  }

  Future<Map<String, dynamic>> post(
    String path,
    Map<String, dynamic> body, {
    bool auth = false,
  }) async {
    final res = await http.post(
      Uri.parse('$baseUrl$path'),
      headers: _headers(auth: auth),
      body: jsonEncode(body),
    );
    return _decode(res);
  }

  Future<Map<String, dynamic>> get(String path, {bool auth = true}) async {
    final res = await http.get(
      Uri.parse('$baseUrl$path'),
      headers: _headers(auth: auth),
    );
    return _decode(res);
  }

  Future<List<dynamic>> getList(String path, {bool auth = true}) async {
    final res = await http.get(
      Uri.parse('$baseUrl$path'),
      headers: _headers(auth: auth),
    );
    final decoded = _decodeAny(res);
    if (decoded is List) return decoded;
    throw ApiException('Expected list response');
  }

  Future<Map<String, dynamic>> patch(
    String path,
    Map<String, dynamic> body,
  ) async {
    final res = await http.patch(
      Uri.parse('$baseUrl$path'),
      headers: _headers(auth: true),
      body: jsonEncode(body),
    );
    return _decode(res);
  }

  Future<Map<String, dynamic>> delete(String path) async {
    final res = await http.delete(
      Uri.parse('$baseUrl$path'),
      headers: _headers(auth: true),
    );
    return _decode(res);
  }

  Map<String, String> _headers({required bool auth}) {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (auth && _token != null) {
      headers['Authorization'] = 'Bearer $_token';
    }
    return headers;
  }

  Map<String, dynamic> _decode(http.Response res) {
    final decoded = _decodeAny(res);
    if (decoded is Map<String, dynamic>) return decoded;
    throw ApiException('Unexpected response shape', statusCode: res.statusCode);
  }

  dynamic _decodeAny(http.Response res) {
    final body = res.body.isEmpty ? '{}' : res.body;
    final decoded = jsonDecode(body);
    if (res.statusCode >= 400) {
      final message = decoded is Map && decoded['message'] != null
          ? (decoded['message'] is List
                ? (decoded['message'] as List).join(', ')
                : decoded['message'].toString())
          : 'Request failed (${res.statusCode})';
      throw ApiException(message, statusCode: res.statusCode);
    }
    return decoded;
  }
}
