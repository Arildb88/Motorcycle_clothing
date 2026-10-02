enum AppActivity {
  motorcycle,
  hiking,
  cycling,
  alpineSkiing,
  snowboarding,
  xcSkiing;

  /// API `activityType`. Alpine and cross-country use the existing snake_case values.
  String get apiValue {
    switch (this) {
      case AppActivity.alpineSkiing:
        return 'alpine_skiing';
      case AppActivity.xcSkiing:
        return 'xc_skiing';
      case AppActivity.motorcycle:
      case AppActivity.hiking:
      case AppActivity.cycling:
      case AppActivity.snowboarding:
        return name;
    }
  }

  String get label {
    switch (this) {
      case AppActivity.motorcycle:
        return 'Motorcycle';
      case AppActivity.hiking:
        return 'Hiking';
      case AppActivity.cycling:
        return 'Cycling';
      case AppActivity.alpineSkiing:
        return 'Alpine skiing';
      case AppActivity.snowboarding:
        return 'Snowboarding';
      case AppActivity.xcSkiing:
        return 'Cross-country skiing';
    }
  }

  /// Hiking has no recommendation engine. The others reuse completed foundations.
  bool get hasRecommendationEngine => this != AppActivity.hiking;

  static AppActivity fromApi(String? value) {
    switch (value) {
      case 'hiking':
        return AppActivity.hiking;
      case 'cycling':
        return AppActivity.cycling;
      case 'alpine_skiing':
        return AppActivity.alpineSkiing;
      case 'snowboarding':
        return AppActivity.snowboarding;
      case 'xc_skiing':
        return AppActivity.xcSkiing;
      case 'motorcycle':
      default:
        return AppActivity.motorcycle;
    }
  }

  /// Profile and onboarding. Matches API `SELECTABLE_ACTIVITIES`.
  static const selectable = <AppActivity>[
    AppActivity.motorcycle,
    AppActivity.hiking,
    AppActivity.cycling,
  ];

  /// Today's activity. Alpine, snowboard, and cross-country are session choices,
  /// not profile defaults, because the profile contract does not accept them.
  static const sessionChoices = <AppActivity>[
    AppActivity.motorcycle,
    AppActivity.hiking,
    AppActivity.cycling,
    AppActivity.alpineSkiing,
    AppActivity.snowboarding,
    AppActivity.xcSkiing,
  ];
}
