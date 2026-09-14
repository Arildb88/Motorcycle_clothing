import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:motorcycle_clothing/domain/saved_route.dart';
import 'package:motorcycle_clothing/features/plan/device_location_service.dart';
import 'package:motorcycle_clothing/features/plan/ride_analysis_result_screen.dart';
import 'package:motorcycle_clothing/features/plan/ride_planner_models.dart';
import 'package:motorcycle_clothing/features/routes/place_search_field.dart';
import 'package:motorcycle_clothing/features/routes/route_map_preview.dart';
import 'package:motorcycle_clothing/features/routes/waypoint_draft.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/services/api_client.dart';
import 'package:motorcycle_clothing/services/location/location_models.dart';
import 'package:motorcycle_clothing/services/location/location_services.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';

/// Motorcycle ride planner — plan → analyze weather/exposure → kit advice.
///
/// Not turn-by-turn navigation. External navigation handoff is out of scope.
class RidePlannerScreen extends StatefulWidget {
  const RidePlannerScreen({
    super.key,
    this.initialRoute,
    this.savedRoutes = const [],
  });

  final SavedRoute? initialRoute;
  final List<SavedRoute> savedRoutes;

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
  bool _locating = false;

  DeviceLocationService get _deviceLocation =>
      context.read<DeviceLocationService>();

  LocationServices get _location => context.read<LocationServices>();

  @override
  void initState() {
    super.initState();
    final initial = widget.initialRoute;
    if (initial != null) {
      final wps =
          initial.waypoints.map(WaypointDraft.fromRouteWaypoint).toList();
      _state = RidePlannerState(
        routeId: initial.id,
        routeName: initial.name,
        waypoints: wps,
        durationMin: initial.typicalDurationMin,
        avoidMotorways: initial.avoidMotorways,
        roundTrip: initial.routeKind == 'loop' ||
            WaypointListOps.looksLikeRoundTrip(wps),
      );
      _nameCtrl.text = initial.name;
    } else {
      _state = RidePlannerState();
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

  Future<void> _refreshGeometry() async {
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
      final geometry = await _location.geometry.computeRoute(pts);
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
        _mapError = e.message;
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
      _error = null;
    });
    final result = await _deviceLocation.getCurrentPlace();
    if (!mounted) return;
    setState(() => _locating = false);
    if (!result.isOk) {
      final msg = switch (result.failure!) {
        DeviceLocationFailure.permissionDenied =>
          l10n.plannerLocationPermissionDenied,
        DeviceLocationFailure.permissionDeniedForever =>
          l10n.plannerLocationPermissionDeniedForever,
        DeviceLocationFailure.serviceDisabled =>
          l10n.plannerLocationServicesDisabled,
        DeviceLocationFailure.temporaryFailure =>
          l10n.plannerLocationTemporaryFailure,
      };
      setState(() => _error = msg);
      return;
    }
    final next = List<WaypointDraft>.from(_state.waypoints);
    next[0] = WaypointDraft.fromResolved(result.place!);
    var updated = _state.copyWith(waypoints: next);
    if (updated.roundTrip) {
      updated = updated.copyWith(
        waypoints: WaypointListOps.applyRoundTrip(next, enabled: true),
      );
    }
    _update(updated);
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
                  subtitle: Text(r.summaryLabel),
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
        roundTrip: chosen.routeKind == 'loop' ||
            WaypointListOps.looksLikeRoundTrip(wps),
        planningMode: _state.planningMode,
        leaveNow: _state.leaveNow,
        anchorAt: _state.anchorAt,
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
      setState(() => _error = l10n.plannerSaveDisabledHint);
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await _ensureRouteId(context.read<ApiClient>());
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.plannerRouteSaved)),
      );
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _analyzeRide() async {
    final l10n = AppLocalizations.of(context);
    if (!_state.canAnalyze) {
      setState(() => _error = l10n.plannerIncompleteRoute);
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
        throw ApiException('Could not save route for analysis');
      }
      final planBody = _state.planRequestBody();
      await api.post('/routes/$routeId/plan', planBody, auth: true);
      final departureIso = (planBody['departureAt'] as String?) ??
          DateTime.now().toUtc().toIso8601String();
      final data = await api.get(
        Uri(
          path: '/recommend',
          queryParameters: {
            'routeId': routeId,
            'departureAt': departureIso,
          },
        ).toString(),
      );
      if (!mounted) return;
      await Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => RideAnalysisResultScreen(payload: data),
        ),
      );
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final stops = _state.waypoints
        .map((w) => w.geoPoint)
        .whereType<GeoPoint>()
        .toList();
    final timeLabel =
        _state.leaveNow && _state.planningMode == PlanningMode.departure
            ? l10n.leaveNow
            : DateFormat.yMMMd().add_Hm().format(_state.anchorAt);

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
            l10n.plannerSubtitle,
            style: TextStyle(color: AppTheme.steel.withValues(alpha: 0.95)),
          ),
          const SizedBox(height: 12),
          RouteMapPreview(
            waypoints: stops,
            geometry: _geometry,
            loading: _mapLoading,
            error: _mapError,
          ),
          if (_geometry?.providerWarning != null) ...[
            const SizedBox(height: 8),
            Text(
              _geometry!.providerWarning!,
              style: TextStyle(
                fontSize: 12,
                color: AppTheme.steel.withValues(alpha: 0.85),
              ),
            ),
          ],
          const SizedBox(height: 16),
          ...List.generate(_state.waypoints.length, (i) {
            final w = _state.waypoints[i];
            final role = WaypointListOps.roleLabel(i, _state.waypoints.length);
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Text(
                        role,
                        style: GoogleFonts.barlowCondensed(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const Spacer(),
                      if (i == 0)
                        TextButton.icon(
                          onPressed: _locating ? null : _useCurrentLocation,
                          icon: _locating
                              ? const SizedBox(
                                  width: 14,
                                  height: 14,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Icon(Icons.my_location, size: 18),
                          label: Text(l10n.plannerUseCurrentLocation),
                        ),
                      IconButton(
                        tooltip: l10n.plannerMoveUp,
                        onPressed: () {
                          final next =
                              WaypointListOps.move(_state.waypoints, i, -1);
                          if (next != null) {
                            _update(_state.copyWith(waypoints: next));
                          }
                        },
                        icon: const Icon(Icons.arrow_upward),
                      ),
                      IconButton(
                        tooltip: l10n.plannerMoveDown,
                        onPressed: () {
                          final next =
                              WaypointListOps.move(_state.waypoints, i, 1);
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
                  PlaceSearchField(
                    key: ValueKey(
                      'plan-$i-${w.providerPlaceId ?? w.displayLabel}',
                    ),
                    search: _location.search,
                    label: role,
                    initialDisplay:
                        w.displayLabel.isEmpty ? null : w.displayLabel,
                    onSelected: (place) {
                      final next = List<WaypointDraft>.from(_state.waypoints);
                      next[i] = WaypointDraft.fromResolved(place);
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
                label: Text(l10n.plannerAddStop),
              ),
              OutlinedButton.icon(
                onPressed: () => _update(
                  _state.copyWith(
                    waypoints: WaypointListOps.reverse(_state.waypoints),
                  ),
                ),
                icon: const Icon(Icons.swap_vert),
                label: Text(l10n.plannerReverse),
              ),
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
            segments: [
              ButtonSegment(
                value: PlanningMode.departure,
                label: Text(l10n.plannerDeparture),
                icon: const Icon(Icons.logout),
              ),
              ButtonSegment(
                value: PlanningMode.arrival,
                label: Text(l10n.plannerArrival),
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
          Text(
            l10n.plannerOptionsSection,
            style: GoogleFonts.barlowCondensed(
              fontSize: 20,
              fontWeight: FontWeight.w600,
            ),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(l10n.plannerAvoidMotorways),
            subtitle: Text(l10n.plannerAvoidMotorwaysHint),
            value: _state.avoidMotorways,
            onChanged: (v) => _update(_state.copyWith(avoidMotorways: v)),
          ),
          TextField(
            controller: _nameCtrl,
            onChanged: (v) =>
                setState(() => _state = _state.copyWith(routeName: v)),
            decoration: InputDecoration(
              labelText: l10n.plannerRouteName,
              hintText: l10n.plannerRouteNameHint,
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
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
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
