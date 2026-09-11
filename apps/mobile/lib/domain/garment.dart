class Garment {
  Garment({
    required this.id,
    required this.name,
    required this.category,
    required this.layer,
    required this.primaryBodyZone,
    required this.warmthTier,
    required this.windResistTier,
    required this.waterResistTier,
    required this.breathabilityTier,
    this.brand,
    this.model,
    this.notes,
    required this.activityTags,
  });

  final String id;
  final String name;
  final String category;
  final String layer;
  final String primaryBodyZone;
  final int warmthTier;
  final int windResistTier;
  final int waterResistTier;
  final int breathabilityTier;
  final String? brand;
  final String? model;
  final String? notes;
  final List<String> activityTags;

  factory Garment.fromJson(Map<String, dynamic> json) {
    return Garment(
      id: json['id'] as String,
      name: json['name'] as String,
      category: json['category'] as String,
      layer: json['layer'] as String,
      primaryBodyZone: json['primaryBodyZone'] as String,
      warmthTier: (json['warmthTier'] as num).toInt(),
      windResistTier: (json['windResistTier'] as num).toInt(),
      waterResistTier: (json['waterResistTier'] as num).toInt(),
      breathabilityTier: (json['breathabilityTier'] as num).toInt(),
      brand: json['brand'] as String?,
      model: json['model'] as String?,
      notes: json['notes'] as String?,
      activityTags: (json['activityTags'] as List? ?? const [])
          .map((e) => e.toString())
          .toList(),
    );
  }

  String get categoryLabel => category.replaceAll('_', ' ');
  String get layerLabel => layer;
}

const garmentCategories = <String>[
  'base_layer',
  'mid_layer',
  'shell_jacket',
  'pants',
  'gloves',
  'boots',
  'socks',
  'headwear',
  'neckwear',
  'heated_vest',
  'rain_layer',
];
