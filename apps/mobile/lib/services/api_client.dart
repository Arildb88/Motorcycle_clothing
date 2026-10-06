import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiException implements Exception {
  ApiException(this.message, {this.statusCode, this.code});
  final String message;
  final int? statusCode;
  final String? code;

  @override
  String toString() => message;
}

/// Session token stays on this device and is not marked for iCloud sync.
const ridewearIosOptions = IOSOptions(
  accessibility: KeychainAccessibility.first_unlock_this_device,
  synchronizable: false,
);

const ridewearSecureStorage = FlutterSecureStorage(
  iOptions: ridewearIosOptions,
);

class ApiClient {
  ApiClient({required this.baseUrl, FlutterSecureStorage? storage})
    : _storage = storage ?? ridewearSecureStorage;

  final String baseUrl;
  final FlutterSecureStorage _storage;
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
      final parsed = _parseError(decoded, res.statusCode);
      throw ApiException(
        parsed.message,
        statusCode: res.statusCode,
        code: parsed.code,
      );
    }
    return decoded;
  }

  ({String message, String? code}) _parseError(dynamic decoded, int status) {
    if (decoded is! Map) {
      return (message: 'Request failed ($status)', code: null);
    }
    final map = Map<String, dynamic>.from(decoded);
    String? code = map['code']?.toString();
    dynamic rawMessage = map['message'];

    if (rawMessage is Map) {
      final nested = Map<String, dynamic>.from(rawMessage);
      code ??= nested['code']?.toString();
      rawMessage = nested['message'] ?? nested;
    }

    String message;
    if (rawMessage is List) {
      message = rawMessage.map((e) => e.toString()).join(', ');
    } else if (rawMessage != null) {
      message = rawMessage.toString();
    } else {
      message = 'Request failed ($status)';
    }
    return (message: message, code: code);
  }
}
