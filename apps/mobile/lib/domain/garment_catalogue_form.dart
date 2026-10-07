// Form decisions for the shared garment catalogue.
// Untouched tiers are omitted on create so the server can apply the current
// catalogue or the existing preset. An edit sends the garment's own numbers
// and never replaces them with a preview.

class CatalogueChoice {
  const CatalogueChoice({
    required this.brand,
    required this.model,
    required this.category,
    this.activityScope = 'motorcycle',
    this.heated = false,
    this.linerKey = 'none',
    this.materialKey = 'unspecified',
    this.curatedName = '',
  });

  final String brand;
  final String model;
  final String category;
  final String activityScope;
  final bool heated;
  final String linerKey;
  final String materialKey;
  final String curatedName;

  factory CatalogueChoice.fromJson(Map<String, dynamic> json) {
    return CatalogueChoice(
      brand: json['brand'] as String? ?? '',
      model: json['model'] as String? ?? '',
      category: json['category'] as String? ?? '',
      activityScope: json['activityScope'] as String? ?? 'motorcycle',
      heated: json['heated'] == true,
      linerKey: json['linerKey'] as String? ?? 'none',
      materialKey: json['materialKey'] as String? ?? 'unspecified',
      curatedName: json['curatedName'] as String? ?? '',
    );
  }
}

class CatalogueMetricView {
  const CatalogueMetricView({
    required this.source,
    required this.sampleCount,
    this.rounded,
  });

  final String source;
  final int sampleCount;
  final int? rounded;

  bool get isCommunity => source == 'community' && rounded != null;

  factory CatalogueMetricView.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return const CatalogueMetricView(source: 'fallback', sampleCount: 0);
    }
    return CatalogueMetricView(
      source: json['source'] as String? ?? 'fallback',
      sampleCount: (json['sampleCount'] as num?)?.toInt() ?? 0,
      rounded: (json['rounded'] as num?)?.toInt(),
    );
  }
}

class CataloguePreviewView {
  const CataloguePreviewView({
    required this.matched,
    required this.matchKind,
    required this.warmth,
    required this.wind,
    required this.water,
    required this.fallbackWarmth,
    required this.fallbackWind,
    required this.fallbackWater,
    required this.fallbackBreath,
  });

  final bool matched;
  final String matchKind;
  final CatalogueMetricView warmth;
  final CatalogueMetricView wind;
  final CatalogueMetricView water;
  final int fallbackWarmth;
  final int fallbackWind;
  final int fallbackWater;
  final int fallbackBreath;

  factory CataloguePreviewView.fromJson(Map<String, dynamic> json) {
    final metrics = json['metrics'] as Map<String, dynamic>? ?? const {};
    final fallback = json['fallback'] as Map<String, dynamic>? ?? const {};
    return CataloguePreviewView(
      matched: json['matched'] == true,
      matchKind: json['matchKind'] as String? ?? 'none',
      warmth: CatalogueMetricView.fromJson(
        metrics['warmth'] as Map<String, dynamic>?,
      ),
      wind: CatalogueMetricView.fromJson(
        metrics['wind'] as Map<String, dynamic>?,
      ),
      water: CatalogueMetricView.fromJson(
        metrics['water'] as Map<String, dynamic>?,
      ),
      fallbackWarmth: (fallback['warmthTier'] as num?)?.toInt() ?? 3,
      fallbackWind: (fallback['windResistTier'] as num?)?.toInt() ?? 2,
      fallbackWater: (fallback['waterResistTier'] as num?)?.toInt() ?? 1,
      fallbackBreath: (fallback['breathabilityTier'] as num?)?.toInt() ?? 3,
    );
  }
}

class TierField {
  const TierField({
    required this.value,
    required this.touched,
    this.source = 'fallback',
    this.sampleCount = 0,
  });

  final int value;
  final bool touched;
  final String source;
  final int sampleCount;

  TierField applyPreview(CatalogueMetricView metric, int fallback) {
    if (touched) return this;
    if (metric.isCommunity) {
      return TierField(
        value: metric.rounded!,
        touched: false,
        source: 'community',
        sampleCount: metric.sampleCount,
      );
    }
    return TierField(
      value: fallback,
      touched: false,
      source: 'fallback',
      sampleCount: metric.sampleCount,
    );
  }

  TierField edit(int next) {
    return TierField(
      value: next,
      touched: true,
      source: 'explicit',
      sampleCount: sampleCount,
    );
  }
}

/// Editing an existing garment must not copy a catalogue preview onto it.
const editRefreshesCatalogue = false;

int displayedTier(TierField field) => field.value;

Map<String, dynamic> garmentSaveBody({
  required bool isEdit,
  required String name,
  required String category,
  required bool writeYourself,
  required String? brand,
  required String? model,
  String? preset,
  String? material,
  required bool hasVentilation,
  required bool isHeated,
  String? notes,
  required List<String> activityTags,
  required List<String> linerKinds,
  required TierField warmth,
  required TierField wind,
  required TierField water,
  required TierField breath,
  bool writePreset = false,
  bool includeUntouchedPresetTiers = false,
}) {
  final body = <String, dynamic>{
    'name': name.trim(),
    'category': category,
    if (writePreset) 'preset': preset,
    if (!writePreset && !isEdit && preset != null) 'preset': preset,
    'material': ?material,
    'hasVentilation': hasVentilation,
    'isHeated': isHeated,
    'brand': writeYourself || (brand?.trim().isEmpty ?? true) ? null : brand!.trim(),
    'model': writeYourself || (model?.trim().isEmpty ?? true) ? null : model!.trim(),
    'notes': notes?.trim().isEmpty ?? true ? null : notes!.trim(),
    'activityTags': activityTags,
    'components': [
      for (final kind in linerKinds) {'kind': kind},
    ],
  };
  void putTier(String key, TierField field) {
    if (isEdit || field.touched || includeUntouchedPresetTiers) {
      body[key] = field.value;
    }
  }

  putTier('warmthTier', warmth);
  putTier('windResistTier', wind);
  putTier('waterResistTier', water);
  putTier('breathabilityTier', breath);
  return body;
}

/// Null when there is no intentional rating to share.
Map<String, dynamic>? contributionBody({
  required bool isDemo,
  required bool share,
  required bool writeYourself,
  required String? brand,
  required String? model,
  required String category,
  required List<String> activityTags,
  required bool isHeated,
  String? material,
  required List<String> linerKinds,
  required TierField warmth,
  required TierField wind,
  required TierField water,
  required String submissionId,
  String? garmentId,
}) {
  if (!share || isDemo || writeYourself) return null;
  if (brand == null || brand.trim().isEmpty || model == null || model.trim().isEmpty) {
    return null;
  }
  final explicit = <String, int>{};
  if (warmth.touched) explicit['warmth'] = warmth.value;
  if (wind.touched) explicit['wind'] = wind.value;
  if (water.touched) explicit['water'] = water.value;
  if (explicit.isEmpty) return null;
  return {
    'brand': brand.trim(),
    'model': model.trim(),
    'category': category,
    'activityTags': activityTags,
    'isHeated': isHeated,
    'material': ?material,
    'linerKinds': linerKinds,
    'explicitMetrics': explicit.keys.toList(),
    'submissionId': submissionId,
    'garmentId': ?garmentId,
    for (final entry in explicit.entries) entry.key: entry.value,
  };
}

List<String> filterLabels(List<String> labels, String query) {
  final needle = query.trim().toLowerCase();
  if (needle.isEmpty) return labels;
  return labels.where((label) => label.toLowerCase().contains(needle)).toList();
}

String tierCaption({
  required bool touched,
  required String source,
  required int sampleCount,
  required String yourValue,
  required String automaticDefault,
  required String Function(int count) communityEstimate,
}) {
  if (touched) return yourValue;
  if (source == 'community') return communityEstimate(sampleCount);
  return automaticDefault;
}
