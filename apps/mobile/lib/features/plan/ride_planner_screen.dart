import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:motorcycle_clothing/domain/activity.dart';
import 'package:motorcycle_clothing/domain/saved_route.dart';
import 'package:motorcycle_clothing/features/plan/resort_discipline_control.dart';
import 'package:motorcycle_clothing/state/activity_context.dart';
import 'package:motorcycle_clothing/features/plan/activity_recommendation_request.dart';
import 'package:motorcycle_clothing/features/plan/device_location_service.dart';
import 'package:motorcycle_clothing/features/plan/ride_analysis_result_screen.dart';
import 'package:motorcycle_clothing/features/plan/resort_discovery.dart';
import 'package:motorcycle_clothing/features/plan/ride_planner_models.dart';
import 'package:motorcycle_clothing/features/plan/trail_discovery.dart';
import 'package:motorcycle_clothing/features/routes/place_query_field.dart';
import 'package:motorcycle_clothing/features/routes/place_search_field.dart';
import 'package:motorcycle_clothing/services/resorts/resort_directory.dart';
import 'package:motorcycle_clothing/services/resorts/ski_resort.dart';
import 'package:motorcycle_clothing/services/trails/ski_trail.dart';
import 'package:motorcycle_clothing/services/trails/trail_directory.dart';
import 'package:motorcycle_clothing/features/routes/route_map_preview.dart';
import 'package:motorcycle_clothing/features/routes/waypoint_draft.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/l10n/ui_labels.dart';
import 'package:motorcycle_clothing/services/api_client.dart';
import 'package:motorcycle_clothing/services/location/location_models.dart';
import 'package:motorcycle_clothing/services/location/route_preview_copy.dart';
import 'package:motorcycle_clothing/services/location/location_services.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';
import 'package:motorcycle_clothing/widgets/common.dart';

enum _XcPlanningChoice { nearby, manual }

/// Plan a route for the current activity, then request its recommendation.
///
/// Not turn-by-turn navigation. External navigation handoff is out of scope.
class RidePlannerScreen extends StatefulWidget {
  const RidePlannerScreen({
    super.key,
    this.initialRoute,
    this.savedRoutes = const [],
    this.activityType = 'motorcycle',
    this.initialInputs = const ActivityPlanningInputs(),
  });

  final SavedRoute? initialRoute;
  final List<SavedRoute> savedRoutes;
  final String activityType;
  final ActivityPlanningInputs initialInputs;

  @override
  State<RidePlannerScreen> createState() => _RidePlannerScreenState();
}

class _RidePlannerScreenState extends State<RidePlannerScreen> {
  late RidePlannerState _state;
  final _nameCtrl = TextEditingController();

  bool _mapLoading = false;
  String? _mapError;
  RouteGeometry? _geometry;
  int _geometryEpoch = 0;

  bool _busy = false;
  String? _error;
  String? _locationError;
  bool _locating = false;
  _XcPlanningChoice _xcChoice = _XcPlanningChoice.manual;

  DeviceLocationService get _deviceLocation =>
      context.read<DeviceLocationService>();

  LocationServices get _location => context.read<LocationServices>();

  List<int> get _sessionLengthChoices {
    final values = <int>{60, 120, 180, 240, _state.durationMin};
    final list = values.toList()..sort();
    return list;
  }

  @override
  void initState() {
    super.initState();
    final initial = widget.initialRoute;
    if (initial != null) {
      final wps = initial.waypoints
          .map(WaypointDraft.fromRouteWaypoint)
          .toList();
      _state = RidePlannerState(
        routeId: initial.id,
        routeName: initial.name,
        waypoints: wps,
        durationMin: initial.typicalDurationMin,
        avoidMotorways: initial.avoidMotorways,
        roundTrip:
            initial.routeKind == 'loop' ||
            WaypointListOps.looksLikeRoundTrip(wps),
        activityType: initial.activityType,
        inputs: widget.initialInputs,
      );
      _nameCtrl.text = initial.name;
    } else {
      _state = RidePlannerState(
        activityType: widget.activityType,
        inputs: widget.initialInputs,
      );
    }
    WidgetsBinding.instance.addPostFrameCallback((_) => _refreshGeometry());
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    super.dispose();
  }

  void _update(RidePlannerState next) {
    setState(() => _state = next);
    _refreshGeometry();
  }

  /// Same resort, time, and weather flow. Only the stored discipline changes.
  void _setResortDiscipline(AppActivity discipline) {
    if (!discipline.isResortSnowSport) return;
    if (_state.activityType == discipline.apiValue) return;
    _update(_state.copyWith(activityType: discipline.apiValue));
    Provider.of<ActivityContext?>(
      context,
      listen: false,
    )?.setCurrentActivity(discipline);
  }

  Future<void> _refreshGeometry() async {
    if (!_state.usesRoadPreview) {
      setState(() {
        _geometry = null;
        _mapError = null;
        _mapLoading = false;
      });
      return;
    }
    final pts = _state.waypoints
        .map((w) => w.geoPoint)
        .whereType<GeoPoint>()
        .toList();
    if (pts.length < 2) {
      setState(() {
        _geometry = null;
        _mapError = null;
        _mapLoading = false;
      });
      return;
    }
    final epoch = ++_geometryEpoch;
    setState(() {
      _mapLoading = true;
      _mapError = null;
    });
    try {
      final geometry = await _location.geometry.computeRoute(
        pts,
        avoidMotorways: _state.avoidMotorways,
      );
      if (!mounted || epoch != _geometryEpoch) return;
      setState(() {
        _geometry = geometry;
        _mapLoading = false;
        if (geometry?.durationMin != null) {
          _state = _state.copyWith(durationMin: geometry!.durationMin);
        }
      });
    } on LocationProviderException catch (e) {
      if (!mounted || epoch != _geometryEpoch) return;
      setState(() {
        _mapLoading = false;
        _mapError = localizedRoutePreviewError(AppLocalizations.of(context), e);
        _geometry = null;
      });
    } catch (_) {
      if (!mounted || epoch != _geometryEpoch) return;
      setState(() {
        _mapLoading = false;
        _mapError = AppLocalizations.of(context).plannerMapFailed;
        _geometry = null;
      });
    }
  }

  Future<void> _useCurrentLocation() async {
    final l10n = AppLocalizations.of(context);
    setState(() {
      _locating = true;
      _locationError = null;
    });
    try {
      final result = await _deviceLocation.getCurrentPlace(
        label: l10n.currentLocation,
      );
      if (!mounted) return;
      if (!result.isOk || result.place == null) {
        setState(() {
          _locationError = _locationFailureMessage(
            l10n,
            result.failure ?? DeviceLocationFailure.temporaryFailure,
          );
        });
        return;
      }
      final place = result.place!;
      if (!place.lat.isFinite || !place.lon.isFinite) {
        setState(() {
          _locationError = l10n.plannerLocationTemporaryFailure;
        });
        return;
      }
      final next = List<WaypointDraft>.from(_state.waypoints);
      if (next.isEmpty) next.add(WaypointDraft.empty());
      final localId = next.first.localId;
      next[0] = WaypointDraft.fromResolved(place, localId: localId);
      var updated = _state.copyWith(waypoints: next);
      if (updated.roundTrip) {
        updated = updated.copyWith(
          waypoints: WaypointListOps.applyRoundTrip(next, enabled: true),
        );
      }
      setState(() => _locationError = null);
      _update(updated);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _locationError = l10n.plannerLocationTemporaryFailure;
      });
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  String? get _selectedResortId {
    if (_state.waypoints.isEmpty) return null;
    final id = _state.waypoints.first.providerPlaceId;
    const prefix = 'fnugg:';
    if (id == null || !id.startsWith(prefix)) return null;
    final raw = id.substring(prefix.length);
    return raw.isEmpty ? null : raw;
  }

  String? get _selectedResortName {
    if (_state.waypoints.isEmpty || !_state.waypoints.first.isResolved) {
      return null;
    }
    final label = _state.waypoints.first.displayLabel;
    return label.isEmpty ? null : label;
  }

  void _selectResort(SkiResort resort) {
    final draft = WaypointDraft.fromResolved(
      ResolvedPlace(
        providerPlaceId: resort.providerPlaceId,
        label: resort.name,
        lat: resort.lat,
        lon: resort.lon,
      ),
    );
    if (_nameCtrl.text.trim().isEmpty) {
      _nameCtrl.text = resort.name;
    }
    _update(_state.copyWith(waypoints: [draft], routeName: _nameCtrl.text));
  }

  bool get _xcNearby =>
      _state.activityType == 'xc_skiing' &&
      _xcChoice == _XcPlanningChoice.nearby;

  String? get _selectedTrailId {
    if (_state.waypoints.isEmpty) return null;
    final id = _state.waypoints.first.providerPlaceId;
    const prefix = 'geonorge:';
    if (id == null || !id.startsWith(prefix)) return null;
    final raw = id.substring(prefix.length);
    return raw.isEmpty ? null : raw;
  }

  String? get _selectedTrailName {
    if (_selectedTrailId == null || _state.waypoints.isEmpty) return null;
    if (!_state.waypoints.first.isResolved) return null;
    final label = _state.waypoints.first.displayLabel;
    return label.isEmpty ? null : label;
  }

  void _selectTrail(SkiTrail trail) {
    if (trail.line.length < 2) return;
    final drafts = [
      for (var i = 0; i < trail.line.length; i++)
        WaypointDraft.fromResolved(
          ResolvedPlace(
            providerPlaceId: i == 0 ? trail.providerPlaceId : '',
            label: trail.name,
            lat: trail.line[i].lat,
            lon: trail.line[i].lon,
          ),
        ),
    ];
    if (_nameCtrl.text.trim().isEmpty) {
      _nameCtrl.text = trail.name;
    }
    _update(_state.copyWith(waypoints: drafts, routeName: _nameCtrl.text));
  }

  String _locationFailureMessage(
    AppLocalizations l10n,
    DeviceLocationFailure failure,
  ) {
    return switch (failure) {
      DeviceLocationFailure.permissionDenied =>
        l10n.plannerLocationPermissionDenied,
      DeviceLocationFailure.permissionDeniedForever =>
        l10n.plannerLocationPermissionDeniedForever,
      DeviceLocationFailure.serviceDisabled =>
        l10n.plannerLocationServicesDisabled,
      DeviceLocationFailure.temporaryFailure =>
        l10n.plannerLocationTemporaryFailure,
    };
  }

  Future<void> _pickDateTime() async {
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: _state.anchorAt,
      firstDate: now.subtract(const Duration(days: 1)),
      lastDate: now.add(const Duration(days: 14)),
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_state.anchorAt),
    );
    if (time == null || !mounted) return;
    _update(
      _state.copyWith(
        leaveNow: false,
        anchorAt: DateTime(
          date.year,
          date.month,
          date.day,
          time.hour,
          time.minute,
        ),
      ),
    );
  }

  Future<void> _loadSavedRoute() async {
    final l10n = AppLocalizations.of(context);
    final routes = widget.savedRoutes;
    if (routes.isEmpty) {
      setState(() => _error = l10n.plannerNoSavedRoutes);
      return;
    }
    final chosen = await showModalBottomSheet<SavedRoute>(
      context: context,
      showDragHandle: true,
      builder: (ctx) {
        return SafeArea(
          child: ListView(
            shrinkWrap: true,
            children: [
              ListTile(
                title: Text(
                  l10n.plannerChooseSavedRoute,
                  style: GoogleFonts.barlowCondensed(
                    fontSize: 22,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              for (final r in routes)
                ListTile(
                  leading: Icon(
                    r.isFavorite ? Icons.star : Icons.route,
                    color: AppTheme.amber,
                  ),
                  title: Text(r.name),
                  subtitle: Text(routeSummary(l10n, r)),
                  onTap: () => Navigator.pop(ctx, r),
                ),
            ],
          ),
        );
      },
    );
    if (chosen == null || !mounted) return;
    final wps = chosen.waypoints.map(WaypointDraft.fromRouteWaypoint).toList();
    _nameCtrl.text = chosen.name;
    _update(
      RidePlannerState(
        routeId: chosen.id,
        routeName: chosen.name,
        waypoints: wps,
        durationMin: chosen.typicalDurationMin,
        avoidMotorways: chosen.avoidMotorways,
        roundTrip:
            chosen.routeKind == 'loop' ||
            WaypointListOps.looksLikeRoundTrip(wps),
        planningMode: _state.planningMode,
        leaveNow: _state.leaveNow,
        anchorAt: _state.anchorAt,
        activityType: chosen.activityType,
        inputs: _state.inputs,
      ),
    );
  }

  Future<String?> _ensureRouteId(ApiClient api) async {
    final body = _state.routeUpsertBody();
    if (_state.routeId != null) {
      await api.patch('/routes/${_state.routeId}', body);
      return _state.routeId;
    }
    final created = await api.post('/routes', body, auth: true);
    final id = created['id'] as String?;
    if (id != null) {
      setState(() => _state = _state.copyWith(routeId: id));
    }
    return id;
  }

  Future<void> _saveRoute() async {
    final l10n = AppLocalizations.of(context);
    if (!_state.canSave) {
      setState(
        () => _error = activityUsesSitePins(_state.activityType)
            ? l10n.plannerSaveDisabledResort
            : l10n.plannerSaveDisabledHint,
      );
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await _ensureRouteId(context.read<ApiClient>());
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(l10n.plannerRouteSaved)));
    } on ApiException catch (e) {
      if (mounted) {
        setState(
          () => _error = localizeUserError(e, AppLocalizations.of(context)),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(
          () => _error = localizeUserError(e, AppLocalizations.of(context)),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _analyzeRide() async {
    final l10n = AppLocalizations.of(context);
    if (!_state.canAnalyze) {
      setState(
        () => _error = activityUsesSitePins(_state.activityType)
            ? l10n.plannerIncompleteResort
            : l10n.plannerIncompleteRoute,
      );
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final api = context.read<ApiClient>();
      if (_nameCtrl.text.trim().isEmpty) {
        _nameCtrl.text = l10n.plannerDefaultRouteName;
        _state = _state.copyWith(routeName: _nameCtrl.text);
      }
      final routeId = await _ensureRouteId(api);
      if (routeId == null) {
        setState(() => _error = l10n.plannerCouldNotSave);
        return;
      }
      final planBody = _state.planRequestBody();
      await api.post('/routes/$routeId/plan', planBody, auth: true);
      final departureIso =
          (planBody['departureAt'] as String?) ??
          DateTime.now().toUtc().toIso8601String();
      final data = await api.get(
        Uri(
          path: '/recommend',
          queryParameters: _state.recommendQuery(routeId, departureIso),
        ).toString(),
      );
      if (!mounted) return;
      await Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => RideAnalysisResultScreen(payload: data),
        ),
      );
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = localizeUserError(e, l10n));
    } catch (e) {
      if (mounted) setState(() => _error = localizeUserError(e, l10n));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Widget _xcChoiceButton({
    required String label,
    required bool selected,
    required VoidCallback onPressed,
  }) {
    final style = TextButton.styleFrom(
      minimumSize: const Size(48, 48),
      tapTargetSize: MaterialTapTargetSize.padded,
    );
    if (selected) {
      return FilledButton(
        style: style,
        onPressed: onPressed,
        child: Text(label),
      );
    }
    return OutlinedButton(
      style: style,
      onPressed: onPressed,
      child: Text(label),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final sitePins = activityUsesSitePins(_state.activityType);
    final subtitle = sitePins
        ? l10n.plannerResortSubtitle
        : _state.activityType == 'xc_skiing'
        ? l10n.plannerTrailSubtitle
        : l10n.plannerSubtitle;
    final stops = _state.waypoints
        .map((w) => w.geoPoint)
        .whereType<GeoPoint>()
        .toList();
    final timeLabel =
        _state.leaveNow && _state.planningMode == PlanningMode.departure
        ? l10n.leaveNow
        : DateFormat.yMMMd(Localizations.localeOf(context).languageCode)
              .add_Hm()
              .format(_state.anchorAt);

    return Scaffold(
      appBar: AppBar(
        title: Text(
          l10n.plannerTitle,
          style: GoogleFonts.barlowCondensed(fontWeight: FontWeight.w600),
        ),
        actions: [
          TextButton(
            onPressed: _busy ? null : _loadSavedRoute,
            child: Text(l10n.plannerSavedRoutes),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        children: [
          Text(
            subtitle,
            style: TextStyle(color: AppTheme.steel.withValues(alpha: 0.95)),
          ),
          const SizedBox(height: 12),
          if (_state.activityType == 'xc_skiing') ...[
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _xcChoiceButton(
                  label: l10n.plannerTrailNearby,
                  selected: _xcChoice == _XcPlanningChoice.nearby,
                  onPressed: () =>
                      setState(() => _xcChoice = _XcPlanningChoice.nearby),
                ),
                _xcChoiceButton(
                  label: l10n.plannerTrailManual,
                  selected: _xcChoice == _XcPlanningChoice.manual,
                  onPressed: () =>
                      setState(() => _xcChoice = _XcPlanningChoice.manual),
                ),
              ],
            ),
            const SizedBox(height: 12),
          ],
          if (!sitePins && !_xcNearby)
            RouteMapPreview(
              waypoints: stops,
              geometry: _geometry,
              loading: _mapLoading,
              error: _mapError,
            ),
          if (localizedRouteNotice(l10n, _geometry) != null) ...[
            const SizedBox(height: 8),
            Text(
              localizedRouteNotice(l10n, _geometry)!,
              style: TextStyle(
                fontSize: 12,
                color: AppTheme.steel.withValues(alpha: 0.85),
              ),
            ),
          ],
          const SizedBox(height: 16),
          if (_xcNearby)
            TrailDiscoverySection(
              directory: context.read<TrailDirectory>(),
              deviceLocation: _deviceLocation,
              places: _location.search,
              selectedTrailId: _selectedTrailId,
              selectedTrailName: _selectedTrailName,
              onSelected: _selectTrail,
            )
          else if (sitePins)
            ResortDiscoverySection(
              directory: context.read<ResortDirectory>(),
              deviceLocation: _deviceLocation,
              places: _location.search,
              selectedResortId: _selectedResortId,
              selectedResortName: _selectedResortName,
              onSelected: _selectResort,
            )
          else ...[
            ...List.generate(_state.waypoints.length, (i) {
              final w = _state.waypoints[i];
              final role = sitePins
                  ? (_state.waypoints.length == 1
                        ? l10n.plannerPlace
                        : l10n.plannerPlaceNumber(i + 1))
                  : waypointRole(l10n, i, _state.waypoints.length);
              return Padding(
                key: ValueKey('plan-${w.localId}'),
                padding: const EdgeInsets.only(bottom: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            role,
                            style: GoogleFonts.barlowCondensed(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        IconButton(
                          tooltip: l10n.plannerMoveUp,
                          onPressed: () {
                            final next = WaypointListOps.move(
                              _state.waypoints,
                              i,
                              -1,
                            );
                            if (next != null) {
                              _update(_state.copyWith(waypoints: next));
                            }
                          },
                          icon: const Icon(Icons.arrow_upward),
                        ),
                        IconButton(
                          tooltip: l10n.plannerMoveDown,
                          onPressed: () {
                            final next = WaypointListOps.move(
                              _state.waypoints,
                              i,
                              1,
                            );
                            if (next != null) {
                              _update(_state.copyWith(waypoints: next));
                            }
                          },
                          icon: const Icon(Icons.arrow_downward),
                        ),
                        if (_state.waypoints.length > 2)
                          IconButton(
                            tooltip: l10n.plannerRemoveStop,
                            onPressed: () {
                              final next = WaypointListOps.removeAt(
                                _state.waypoints,
                                i,
                              );
                              if (next != null) {
                                _update(_state.copyWith(waypoints: next));
                              }
                            },
                            icon: const Icon(Icons.delete_outline),
                          ),
                      ],
                    ),
                    if (i == 0) ...[
                      Align(
                        alignment: Alignment.centerLeft,
                        child: TextButton.icon(
                          style: TextButton.styleFrom(
                            minimumSize: const Size(48, 48),
                            tapTargetSize: MaterialTapTargetSize.padded,
                          ),
                          onPressed: _locating ? null : _useCurrentLocation,
                          icon: _locating
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Icon(Icons.my_location, size: 18),
                          label: Text(l10n.plannerUseCurrentLocation),
                        ),
                      ),
                      if (_locationError != null)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Text(
                            _locationError!,
                            style: TextStyle(
                              color: Colors.red.shade700,
                              fontSize: 13,
                            ),
                          ),
                        ),
                    ],
                    PlaceSearchField(
                      search: _location.search,
                      label: role,
                      initialDisplay: w.displayLabel.isEmpty
                          ? null
                          : w.displayLabel,
                      onSelected: (place) {
                        final next = List<WaypointDraft>.from(_state.waypoints);
                        next[i] = WaypointDraft.fromResolved(
                          place,
                          localId: next[i].localId,
                        );
                        var updated = _state.copyWith(waypoints: next);
                        if (updated.roundTrip && i == 0) {
                          updated = updated.copyWith(
                            waypoints: WaypointListOps.applyRoundTrip(
                              next,
                              enabled: true,
                            ),
                          );
                        }
                        _update(updated);
                      },
                      onCleared: () {
                        final next = List<WaypointDraft>.from(_state.waypoints);
                        next[i].clearPlace();
                        _update(_state.copyWith(waypoints: next));
                      },
                    ),
                  ],
                ),
              );
            }),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                OutlinedButton.icon(
                  onPressed: () => _update(
                    _state.copyWith(
                      waypoints: WaypointListOps.addStop(_state.waypoints),
                    ),
                  ),
                  icon: const Icon(Icons.add),
                  label: Text(
                    sitePins ? l10n.plannerAddPlace : l10n.plannerAddStop,
                  ),
                ),
                if (_state.waypoints.length >= 2)
                  OutlinedButton.icon(
                    onPressed: () => _update(
                      _state.copyWith(
                        waypoints: WaypointListOps.reverse(_state.waypoints),
                      ),
                    ),
                    icon: const Icon(Icons.swap_vert),
                    label: Text(l10n.plannerReverse),
                  ),
                if (!sitePins)
                  FilterChip(
                    label: Text(l10n.plannerRoundTrip),
                    selected: _state.roundTrip,
                    onSelected: (v) {
                      _update(
                        _state.copyWith(
                          roundTrip: v,
                          waypoints: WaypointListOps.applyRoundTrip(
                            _state.waypoints,
                            enabled: v,
                          ),
                        ),
                      );
                    },
                  ),
              ],
            ),
          ],
          const SizedBox(height: 20),
          Text(
            l10n.plannerWhenSection,
            style: GoogleFonts.barlowCondensed(
              fontSize: 20,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          SegmentedButton<PlanningMode>(
            expandedInsets: EdgeInsets.zero,
            showSelectedIcon: false,
            segments: [
              ButtonSegment(
                value: PlanningMode.departure,
                label: Text(
                  l10n.plannerDeparture,
                  overflow: TextOverflow.ellipsis,
                ),
                icon: const Icon(Icons.logout),
              ),
              ButtonSegment(
                value: PlanningMode.arrival,
                label: Text(
                  l10n.plannerArrival,
                  overflow: TextOverflow.ellipsis,
                ),
                icon: const Icon(Icons.login),
              ),
            ],
            selected: {_state.planningMode},
            onSelectionChanged: (s) {
              _update(
                _state.copyWith(
                  planningMode: s.first,
                  leaveNow: s.first == PlanningMode.departure
                      ? _state.leaveNow
                      : false,
                ),
              );
            },
          ),
          const SizedBox(height: 8),
          Text(
            _state.planningMode == PlanningMode.departure
                ? l10n.plannerDepartureHint
                : l10n.plannerArrivalHint,
            style: TextStyle(
              fontSize: 13,
              color: AppTheme.steel.withValues(alpha: 0.9),
            ),
          ),
          const SizedBox(height: 8),
          if (_state.planningMode == PlanningMode.departure)
            FilterChip(
              label: Text(l10n.leaveNow),
              selected: _state.leaveNow,
              onSelected: (v) {
                _update(
                  _state.copyWith(
                    leaveNow: v,
                    anchorAt: v ? DateTime.now() : _state.anchorAt,
                  ),
                );
              },
            ),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.schedule),
            title: Text(
              _state.planningMode == PlanningMode.departure
                  ? l10n.plannerDepartureTime
                  : l10n.plannerArrivalTime,
            ),
            subtitle: Text(timeLabel),
            trailing: const Icon(Icons.edit_calendar),
            onTap: _pickDateTime,
          ),
          const SizedBox(height: 12),
          if (_state.usesRoadPreview)
            Text(
              l10n.plannerOptionsSection,
              style: GoogleFonts.barlowCondensed(
                fontSize: 20,
                fontWeight: FontWeight.w600,
              ),
            ),
          ResortDisciplineControl(
            activityType: _state.activityType,
            onChanged: _setResortDiscipline,
          ),
          ActivityPlanningControls(
            activityType: _state.activityType,
            inputs: _state.inputs,
            onChanged: (next) =>
                setState(() => _state = _state.copyWith(inputs: next)),
          ),
          if (!_state.usesRoadPreview) ...[
            Text(l10n.plannerSessionLength),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final minutes in _sessionLengthChoices)
                  ChoiceChip(
                    label: Text(routeDuration(l10n, minutes)),
                    selected: _state.durationMin == minutes,
                    onSelected: (_) =>
                        _update(_state.copyWith(durationMin: minutes)),
                  ),
              ],
            ),
            const SizedBox(height: 8),
          ],
          if (_state.usesRoadPreview)
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(l10n.plannerAvoidMotorways),
              subtitle: Text(l10n.plannerAvoidMotorwaysHint),
              value: _state.avoidMotorways,
              onChanged: (v) => _update(_state.copyWith(avoidMotorways: v)),
            ),
          PlaceQueryField(
            controller: _nameCtrl,
            onChanged: (v) =>
                setState(() => _state = _state.copyWith(routeName: v)),
            decoration: InputDecoration(
              labelText: _state.usesRoadPreview
                  ? l10n.plannerRouteName
                  : l10n.commonName,
              hintText: _state.usesRoadPreview
                  ? l10n.plannerRouteNameHint
                  : null,
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: Colors.redAccent)),
          ],
          const SizedBox(height: 20),
          FilledButton.icon(
            onPressed: (_busy || !_state.canAnalyze) ? null : _analyzeRide,
            icon: _busy
                ? const FilledButtonProgress()
                : const Icon(Icons.wb_cloudy_outlined),
            label: Text(l10n.plannerAnalyzeRide),
          ),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: (_busy || !_state.canSave) ? null : _saveRoute,
            icon: const Icon(Icons.bookmark_add_outlined),
            label: Text(l10n.plannerSaveRoute),
          ),
          const SizedBox(height: 8),
          Text(
            l10n.plannerPrimaryActionHint,
            style: TextStyle(
              fontSize: 12,
              color: AppTheme.steel.withValues(alpha: 0.85),
            ),
          ),
        ],
      ),
    );
  }
}
