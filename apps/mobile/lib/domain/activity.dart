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

  /// Alpine skiing and snowboarding share one resort planner.
  bool get isResortSnowSport =>
      this == AppActivity.alpineSkiing || this == AppActivity.snowboarding;

  /// Saved-route queries for this session. Resort snow sports read both
  /// stored disciplines without a second planner or provider.
  List<String> get savedRouteActivityTypes {
    if (isResortSnowSport) {
      return const ['alpine_skiing', 'snowboarding'];
    }
    return [apiValue];
  }

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

  /// Every session activity, including both resort disciplines.
  ///
  /// Alpine skiing and snowboarding stay distinct domain values. The chooser
  /// and home menu use [userFacingChoices] so they appear as one entry.
  static const sessionChoices = <AppActivity>[
    AppActivity.motorcycle,
    AppActivity.hiking,
    AppActivity.cycling,
    AppActivity.alpineSkiing,
    AppActivity.snowboarding,
    AppActivity.xcSkiing,
  ];

  /// Home and activity chooser. Resort snow sports are one entry.
  static const userFacingChoices = <AppActivity>[
    AppActivity.motorcycle,
    AppActivity.hiking,
    AppActivity.cycling,
    AppActivity.alpineSkiing,
    AppActivity.xcSkiing,
  ];

  /// Discipline kept inside the shared resort flow. Not a second category.
  static const resortDisciplines = <AppActivity>[
    AppActivity.alpineSkiing,
    AppActivity.snowboarding,
  ];
}
