import 'package:flutter/foundation.dart';
import 'package:motorcycle_clothing/domain/activity.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Session + preference activity context.
/// currentActivity is session-only; defaultActivity is persisted server-side
/// (and mirrored locally for cold start before /users/me returns).
class ActivityContext extends ChangeNotifier {
  AppActivity _current = AppActivity.motorcycle;
  AppActivity _defaultActivity = AppActivity.motorcycle;
  bool _showChooserOnLaunch = true;
  bool _chooserShownThisSession = false;
  bool _onboardingCompleted = false;
  bool _hydrated = false;

  AppActivity get currentActivity => _current;
  AppActivity get defaultActivity => _defaultActivity;
  bool get showChooserOnLaunch => _showChooserOnLaunch;
  bool get onboardingCompleted => _onboardingCompleted;
  bool get hydrated => _hydrated;
  bool get chooserShownThisSession => _chooserShownThisSession;

  Future<void> hydrateLocal() async {
    final prefs = await SharedPreferences.getInstance();
    _defaultActivity = AppActivity.fromApi(prefs.getString('defaultActivity'));
    _showChooserOnLaunch = prefs.getBool('showChooserOnLaunch') ?? true;
    _onboardingCompleted = prefs.getBool('onboardingCompleted') ?? false;
    _current = _defaultActivity;
    _hydrated = true;
    notifyListeners();
  }

  /// Apply server profile fields after /users/me.
  Future<void> applyProfile({
    required String? defaultActivity,
    required bool? showChooserOnLaunch,
    required bool? onboardingCompleted,
  }) async {
    _defaultActivity = AppActivity.fromApi(defaultActivity);
    if (showChooserOnLaunch != null) {
      _showChooserOnLaunch = showChooserOnLaunch;
    }
    if (onboardingCompleted != null) {
      _onboardingCompleted = onboardingCompleted;
    }
    if (!_chooserShownThisSession) {
      _current = _defaultActivity;
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('defaultActivity', _defaultActivity.apiValue);
    await prefs.setBool('showChooserOnLaunch', _showChooserOnLaunch);
    await prefs.setBool('onboardingCompleted', _onboardingCompleted);
    notifyListeners();
  }

  void setCurrentActivity(AppActivity activity) {
    _current = activity;
    notifyListeners();
  }

  Future<void> setDefaultActivity(AppActivity activity) async {
    _defaultActivity = activity;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('defaultActivity', activity.apiValue);
    notifyListeners();
  }

  Future<void> setShowChooserOnLaunch(bool value) async {
    _showChooserOnLaunch = value;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('showChooserOnLaunch', value);
    notifyListeners();
  }

  void markChooserShownThisSession() {
    _chooserShownThisSession = true;
  }

  /// Whether this fresh session should open the chooser.
  bool shouldShowChooserOnLaunch() {
    if (_chooserShownThisSession) return false;
    return _showChooserOnLaunch;
  }

  Future<void> completeOnboardingLocal({
    required AppActivity defaultActivity,
    required bool showChooser,
  }) async {
    _onboardingCompleted = true;
    _defaultActivity = defaultActivity;
    _showChooserOnLaunch = showChooser;
    _current = defaultActivity;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('onboardingCompleted', true);
    await prefs.setString('defaultActivity', defaultActivity.apiValue);
    await prefs.setBool('showChooserOnLaunch', showChooser);
    notifyListeners();
  }
}
