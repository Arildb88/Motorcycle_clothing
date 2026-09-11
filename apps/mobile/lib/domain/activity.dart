enum AppActivity {
  motorcycle,
  hiking,
  cycling;

  String get apiValue => name;

  String get label {
    switch (this) {
      case AppActivity.motorcycle:
        return 'Motorcycle';
      case AppActivity.hiking:
        return 'Hiking';
      case AppActivity.cycling:
        return 'Cycling';
    }
  }

  /// Recommendation engine exists only for motorcycle until M3+.
  bool get hasRecommendationEngine => this == AppActivity.motorcycle;

  static AppActivity fromApi(String? value) {
    switch (value) {
      case 'hiking':
        return AppActivity.hiking;
      case 'cycling':
        return AppActivity.cycling;
      case 'motorcycle':
      default:
        return AppActivity.motorcycle;
    }
  }

  static const selectable = AppActivity.values;
}
