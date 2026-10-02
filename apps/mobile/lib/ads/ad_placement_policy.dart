// Provider-neutral ad eligibility.
//
// This module does not load an ad SDK, pick a network, read consent, or
// return a score. Recommendation ranking must not import it.
// `affectsRecommendationRanking` stays false.

enum AdSurface {
  activityHome,
  savedRoutesList,
  wardrobeList,
  profileAccount,
  auth,
  consentPrivacy,
  recommendationResult,
  routeEditor,
  mapPreview,
  placeSearch,
  navigationHandoff,
  activeSession,
  safetyAlert,
  payment,
}

enum AdFormat {
  banner,
  nativeBanner,
}

enum AdContentState {
  ready,
  loading,
  empty,
  error,
}

/// Where the slot sits relative to the screen's own content.
enum AdPlacementPosition {
  afterPrimaryContent,
  reservedFooter,
  overlay,
  beforePrimaryContent,
}

class AdPlacementRequest {
  const AdPlacementRequest({
    required this.adsEnabled,
    required this.surface,
    required this.format,
    required this.contentState,
    required this.position,
    this.alreadyVisible = 0,
  });

  /// Product default is off. Callers pass [AppConfig.adsEnabled].
  final bool adsEnabled;
  final AdSurface surface;
  final AdFormat format;
  final AdContentState contentState;
  final AdPlacementPosition position;

  /// How many placements are already visible. The cap is one.
  final int alreadyVisible;
}

class AdPlacementDecision {
  const AdPlacementDecision({required this.show, required this.reason});

  final bool show;
  final String reason;

  /// Ads never change recommendation ranking. This is not an input to scoring.
  static const bool affectsRecommendationRanking = false;
}

const int maxVisibleAdPlacements = 1;

const Set<AdSurface> eligibleAdSurfaces = {
  AdSurface.activityHome,
  AdSurface.savedRoutesList,
  AdSurface.wardrobeList,
};

AdPlacementDecision evaluateAdPlacement(AdPlacementRequest request) {
  if (!request.adsEnabled) {
    return const AdPlacementDecision(show: false, reason: 'ads_disabled');
  }
  if (request.alreadyVisible >= maxVisibleAdPlacements) {
    return const AdPlacementDecision(show: false, reason: 'placement_cap');
  }
  if (!eligibleAdSurfaces.contains(request.surface)) {
    return const AdPlacementDecision(
      show: false,
      reason: 'surface_not_eligible',
    );
  }
  if (request.contentState != AdContentState.ready) {
    return const AdPlacementDecision(
      show: false,
      reason: 'content_not_ready',
    );
  }
  if (request.position == AdPlacementPosition.overlay ||
      request.position == AdPlacementPosition.beforePrimaryContent) {
    return const AdPlacementDecision(
      show: false,
      reason: 'position_not_allowed',
    );
  }
  if (request.surface == AdSurface.activityHome &&
      request.position != AdPlacementPosition.afterPrimaryContent) {
    return const AdPlacementDecision(
      show: false,
      reason: 'home_requires_after_content',
    );
  }
  if (request.surface != AdSurface.activityHome &&
      request.position != AdPlacementPosition.reservedFooter) {
    return const AdPlacementDecision(
      show: false,
      reason: 'list_requires_reserved_footer',
    );
  }
  return const AdPlacementDecision(show: true, reason: 'eligible');
}
