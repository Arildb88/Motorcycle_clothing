import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:motorcycle_clothing/ads/ad_placement_policy.dart';
import 'package:motorcycle_clothing/config/app_config.dart';
import 'package:motorcycle_clothing/domain/saved_route.dart';
import 'package:motorcycle_clothing/widgets/common.dart';
import 'package:motorcycle_clothing/features/activity/activity_home_screen.dart';
import 'package:motorcycle_clothing/domain/activity.dart';
import 'package:motorcycle_clothing/features/plan/activity_recommendation_request.dart';
import 'package:motorcycle_clothing/features/plan/recommendation_presentation.dart';
import 'package:motorcycle_clothing/features/plan/resort_discipline_control.dart';
import 'package:motorcycle_clothing/features/plan/saved_activity_routes.dart';
import 'package:motorcycle_clothing/features/plan/recommendation_sections.dart';
import 'package:motorcycle_clothing/features/plan/commute_plan_screen.dart';
import 'package:motorcycle_clothing/features/plan/ride_planner_screen.dart';
import 'package:motorcycle_clothing/state/activity_context.dart';
import 'package:motorcycle_clothing/services/api_client.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/l10n/ui_labels.dart';
import 'package:motorcycle_clothing/state/unit_preferences_controller.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';
import 'package:motorcycle_clothing/screens/feedback_sheet.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<SavedRoute> _routes = [];
  Map<String, dynamic>? _data;
  String? _selectedRouteId;
  String? _error;
  bool _loadingRoutes = true;
  bool _loadingRec = false;
  ActivityPlanningInputs _inputs = const ActivityPlanningInputs();

  AppActivity get _activity => context.read<ActivityContext>().currentActivity;

  String get _activityType => _activity.apiValue;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    await _loadRoutes();
    if (_routes.isNotEmpty) {
      final preferred = _routes.firstWhere(
        (r) => r.isDefaultCommute,
        orElse: () => _routes.first,
      );
      if (preferred.isCommute) {
        if (mounted) {
          setState(() {
            _selectedRouteId = preferred.id;
            _loadingRec = false;
          });
        }
      } else {
        await _launchRoute(preferred, leaveNow: true, silent: true);
      }
    } else {
      setState(() => _loadingRec = false);
    }
  }

  Future<void> _loadRoutes() async {
    setState(() {
      _loadingRoutes = true;
      _error = null;
    });
    try {
      final api = context.read<ApiClient>();
      final routes = await fetchSavedRoutesForActivity(api, _activity);
      if (!mounted) return;
      setState(() {
        _routes = routes;
        _loadingRoutes = false;
      });
    } on ApiException catch (e) {
      if (mounted) {
        setState(() {
          _error = localizeUserError(e, AppLocalizations.of(context));
          _loadingRoutes = false;
        });
      }
    }
  }

  Future<void> _launchRoute(
    SavedRoute route, {
    required bool leaveNow,
    DateTime? departureAt,
    bool silent = false,
  }) async {
    setState(() {
      _loadingRec = true;
      _error = null;
      _selectedRouteId = route.id;
    });
    try {
      final api = context.read<ApiClient>();
      final when = leaveNow
          ? DateTime.now().toUtc()
          : (departureAt ?? DateTime.now().toUtc());
      await api.post('/routes/${route.id}/plan', {
        'departureAt': when.toIso8601String(),
      }, auth: true);
      final q = Uri(
        path: '/recommend',
        queryParameters: recommendationQuery(
          activityType: route.activityType,
          routeId: route.id,
          departureAt: when.toIso8601String(),
          inputs: _inputs,
        ),
      );
      final data = await api.get(q.toString());
      if (mounted) setState(() => _data = data);
    } on ApiException catch (e) {
      if (mounted) {
        setState(
          () => _error = localizeUserError(e, AppLocalizations.of(context)),
        );
      }
    } finally {
      if (mounted) setState(() => _loadingRec = false);
    }
  }

  Future<void> _openRoute(SavedRoute route) async {
    if (route.isCommute) {
      await Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => CommutePlanScreen(route: route)),
      );
      return;
    }
    await _pickDeparture(route);
  }

  Future<void> _pickDeparture(SavedRoute route) async {
    final choice = await showModalBottomSheet<String>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              title: Text(
                route.name,
                style: GoogleFonts.barlowCondensed(
                  fontSize: 22,
                  fontWeight: FontWeight.w600,
                ),
              ),
              subtitle: Text(AppLocalizations.of(ctx).whenLeaving),
            ),
            ListTile(
              leading: const Icon(Icons.bolt),
              title: Text(AppLocalizations.of(ctx).leaveNow),
              onTap: () => Navigator.pop(ctx, 'now'),
            ),
            ListTile(
              leading: const Icon(Icons.today),
              title: Text(AppLocalizations.of(ctx).todayAt),
              onTap: () => Navigator.pop(ctx, 'today'),
            ),
            ListTile(
              leading: const Icon(Icons.event),
              title: Text(AppLocalizations.of(ctx).tomorrowAt),
              onTap: () => Navigator.pop(ctx, 'tomorrow'),
            ),
            ListTile(
              leading: const Icon(Icons.edit_calendar),
              title: Text(AppLocalizations.of(ctx).customDateTime),
              onTap: () => Navigator.pop(ctx, 'custom'),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
    if (choice == null || !mounted) return;

    if (choice == 'now') {
      await _launchRoute(route, leaveNow: true);
      return;
    }

    final now = DateTime.now();
    DateTime base = now;
    if (choice == 'tomorrow') {
      base = DateTime(
        now.year,
        now.month,
        now.day,
      ).add(const Duration(days: 1));
    } else if (choice == 'today') {
      base = DateTime(now.year, now.month, now.day);
    }

    TimeOfDay? time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(now.add(const Duration(minutes: 15))),
    );
    if (time == null || !mounted) return;

    DateTime departure = DateTime(
      base.year,
      base.month,
      base.day,
      time.hour,
      time.minute,
    );

    if (choice == 'custom') {
      final date = await showDatePicker(
        context: context,
        initialDate: now,
        firstDate: now.subtract(const Duration(days: 1)),
        lastDate: now.add(const Duration(days: 14)),
      );
      if (date == null || !mounted) return;
      departure = DateTime(
        date.year,
        date.month,
        date.day,
        time.hour,
        time.minute,
      );
    }

    await _launchRoute(route, leaveNow: false, departureAt: departure.toUtc());
  }

  Future<void> _addRoute() async {
    final saved = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => RidePlannerScreen(
          savedRoutes: _routes,
          activityType: _activityType,
          initialInputs: _inputs,
        ),
      ),
    );
    if (saved == true) await _loadRoutes();
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () async {
        await _loadRoutes();
        SavedRoute? selected;
        for (final r in _routes) {
          if (r.id == _selectedRouteId) {
            selected = r;
            break;
          }
        }
        selected ??= _routes.isEmpty ? null : _routes.first;
        if (selected != null && !selected.isCommute) {
          await _launchRoute(selected, leaveNow: true);
        }
      },
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 56, 24, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const ActivitySwitcher(),
                  const SizedBox(height: 6),
                  ResortDisciplineControl(
                    activityType: context
                        .watch<ActivityContext>()
                        .currentActivity
                        .apiValue,
                    onChanged: (discipline) => context
                        .read<ActivityContext>()
                        .setCurrentActivity(discipline),
                  ),
                  ActivityPlanningControls(
                    activityType: context
                        .watch<ActivityContext>()
                        .currentActivity
                        .apiValue,
                    inputs: _inputs,
                    onChanged: (next) => setState(() => _inputs = next),
                  ),
                  Text(
                    AppLocalizations.of(context).quickRoutes,
                    style: GoogleFonts.sourceSerif4(
                      fontSize: 22,
                      color: AppTheme.steel,
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (_loadingRoutes)
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: CircularProgressIndicator()),
              ),
            )
          else
            SliverToBoxAdapter(
              child: SizedBox(
                height: _routes.isEmpty ? 72 : 132,
                child: _routes.isEmpty
                    ? Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 24),
                        child: OutlinedButton.icon(
                          onPressed: _addRoute,
                          icon: const Icon(Icons.add),
                          label: Text(AppLocalizations.of(context).planNewRide),
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        scrollDirection: Axis.horizontal,
                        itemCount: _routes.length + 1,
                        separatorBuilder: (_, _) => const SizedBox(width: 10),
                        itemBuilder: (context, i) {
                          if (i == _routes.length) {
                            return _QuickChip(
                              title: AppLocalizations.of(context)
                                  .homePlanNewChip,
                              subtitle: AppLocalizations.of(context)
                                  .homeSaveRouteChip,
                              selected: false,
                              onTap: _addRoute,
                            );
                          }
                          final r = _routes[i];
                          return _QuickChip(
                            title: r.name,
                            subtitle:
                                '${routeDuration(AppLocalizations.of(context), r.typicalDurationMin)}'
                                '${r.isFavorite ? ' · ★' : ''}',
                            selected: r.id == _selectedRouteId,
                            onTap: () => _openRoute(r),
                          );
                        },
                      ),
              ),
            ),
          if (_error != null && _data == null)
            SliverFillRemaining(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(_error!, textAlign: TextAlign.center),
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: _bootstrap,
                      child: Text(AppLocalizations.of(context).commonRetry),
                    ),
                  ],
                ),
              ),
            )
          else if (_loadingRec)
            const SliverFillRemaining(
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_data != null) ...[
            SliverToBoxAdapter(child: _RecommendationBody(data: _data!)),
            if (_showHomeAd)
              const SliverToBoxAdapter(
                child: AdBannerSlot(
                  surface: AdSurface.activityHome,
                  contentState: AdContentState.ready,
                  position: AdPlacementPosition.afterPrimaryContent,
                ),
              ),
          ] else
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  AppLocalizations.of(context).tapSavedRoute,
                  style: TextStyle(
                    color: AppTheme.steel.withValues(alpha: 0.95),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  bool get _showHomeAd => evaluateAdPlacement(
    AdPlacementRequest(
      adsEnabled: AppConfig.adsEnabled,
      surface: AdSurface.activityHome,
      format: AdFormat.banner,
      contentState: _homeAdState,
      position: AdPlacementPosition.afterPrimaryContent,
    ),
  ).show;

  AdContentState get _homeAdState {
    if (_loadingRoutes || _loadingRec) return AdContentState.loading;
    if (_error != null) return AdContentState.error;
    if (_data == null) return AdContentState.empty;
    return AdContentState.ready;
  }
}

class _QuickChip extends StatelessWidget {
  const _QuickChip({
    required this.title,
    required this.subtitle,
    required this.selected,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected
          ? AppTheme.mist.withValues(alpha: 0.85)
          : Colors.white.withValues(alpha: 0.65),
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          width: 148,
          padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.barlowCondensed(
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const Spacer(),
              Text(
                subtitle,
                style: TextStyle(
                  color: AppTheme.steel.withValues(alpha: 0.9),
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RecommendationBody extends StatelessWidget {
  const _RecommendationBody({required this.data});

  final Map<String, dynamic> data;

  String _routeLine(AppLocalizations l10n, Map<String, dynamic> route) {
    final start = route['startLabel']?.toString();
    final end = route['endLabel']?.toString();
    if (start != null && start.isNotEmpty && start == end) return start;
    return '${start ?? l10n.labelStart} → ${end ?? l10n.labelEnd}';
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final units = context.watch<UnitPreferencesController>();
    final fmt = units.formatter(
      localeName: Localizations.localeOf(context).toString(),
    );
    final route = data['route'] as Map<String, dynamic>;
    final weather = data['weather'] as Map<String, dynamic>;
    final rec = data['recommendation'] as Map<String, dynamic>;
    final view = presentRecommendation(data);

    final wear = view.wear;
    final pack = view.pack;
    final legacyItems = (rec['items'] is List)
        ? (rec['items'] as List).map((e) => e.toString()).toList()
        : <String>[];
    final confidenceLevel = view.confidenceLevel;
    final exposureC =
        view.exposureC ??
        (rec['exposure'] is Map
            ? (rec['exposure'] as Map)['motorcycleExposureSustainedC']
            : null);

    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            route['name']?.toString() ?? l10n.homeFallbackRide,
            style: GoogleFonts.barlowCondensed(
              fontSize: 34,
              fontWeight: FontWeight.w600,
              color: AppTheme.asphalt,
            ),
          ),
          Text(
            _routeLine(l10n, route),
            style: TextStyle(color: AppTheme.steel.withValues(alpha: 0.9)),
          ),
          if (recommendationInputSummary(l10n, data['comfort']) != null) ...[
            const SizedBox(height: 8),
            Text(
              recommendationInputSummary(l10n, data['comfort'])!,
              style: TextStyle(color: AppTheme.steel.withValues(alpha: 0.95)),
            ),
          ],
          const SizedBox(height: 20),
          Wrap(
            spacing: 16,
            runSpacing: 8,
            children: [
              _Metric(
                label: l10n.metricTemp,
                value: fmt.temperatureRangeFromC(
                  weather['minTempC'] as num,
                  weather['maxTempC'] as num,
                ),
              ),
              _Metric(
                label: l10n.metricExposure,
                value: exposureC != null
                    ? fmt.temperatureFromC(exposureC as num)
                    : '—',
              ),
              _Metric(
                label: l10n.metricRain,
                value:
                    '${(weather['maxRainProbPct'] as num).toStringAsFixed(0)}%',
              ),
              _Metric(
                label: l10n.metricWind,
                value: fmt.windFromMs(weather['maxWindMs'] as num),
              ),
              if (confidenceLevel != null)
                _Metric(
                  label: l10n.confidenceLabel,
                  value: confidenceValue(l10n, confidenceLevel),
                ),
            ],
          ),
          ...recommendationContextWidgets(
            context,
            view,
            formatTemp: fmt.temperatureFromC,
          ),
          const SizedBox(height: 28),
          recommendationSectionTitle(l10n.wearSection),
          const SizedBox(height: 4),
          Text(
            l10n.wearSectionHint,
            style: TextStyle(color: AppTheme.steel.withValues(alpha: 0.9)),
          ),
          const SizedBox(height: 8),
          if (wear.isNotEmpty)
            ...wear.asMap().entries.map(
              (entry) => recommendationKitEntry(
                context: context,
                item: entry.value,
                icon: Icons.check_circle_outline,
                index: entry.key,
              ),
            )
          else
            ...legacyItems
                .where((i) => !i.startsWith('Pack:'))
                .map(
                  (item) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      children: [
                        const Icon(Icons.check_circle_outline, size: 20),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            item,
                            style: const TextStyle(fontSize: 17),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
          if (pack.isNotEmpty) ...[
            const SizedBox(height: 20),
            recommendationSectionTitle(l10n.packSection),
            const SizedBox(height: 4),
            Text(
              l10n.packSectionHint,
              style: TextStyle(color: AppTheme.steel.withValues(alpha: 0.9)),
            ),
            const SizedBox(height: 8),
            ...pack.asMap().entries.map(
              (entry) => recommendationKitEntry(
                context: context,
                item: entry.value,
                icon: Icons.backpack_outlined,
                index: wear.length + entry.key,
              ),
            ),
          ],
          ...recommendationExplanationWidgets(
            context,
            view,
            showConfidenceLevel: false,
          ),
          const SizedBox(height: 24),
          FilledButton.tonal(
            onPressed: () => showFeedbackSheet(context, data),
            child: Text(l10n.homeHowWasTheRide),
          ),
          // Recommendation card stays ad-free (trust / safety surface).
        ],
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: GoogleFonts.barlowCondensed(
            fontSize: 12,
            letterSpacing: 1.1,
            color: AppTheme.steel,
          ),
        ),
        Text(
          value,
          style: GoogleFonts.barlowCondensed(
            fontSize: 26,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}
