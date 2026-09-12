import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/state/locale_controller.dart';

/// Adapts generated AppLocalizations to the reason-code lookup interface.
class AppLocalizationsReasonLookup implements AppLocalizationsLookup {
  AppLocalizationsReasonLookup(this._l10n);
  final AppLocalizations _l10n;

  @override
  String get reasonColdMountain => _l10n.reasonColdMountain;
  @override
  String get reasonRain => _l10n.reasonRain;
  @override
  String get reasonStrongWind => _l10n.reasonStrongWind;
  @override
  String get reasonPersonalColdHands => _l10n.reasonPersonalColdHands;
  @override
  String get reasonMildConditions => _l10n.reasonMildConditions;
  @override
  String get reasonLowEffectiveTemperature => _l10n.reasonLowEffectiveTemperature;
  @override
  String get reasonSustainedColdExposure => _l10n.reasonSustainedColdExposure;
  @override
  String get reasonShortColdSegment => _l10n.reasonShortColdSegment;
  @override
  String get reasonRainProtectionRequired => _l10n.reasonRainProtectionRequired;
  @override
  String get reasonPackRainLayer => _l10n.reasonPackRainLayer;
  @override
  String get reasonHighWindExposure => _l10n.reasonHighWindExposure;
  @override
  String get reasonTemperatureVariation => _l10n.reasonTemperatureVariation;
  @override
  String get reasonThermalLinerRecommended => _l10n.reasonThermalLinerRecommended;
  @override
  String get reasonWaterproofLinerRecommended =>
      _l10n.reasonWaterproofLinerRecommended;
  @override
  String get reasonVentsClosedRecommended => _l10n.reasonVentsClosedRecommended;
  @override
  String get reasonVentsOpenRecommended => _l10n.reasonVentsOpenRecommended;
  @override
  String get reasonPackExtraInsulation => _l10n.reasonPackExtraInsulation;
  @override
  String get reasonWardrobeGap => _l10n.reasonWardrobeGap;
  @override
  String get reasonIncompleteWeather => _l10n.reasonIncompleteWeather;
  @override
  String get reasonIncompleteWardrobe => _l10n.reasonIncompleteWardrobe;
  @override
  String get reasonBaselineNoPersonalEvidence =>
      _l10n.reasonBaselineNoPersonalEvidence;
}
