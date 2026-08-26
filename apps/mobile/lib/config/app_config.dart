class AppConfig {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000/api',
  );

  /// Android emulator → host machine. iOS simulator uses localhost.
  static const bool adsEnabled = bool.fromEnvironment(
    'ADS_ENABLED',
    defaultValue: true,
  );

  /// AdMob test banner (safe for staging / local).
  static const String admobBannerId = String.fromEnvironment(
    'ADMOB_BANNER_ID',
    defaultValue: 'ca-app-pub-3940256099942544/6300974551',
  );

  static const String appName = 'RideWear';
}
