/// Wardrobe categories that can share personal garments.
/// Motorcycle is isolated. Alpine skiing and snowboarding are one category.
const shareableWardrobeCategories = <String>[
  'cycling',
  'alpine_snowboard',
  'xc_skiing',
];

String? wardrobeCategoryForActivity(String activity) {
  switch (activity) {
    case 'motorcycle':
      return 'motorcycle';
    case 'cycling':
      return 'cycling';
    case 'alpine_skiing':
    case 'snowboarding':
      return 'alpine_snowboard';
    case 'xc_skiing':
      return 'xc_skiing';
    default:
      return null;
  }
}

List<String> activityTagsForCategories(Iterable<String> categories) {
  final tags = <String>[];
  for (final category in shareableWardrobeCategories) {
    if (!categories.contains(category)) continue;
    switch (category) {
      case 'cycling':
        tags.add('cycling');
      case 'alpine_snowboard':
        tags
          ..add('alpine_skiing')
          ..add('snowboarding');
      case 'xc_skiing':
        tags.add('xc_skiing');
    }
  }
  return tags;
}

Set<String> categoriesForActivityTags(Iterable<String> tags) {
  final categories = <String>{};
  for (final tag in tags) {
    final category = wardrobeCategoryForActivity(tag);
    if (category != null && category != 'motorcycle') {
      categories.add(category);
    }
  }
  return categories;
}

bool tagsAreMotorcycleOnly(Iterable<String> tags) {
  final values = tags.toList();
  return values.isNotEmpty && values.every((tag) => tag == 'motorcycle');
}
