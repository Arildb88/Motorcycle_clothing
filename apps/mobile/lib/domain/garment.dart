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
    this.material,
    this.hasVentilation = false,
    this.isHeated = false,
    this.brand,
    this.model,
    this.notes,
    required this.activityTags,
    this.components = const [],
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
  final String? material;
  final bool hasVentilation;
  final bool isHeated;
  final String? brand;
  final String? model;
  final String? notes;
  final List<String> activityTags;
  final List<GarmentComponent> components;

  factory Garment.fromJson(Map<String, dynamic> json) {
    final comps = (json['components'] as List?) ?? const [];
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
      material: json['material'] as String?,
      hasVentilation: json['hasVentilation'] == true,
      isHeated: json['isHeated'] == true,
      brand: json['brand'] as String?,
      model: json['model'] as String?,
      notes: json['notes'] as String?,
      activityTags: (json['activityTags'] as List? ?? const [])
          .map((e) => e.toString())
          .toList(),
      components: comps
          .whereType<Map<String, dynamic>>()
          .map(GarmentComponent.fromJson)
          .toList(),
    );
  }

  String get categoryLabel => category.replaceAll('_', ' ');
  String get layerLabel => layer;

  String get subtitleBits {
    final parts = <String>[
      categoryLabel,
      ?material,
      if (hasVentilation) 'vents',
      if (isHeated) 'heated',
      if (components.isNotEmpty) '${components.length} liner(s)',
    ];
    return parts.join(' · ');
  }
}

class GarmentComponent {
  GarmentComponent({
    required this.id,
    required this.kind,
    this.name,
    required this.warmthDelta,
    required this.windResistDelta,
    required this.waterResistDelta,
    required this.breathabilityDelta,
  });

  final String id;
  final String kind;
  final String? name;
  final int warmthDelta;
  final int windResistDelta;
  final int waterResistDelta;
  final int breathabilityDelta;

  factory GarmentComponent.fromJson(Map<String, dynamic> json) {
    return GarmentComponent(
      id: json['id'] as String? ?? '',
      kind: json['kind'] as String,
      name: json['name'] as String?,
      warmthDelta: (json['warmthDelta'] as num?)?.toInt() ?? 0,
      windResistDelta: (json['windResistDelta'] as num?)?.toInt() ?? 0,
      waterResistDelta: (json['waterResistDelta'] as num?)?.toInt() ?? 0,
      breathabilityDelta: (json['breathabilityDelta'] as num?)?.toInt() ?? 0,
    );
  }
}

const garmentCategories = <String>[
  'base_layer',
  'mid_layer',
  'shell_jacket',
  'pants',
  'one_piece_suit',
  'gloves',
  'boots',
  'socks',
  'headwear',
  'neckwear',
  'heated_vest',
  'rain_layer',
];

const garmentMaterials = <String>[
  'textile',
  'leather',
  'mesh',
  'denim',
  'synthetic',
  'merino',
  'mixed',
  'other',
];

/// UX presets — map to category/material/defaults on the API.
const garmentPresets = <Map<String, String>>[
  {'id': 'textile_jacket', 'label': 'Textile motorcycle jacket'},
  {'id': 'mesh_jacket', 'label': 'Mesh / summer jacket'},
  {'id': 'leather_jacket', 'label': 'Leather motorcycle jacket'},
  {'id': 'textile_pants', 'label': 'Textile motorcycle pants'},
  {'id': 'motorcycle_jeans', 'label': 'Motorcycle jeans'},
  {'id': 'one_piece_suit', 'label': 'One-piece suit'},
  {'id': 'summer_gloves', 'label': 'Summer gloves'},
  {'id': 'winter_gloves', 'label': 'Winter gloves'},
  {'id': 'heated_gloves', 'label': 'Heated gloves'},
];
