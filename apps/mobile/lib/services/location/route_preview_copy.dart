import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/services/location/location_models.dart';

const drivingGeometryNoticeCode = 'DRIVING_GEOMETRY';
const routingUnavailableCode = 'ROUTING_UNAVAILABLE';

String? localizedRouteNotice(AppLocalizations l10n, RouteGeometry? geometry) {
  if (geometry == null) return null;
  if (geometry.noticeCode == drivingGeometryNoticeCode) {
    return l10n.routeDrivingGeometryNotice;
  }
  if (geometry.noticeCode == 'STRAIGHT_SEGMENTS') {
    return l10n.routeStraightSegmentsNotice;
  }
  final warning = geometry.providerWarning;
  if (warning == null || warning.isEmpty) return null;
  return warning;
}

String localizedRoutePreviewError(AppLocalizations l10n, Object error) {
  if (error is LocationProviderException &&
      error.code == routingUnavailableCode) {
    return l10n.routeRoutingUnavailable;
  }
  return l10n.plannerMapFailed;
}
