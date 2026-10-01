class AppConfig {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000/api',
  );

  /// Android emulator → host machine. iOS simulator uses localhost.
  static const bool adsEnabled = bool.fromEnvironment(
    'ADS_ENABLED',
    defaultValue: false,
  );

  /// AdMob test banner (safe for staging / local).
  static const String admobBannerId = String.fromEnvironment(
    'ADMOB_BANNER_ID',
    defaultValue: 'ca-app-pub-3940256099942544/6300974551',
  );

  /// Unused by normal RideWear place search and route preview.
  /// Those calls go through the API (`ORS_API_KEY` stays on the server).
  static const String googleMapsApiKey = String.fromEnvironment(
    'GOOGLE_MAPS_API_KEY',
    defaultValue: '',
  );

  static bool get hasGoogleMapsApiKey => googleMapsApiKey.trim().isNotEmpty;

  static const String appName = 'RideWear';
}
