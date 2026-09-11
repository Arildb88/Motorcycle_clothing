import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'package:provider/provider.dart';
import 'package:motorcycle_clothing/config/app_config.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/services/api_client.dart';
import 'package:motorcycle_clothing/state/activity_context.dart';
import 'package:motorcycle_clothing/state/auth_state.dart';
import 'package:motorcycle_clothing/state/locale_controller.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';
import 'package:motorcycle_clothing/screens/login_screen.dart';
import 'package:motorcycle_clothing/screens/shell_screen.dart';
import 'package:motorcycle_clothing/features/activity/onboarding_screen.dart';
import 'package:motorcycle_clothing/features/activity/activity_chooser_screen.dart';
import 'package:motorcycle_clothing/domain/activity.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  if (AppConfig.adsEnabled) {
    await MobileAds.instance.initialize();
  }
  final api = ApiClient(baseUrl: AppConfig.apiBaseUrl);
  final auth = AuthState(api);
  final activity = ActivityContext();
  final locale = LocaleController();
  await locale.hydrate();
  await activity.hydrateLocal();
  await auth.hydrate();
  runApp(
    MotorcycleClothingApp(
      api: api,
      auth: auth,
      activity: activity,
      locale: locale,
    ),
  );
}

class MotorcycleClothingApp extends StatelessWidget {
  const MotorcycleClothingApp({
    super.key,
    required this.api,
    required this.auth,
    required this.activity,
    required this.locale,
  });

  final ApiClient api;
  final AuthState auth;
  final ActivityContext activity;
  final LocaleController locale;

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider.value(value: api),
        ChangeNotifierProvider.value(value: auth),
        ChangeNotifierProvider.value(value: activity),
        ChangeNotifierProvider.value(value: locale),
      ],
      child: Consumer<LocaleController>(
        builder: (context, localeCtrl, _) {
          return MaterialApp(
            onGenerateTitle: (ctx) => AppLocalizations.of(ctx).appTitle,
            debugShowCheckedModeBanner: false,
            theme: AppTheme.light(),
            locale: localeCtrl.locale,
            supportedLocales: LocaleController.supported,
            localizationsDelegates: const [
              AppLocalizations.delegate,
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            home: const _AppGate(),
          );
        },
      ),
    );
  }
}

class _AppGate extends StatefulWidget {
  const _AppGate();

  @override
  State<_AppGate> createState() => _AppGateState();
}

class _AppGateState extends State<_AppGate> {
  bool _syncingProfile = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final auth = context.watch<AuthState>();
    if (auth.isAuthenticated && !_syncingProfile) {
      _syncingProfile = true;
      _syncProfile();
    }
  }

  Future<void> _syncProfile() async {
    final api = context.read<ApiClient>();
    final activity = context.read<ActivityContext>();
    final locale = context.read<LocaleController>();
    try {
      final me = await api.get('/users/me');
      final profile = me['profile'] as Map<String, dynamic>?;
      await activity.applyProfile(
        defaultActivity: profile?['defaultActivity']?.toString(),
        showChooserOnLaunch: profile?['showActivityChooserOnLaunch'] as bool?,
        onboardingCompleted: profile?['onboardingCompleted'] as bool?,
      );
      await locale.applyFromProfile(profile?['preferredLanguage']?.toString());
    } catch (_) {
      /* keep local prefs */
    } finally {
      if (mounted) setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final activity = context.watch<ActivityContext>();

    if (auth.isLoading || !activity.hydrated) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (!auth.isAuthenticated) {
      return const LoginScreen();
    }
    if (!activity.onboardingCompleted) {
      return OnboardingScreen(
        onDone: () => setState(() {}),
      );
    }
    if (activity.shouldShowChooserOnLaunch()) {
      return ActivityChooserScreen(
        onChosen: (AppActivity a) {
          activity.setCurrentActivity(a);
          activity.markChooserShownThisSession();
          setState(() {});
        },
      );
    }
    return const ShellScreen();
  }
}
