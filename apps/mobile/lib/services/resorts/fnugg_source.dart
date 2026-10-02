/// Official Fnugg destination named by the API terms.
const String fnuggHomeUrl = 'https://fnugg.no';

final Uri fnuggHomeUri = Uri.parse(fnuggHomeUrl);

/// Public resort pages built from a documented `site_path`, such as `/trysil/`.
final RegExp _fnuggResortPage = RegExp(
  r'^https://fnugg\.no/[a-z0-9]+(?:-[a-z0-9]+)*/$',
);

/// Accepts only the official Fnugg home page or a documented resort page.
/// Any other value is dropped so attribution cannot point elsewhere.
String? acceptedFnuggSourceUrl(Object? raw) {
  if (raw is! String) return null;
  final trimmed = raw.trim();
  if (trimmed == fnuggHomeUrl || trimmed == '$fnuggHomeUrl/') return null;
  if (!_fnuggResortPage.hasMatch(trimmed)) return null;
  return trimmed;
}

/// Resort page when [sourceUrl] is a Fnugg resort page; otherwise the official home page.
Uri fnuggAttributionUri(String? sourceUrl) {
  final accepted = acceptedFnuggSourceUrl(sourceUrl);
  if (accepted == null) return fnuggHomeUri;
  return Uri.parse(accepted);
}
