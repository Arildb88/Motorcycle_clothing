import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'package:motorcycle_clothing/ads/ad_placement_policy.dart';
import 'package:motorcycle_clothing/config/app_config.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';

class AdBannerSlot extends StatefulWidget {
  const AdBannerSlot({
    super.key,
    required this.surface,
    required this.contentState,
    required this.position,
  });

  final AdSurface surface;
  final AdContentState contentState;
  final AdPlacementPosition position;

  @override
  State<AdBannerSlot> createState() => _AdBannerSlotState();
}

class _AdBannerSlotState extends State<AdBannerSlot> {
  BannerAd? _ad;
  bool _loaded = false;

  bool get _allowed => evaluateAdPlacement(
        AdPlacementRequest(
          adsEnabled: AppConfig.adsEnabled,
          surface: widget.surface,
          format: AdFormat.banner,
          contentState: widget.contentState,
          position: widget.position,
        ),
      ).show;

  void _load() {
    if (!_allowed || _ad != null) return;
    final ad = BannerAd(
      size: AdSize.banner,
      adUnitId: AppConfig.admobBannerId,
      listener: BannerAdListener(
        onAdLoaded: (_) => setState(() => _loaded = true),
        onAdFailedToLoad: (ad, _) {
          ad.dispose();
        },
      ),
      request: const AdRequest(),
    );
    ad.load();
    _ad = ad;
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(AdBannerSlot oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!_allowed) {
      _ad?.dispose();
      _ad = null;
      if (_loaded && mounted) {
        setState(() => _loaded = false);
      } else {
        _loaded = false;
      }
      return;
    }
    _load();
  }

  @override
  void dispose() {
    _ad?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!_loaded || _ad == null) {
      return const SizedBox(height: 0);
    }
    return SizedBox(
      width: _ad!.size.width.toDouble(),
      height: _ad!.size.height.toDouble(),
      child: AdWidget(ad: _ad!),
    );
  }
}

class AtmosphereBackground extends StatelessWidget {
  const AtmosphereBackground({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFFD7E3E8),
            Color(0xFFE8EEF1),
            Color(0xFFC5D4DC),
          ],
        ),
      ),
      child: child,
    );
  }
}

class BrandMark extends StatelessWidget {
  const BrandMark({super.key, this.compact = false});

  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Text(
      AppConfig.appName,
      style: GoogleFonts.barlowCondensed(
        fontSize: compact ? 28 : 48,
        fontWeight: FontWeight.w700,
        letterSpacing: 1.2,
        color: AppTheme.asphalt,
        height: 1,
      ),
    );
  }
}
