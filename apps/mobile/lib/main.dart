import 'package:flutter/material.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'package:provider/provider.dart';
import 'package:motorcycle_clothing/config/app_config.dart';
import 'package:motorcycle_clothing/services/api_client.dart';
import 'package:motorcycle_clothing/state/auth_state.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';
import 'package:motorcycle_clothing/screens/login_screen.dart';
import 'package:motorcycle_clothing/screens/shell_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  if (AppConfig.adsEnabled) {
    await MobileAds.instance.initialize();
  }
  final api = ApiClient(baseUrl: AppConfig.apiBaseUrl);
  final auth = AuthState(api);
  await auth.hydrate();
  runApp(MotorcycleClothingApp(api: api, auth: auth));
}

class MotorcycleClothingApp extends StatelessWidget {
  const MotorcycleClothingApp({
    super.key,
    required this.api,
    required this.auth,
  });

  final ApiClient api;
  final AuthState auth;

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider.value(value: api),
        ChangeNotifierProvider.value(value: auth),
      ],
      child: MaterialApp(
        title: 'Motorcycle Clothing',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light(),
        home: Consumer<AuthState>(
          builder: (context, auth, _) {
            if (auth.isLoading) {
              return const Scaffold(
                body: Center(child: CircularProgressIndicator()),
              );
            }
            return auth.isAuthenticated
                ? const ShellScreen()
                : const LoginScreen();
          },
        ),
      ),
    );
  }
}
