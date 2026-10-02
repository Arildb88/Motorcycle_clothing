import 'package:flutter_test/flutter_test.dart';
import 'package:motorcycle_clothing/ads/ad_placement_policy.dart';

AdPlacementRequest _request({
  bool adsEnabled = false,
  AdSurface surface = AdSurface.savedRoutesList,
  AdFormat format = AdFormat.banner,
  AdContentState contentState = AdContentState.ready,
  AdPlacementPosition position = AdPlacementPosition.reservedFooter,
  int alreadyVisible = 0,
}) {
  return AdPlacementRequest(
    adsEnabled: adsEnabled,
    surface: surface,
    format: format,
    contentState: contentState,
    position: position,
    alreadyVisible: alreadyVisible,
  );
}

void main() {
  test('ads stay off unless the flag is explicitly enabled', () {
    expect(evaluateAdPlacement(_request()).show, isFalse);
    expect(evaluateAdPlacement(_request()).reason, 'ads_disabled');
    expect(
      evaluateAdPlacement(
        _request(
          surface: AdSurface.activityHome,
          position: AdPlacementPosition.afterPrimaryContent,
        ),
      ).show,
      isFalse,
    );
    expect(
      evaluateAdPlacement(_request(surface: AdSurface.wardrobeList)).show,
      isFalse,
    );
  });

  test('eligible browsing surfaces can show one banner when content is ready', () {
    for (final format in AdFormat.values) {
      expect(
        evaluateAdPlacement(
          _request(adsEnabled: true, format: format),
        ).show,
        isTrue,
        reason: format.name,
      );
      expect(
        evaluateAdPlacement(
          _request(
            adsEnabled: true,
            surface: AdSurface.wardrobeList,
            format: format,
          ),
        ).show,
        isTrue,
        reason: format.name,
      );
    }
    expect(
      evaluateAdPlacement(
        _request(
          adsEnabled: true,
          surface: AdSurface.activityHome,
          position: AdPlacementPosition.afterPrimaryContent,
        ),
      ),
      isA<AdPlacementDecision>()
          .having((d) => d.show, 'show', isTrue)
          .having((d) => d.reason, 'reason', 'eligible'),
    );
  });

  test('forbidden surfaces stay empty even when ads are enabled', () {
    const forbidden = [
      AdSurface.profileAccount,
      AdSurface.auth,
      AdSurface.consentPrivacy,
      AdSurface.recommendationResult,
      AdSurface.routeEditor,
      AdSurface.mapPreview,
      AdSurface.placeSearch,
      AdSurface.navigationHandoff,
      AdSurface.activeSession,
      AdSurface.safetyAlert,
      AdSurface.payment,
    ];
    for (final surface in forbidden) {
      final decision = evaluateAdPlacement(
        _request(
          adsEnabled: true,
          surface: surface,
          position: AdPlacementPosition.afterPrimaryContent,
        ),
      );
      expect(decision.show, isFalse, reason: surface.name);
      expect(decision.reason, 'surface_not_eligible');
    }
  });

  test('loading, empty, and error states do not take a slot', () {
    for (final state in [
      AdContentState.loading,
      AdContentState.empty,
      AdContentState.error,
    ]) {
      expect(
        evaluateAdPlacement(
          _request(adsEnabled: true, contentState: state),
        ).show,
        isFalse,
        reason: state.name,
      );
    }
  });

  test('overlay and before-content positions are refused', () {
    expect(
      evaluateAdPlacement(
        _request(
          adsEnabled: true,
          position: AdPlacementPosition.overlay,
        ),
      ).reason,
      'position_not_allowed',
    );
    expect(
      evaluateAdPlacement(
        _request(
          adsEnabled: true,
          position: AdPlacementPosition.beforePrimaryContent,
        ),
      ).reason,
      'position_not_allowed',
    );
    expect(
      evaluateAdPlacement(
        _request(
          adsEnabled: true,
          surface: AdSurface.activityHome,
          position: AdPlacementPosition.reservedFooter,
        ),
      ).reason,
      'home_requires_after_content',
    );
    expect(
      evaluateAdPlacement(
        _request(
          adsEnabled: true,
          position: AdPlacementPosition.afterPrimaryContent,
        ),
      ).reason,
      'list_requires_reserved_footer',
    );
  });

  test('a second visible placement is refused', () {
    expect(maxVisibleAdPlacements, 1);
    expect(
      evaluateAdPlacement(
        _request(adsEnabled: true, alreadyVisible: 1),
      ).reason,
      'placement_cap',
    );
  });

  test('placement decisions do not affect recommendation ranking', () {
    expect(AdPlacementDecision.affectsRecommendationRanking, isFalse);
    final allowed = evaluateAdPlacement(_request(adsEnabled: true));
    expect(allowed.show, isTrue);
    expect(AdPlacementDecision.affectsRecommendationRanking, isFalse);
  });
}
