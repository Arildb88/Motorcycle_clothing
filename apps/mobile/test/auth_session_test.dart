import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:motorcycle_clothing/features/profile/profile_settings_screen.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/screens/change_password_screen.dart';
import 'package:motorcycle_clothing/services/api_client.dart';
import 'package:motorcycle_clothing/state/activity_context.dart';
import 'package:motorcycle_clothing/state/auth_state.dart';
import 'package:motorcycle_clothing/state/locale_controller.dart';
import 'package:motorcycle_clothing/state/unit_preferences_controller.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('login, logout, and a failed session restore stay consistent', () async {
    final api = _SessionApi();
    final auth = AuthState(api);

    await auth.login(email: 'Ada@Example.com', password: 'password1');
    expect(auth.isAuthenticated, isTrue);
    expect(auth.user?['displayName'], 'Åse');
    expect(api.token, 'token-1');
    expect(api.posts.single.path, '/auth/login');
    expect(api.posts.single.body['email'], 'Ada@Example.com');

    await auth.changePassword(
      currentPassword: 'password1',
      newPassword: 'password2',
    );
    expect(auth.isAuthenticated, isTrue);
    expect(api.token, 'token-1');
    expect(api.posts.last.path, '/auth/change-password');
    expect(api.posts.last.auth, isTrue);

    await auth.logout();
    expect(auth.isAuthenticated, isFalse);
    expect(auth.user, isNull);
    expect(api.token, isNull);

    api.storedToken = 'stale-token';
    api.failMe = true;
    await auth.hydrate();
    expect(auth.isLoading, isFalse);
    expect(auth.isAuthenticated, isFalse);
    expect(auth.user, isNull);
    expect(api.token, isNull);
    expect(api.storedToken, isNull);
  });

  test(
    'a stored token restores the profile, and a bad auth body does not',
    () async {
      final api = _SessionApi()..storedToken = 'token-1';
      final auth = AuthState(api);
      await auth.hydrate();
      expect(auth.isAuthenticated, isTrue);
      expect(auth.user?['email'], 'ase@example.com');
      expect(api.gets, ['/users/me']);

      api.malformedAuth = true;
      await expectLater(
        auth.login(email: 'ase@example.com', password: 'password1'),
        throwsA(
          isA<ApiException>().having(
            (error) => error.code,
            'code',
            'INVALID_AUTH_RESPONSE',
          ),
        ),
      );
      expect(auth.isAuthenticated, isTrue);
      expect(api.token, 'token-1');
      expect(auth.error, 'Unexpected auth response from server');
    },
  );

  testWidgets('change password rejects an empty current password', (
    tester,
  ) async {
    final api = _SessionApi();
    final auth = AuthState(api);
    await _openChangePassword(tester, api, auth);
    await tester.tap(find.widgetWithText(FilledButton, 'Change password'));
    await tester.pump();
    expect(find.text('Enter your current password.'), findsWidgets);
    expect(api.posts, isEmpty);
    expect(find.byType(ChangePasswordScreen), findsOneWidget);
  });

  testWidgets('change password rejects a short new password', (tester) async {
    final api = _SessionApi();
    final auth = AuthState(api);
    await _openChangePassword(tester, api, auth);

    await tester.enterText(find.byType(TextField).at(0), 'password1');
    await tester.enterText(find.byType(TextField).at(1), 'short');
    await tester.enterText(find.byType(TextField).at(2), 'short');
    await tester.tap(find.widgetWithText(FilledButton, 'Change password'));
    await tester.pump();
    expect(find.text('Password must be at least 8 characters.'), findsWidgets);
    expect(api.posts, isEmpty);
    expect(find.byType(ChangePasswordScreen), findsOneWidget);
  });

  testWidgets('change password rejects a mismatched confirmation', (
    tester,
  ) async {
    final api = _SessionApi();
    final auth = AuthState(api);
    await _openChangePassword(tester, api, auth);

    await tester.enterText(find.byType(TextField).at(0), 'password1');
    await tester.enterText(find.byType(TextField).at(1), 'password2');
    await tester.enterText(find.byType(TextField).at(2), 'password3');
    await tester.tap(find.widgetWithText(FilledButton, 'Change password'));
    await tester.pump();
    expect(find.text('Passwords do not match.'), findsWidgets);
    expect(api.posts, isEmpty);
    expect(auth.isAuthenticated, isTrue);
    expect(find.byType(ChangePasswordScreen), findsOneWidget);
  });

  testWidgets('a valid password change keeps the session and closes the form', (
    tester,
  ) async {
    final api = _SessionApi();
    final auth = AuthState(api);
    await _openChangePassword(tester, api, auth);

    await tester.enterText(find.byType(TextField).at(0), 'password1');
    await tester.enterText(find.byType(TextField).at(1), 'password2');
    await tester.enterText(find.byType(TextField).at(2), 'password2');
    await tester.tap(find.widgetWithText(FilledButton, 'Change password'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    expect(api.posts.single.path, '/auth/change-password');
    expect(api.posts.single.body['currentPassword'], 'password1');
    expect(api.posts.single.body['newPassword'], 'password2');
    expect(api.posts.single.auth, isTrue);
    expect(find.text('Password updated.'), findsWidgets);
    expect(find.byType(ChangePasswordScreen), findsNothing);
    expect(auth.isAuthenticated, isTrue);
    expect(api.token, 'token-1');
  });

  testWidgets(
    'sign out clears the session and a Norwegian name is saved intact',
    (tester) async {
      tester.view.physicalSize = const Size(800, 2400);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final api = _SessionApi();
      final auth = AuthState(api);
      await auth.login(email: 'ase@example.com', password: 'password1');

      await tester.pumpWidget(_app(api, auth, const ProfileSettingsScreen()));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));

      expect(find.text('Sign out'), findsOneWidget);
      await tester.enterText(find.byType(TextField).first, 'Åse Ødegård');
      await tester.tap(find.widgetWithText(FilledButton, 'Save profile'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));
      expect(api.patches.single['displayName'], 'Åse Ødegård');
      expect('${api.patches.single['displayName']}', isNot(contains('Ase')));

      await tester.tap(find.widgetWithText(FilledButton, 'Sign out'));
      await tester.pump();
      expect(auth.isAuthenticated, isFalse);
      expect(auth.user, isNull);
      expect(api.token, isNull);
    },
  );

  testWidgets('delete account removes the user and then signs out', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final api = _SessionApi();
    final auth = AuthState(api);
    await auth.login(email: 'ase@example.com', password: 'password1');

    await tester.pumpWidget(_app(api, auth, const ProfileSettingsScreen()));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    await tester.tap(find.text('Delete account'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.text('Delete account?'), findsOneWidget);
    expect(api.deletes, isEmpty);
    expect(auth.isAuthenticated, isTrue);

    await tester.tap(find.widgetWithText(FilledButton, 'Delete'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(api.deletes, ['/users/me']);
    expect(auth.isAuthenticated, isFalse);
    expect(api.token, isNull);
  });
}

Future<void> _openChangePassword(
  WidgetTester tester,
  _SessionApi api,
  AuthState auth,
) async {
  await auth.login(email: 'ase@example.com', password: 'password1');
  api.posts.clear();
  await tester.pumpWidget(_app(api, auth, const _OpenChangePassword()));
  await tester.pump();
  await tester.tap(find.text('Open change password'));
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 50));
}

class _OpenChangePassword extends StatelessWidget {
  const _OpenChangePassword();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: TextButton(
        onPressed: () {
          Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => const ChangePasswordScreen(),
            ),
          );
        },
        child: const Text('Open change password'),
      ),
    );
  }
}

Widget _app(ApiClient api, AuthState auth, Widget home) {
  return MultiProvider(
    providers: [
      Provider<ApiClient>.value(value: api),
      ChangeNotifierProvider<AuthState>.value(value: auth),
      ChangeNotifierProvider<ActivityContext>(create: (_) => ActivityContext()),
      ChangeNotifierProvider<LocaleController>(
        create: (_) => LocaleController(),
      ),
      ChangeNotifierProvider<UnitPreferencesController>(
        create: (_) => UnitPreferencesController(),
      ),
    ],
    child: MaterialApp(
      locale: const Locale('en'),
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: Scaffold(body: home),
    ),
  );
}

class _SessionApi extends ApiClient {
  _SessionApi() : super(baseUrl: 'http://example.test');

  String? storedToken;
  String? _sessionToken;
  bool failMe = false;
  bool malformedAuth = false;
  final posts = <({String path, Map<String, dynamic> body, bool auth})>[];
  final gets = <String>[];
  final patches = <Map<String, dynamic>>[];
  final deletes = <String>[];

  @override
  String? get token => _sessionToken;

  @override
  Future<void> loadToken() async {
    _sessionToken = storedToken;
  }

  @override
  Future<void> setToken(String? token) async {
    _sessionToken = token;
    storedToken = token;
  }

  @override
  Future<Map<String, dynamic>> post(
    String path,
    Map<String, dynamic> body, {
    bool auth = false,
  }) async {
    posts.add((path: path, body: body, auth: auth));
    if (path == '/auth/login' || path == '/auth/register') {
      if (malformedAuth) return {'ok': true};
      return {
        'accessToken': 'token-1',
        'user': {'email': 'ase@example.com', 'displayName': 'Åse'},
      };
    }
    if (path == '/auth/change-password') return {'ok': true};
    throw UnsupportedError(path);
  }

  @override
  Future<Map<String, dynamic>> get(String path, {bool auth = true}) async {
    gets.add(path);
    if (path == '/users/me') {
      if (failMe) {
        throw ApiException('Unauthorized', statusCode: 401);
      }
      return {
        'email': 'ase@example.com',
        'displayName': 'Åse',
        'authIdentities': [
          {'provider': 'local', 'providerEmail': 'ase@example.com'},
        ],
        'connectedAccounts': <Map<String, dynamic>>[],
        'profile': <String, dynamic>{
          'defaultActivity': 'cycling',
          'showActivityChooserOnLaunch': false,
          'onboardingCompleted': true,
        },
      };
    }
    if (path == '/auth/providers') {
      return {
        'facebook': {'enabled': false},
        'microsoft': {'enabled': false},
        'demoOAuthAllowed': false,
      };
    }
    if (path == '/connections/status') {
      return {
        'strava': {'enabled': false},
      };
    }
    throw UnsupportedError(path);
  }

  @override
  Future<Map<String, dynamic>> patch(
    String path,
    Map<String, dynamic> body,
  ) async {
    patches.add(body);
    return {'ok': true};
  }

  @override
  Future<Map<String, dynamic>> delete(String path) async {
    deletes.add(path);
    return {'ok': true};
  }
}
