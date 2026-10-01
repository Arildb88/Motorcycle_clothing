import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:motorcycle_clothing/domain/saved_route.dart';
import 'package:motorcycle_clothing/features/routes/place_search_field.dart';
import 'package:motorcycle_clothing/features/routes/route_map_preview.dart';
import 'package:motorcycle_clothing/features/routes/waypoint_draft.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/l10n/ui_labels.dart';
import 'package:motorcycle_clothing/services/api_client.dart';
import 'package:motorcycle_clothing/services/location/route_preview_copy.dart';
import 'package:motorcycle_clothing/services/location/location_models.dart';
import 'package:motorcycle_clothing/services/location/location_services.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';

/// Create / edit a saved motorcycle route via place search + map preview.
///
/// Coordinates stay canonical for persistence; the user-facing flow uses
/// place/address search. Manual lat/lon is a collapsed advanced fallback only.
class RouteEditorScreen extends StatefulWidget {
  const RouteEditorScreen({super.key, this.existing});

  final SavedRoute? existing;

  @override
  State<RouteEditorScreen> createState() => _RouteEditorScreenState();
}

class _RouteEditorScreenState extends State<RouteEditorScreen> {
  final _name = TextEditingController();
  final _description = TextEditingController();
  String? _category;
  bool _favorite = false;
  bool _saving = false;
  String? _error;
  List<WaypointDraft> _waypoints = [
    WaypointDraft.empty(),
    WaypointDraft.empty(),
  ];

  bool _mapLoading = false;
  String? _mapError;
  RouteGeometry? _geometry;
  int _geometryEpoch = 0;

  // Advanced fallback controllers (hidden by default).
  final List<TextEditingController> _advLat = [];
  final List<TextEditingController> _advLon = [];

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    if (e != null) {
      _name.text = e.name;
      _description.text = e.description ?? '';
      _category = e.category;
      _favorite = e.isFavorite;
      if (e.waypoints.isNotEmpty) {
        _waypoints = e.waypoints
            .map(WaypointDraft.fromRouteWaypoint)
            .toList();
      }
    }
    _waypoints = WaypointListOps.ensureStartAndEnd(_waypoints);
    _syncAdvancedControllers();
    WidgetsBinding.instance.addPostFrameCallback((_) => _refreshGeometry());
  }

  @override
  void dispose() {
    _name.dispose();
    _description.dispose();
    for (final c in _advLat) {
      c.dispose();
    }
    for (final c in _advLon) {
      c.dispose();
    }
    super.dispose();
  }

  LocationServices get _location => context.read<LocationServices>();

  bool get _canSave => WaypointListOps.canSave(
        name: _name.text,
        waypoints: _waypoints,
      );

  void _syncAdvancedControllers() {
    while (_advLat.length < _waypoints.length) {
      _advLat.add(TextEditingController());
      _advLon.add(TextEditingController());
    }
    while (_advLat.length > _waypoints.length) {
      _advLat.removeLast().dispose();
      _advLon.removeLast().dispose();
    }
    for (var i = 0; i < _waypoints.length; i++) {
      final w = _waypoints[i];
      _advLat[i].text = w.lat?.toString() ?? '';
      _advLon[i].text = w.lon?.toString() ?? '';
    }
  }

  Future<void> _refreshGeometry() async {
    final pts = _waypoints
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
        avoidMotorways: widget.existing?.avoidMotorways ?? false,
      );
      if (!mounted || epoch != _geometryEpoch) return;
      setState(() {
        _geometry = geometry;
        _mapLoading = false;
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

  void _onPlaceSelected(int index, ResolvedPlace place) {
    setState(() {
      _waypoints[index].applyResolved(place);
      _error = null;
      _syncAdvancedControllers();
    });
    _refreshGeometry();
  }

  void _onPlaceCleared(int index) {
    setState(() {
      _waypoints[index].clearPlace();
      _syncAdvancedControllers();
    });
    _refreshGeometry();
  }

  void _addStop() {
    setState(() {
      _waypoints = WaypointListOps.addStop(_waypoints);
      _syncAdvancedControllers();
    });
  }

  void _removeStop(int i) {
    final next = WaypointListOps.removeAt(_waypoints, i);
    if (next == null) return;
    setState(() {
      _waypoints = next;
      _syncAdvancedControllers();
    });
    _refreshGeometry();
  }

  void _move(int i, int delta) {
    final next = WaypointListOps.move(_waypoints, i, delta);
    if (next == null) return;
    setState(() {
      _waypoints = next;
      _syncAdvancedControllers();
    });
    _refreshGeometry();
  }

  void _applyAdvanced(int index) {
    final lat = double.tryParse(_advLat[index].text.trim());
    final lon = double.tryParse(_advLon[index].text.trim());
    if (lat == null || lon == null) {
      setState(
        () => _error = AppLocalizations.of(context).routeCoordsInvalid,
      );
      return;
    }
    setState(() {
      _waypoints[index].applyManualCoordinates(
        latitude: lat,
        longitude: lon,
        manualLabel: _waypoints[index].label ??
            AppLocalizations.of(context).coordCustomPoint,
      );
      _error = null;
    });
    _refreshGeometry();
  }

  Future<void> _save() async {
    if (!_canSave) {
      setState(() {
        _error = AppLocalizations.of(context).routeEditorIncomplete;
      });
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final waypoints = WaypointListOps.toApiWaypoints(_waypoints);
      final duration =
          _geometry?.durationMin ?? widget.existing?.typicalDurationMin ?? 35;
      final body = {
        'name': _name.text.trim(),
        if (_description.text.trim().isNotEmpty)
          'description': _description.text.trim(),
        if (_category != null) 'category': _category,
        'isFavorite': _favorite,
        'activityType': 'motorcycle',
        'waypoints': waypoints,
        'typicalDurationMin': duration,
      };
      final api = context.read<ApiClient>();
      if (widget.existing == null) {
        await api.post('/routes', body, auth: true);
      } else {
        await api.patch('/routes/${widget.existing!.id}', body);
      }
      if (mounted) Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      if (mounted) {
        setState(() => _error = localizeUserError(e, AppLocalizations.of(context)));
      }
    } catch (e) {
      if (mounted) {
        setState(() => _error = localizeUserError(e, AppLocalizations.of(context)));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final stopPoints = _waypoints
        .map((w) => w.geoPoint)
        .whereType<GeoPoint>()
        .toList();

    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.existing == null ? l10n.routeNew : l10n.routeEdit),
        actions: [
          TextButton(
            onPressed: (_saving || !_canSave) ? null : _save,
            child: _saving
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Text(l10n.commonSave),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          TextField(
            controller: _name,
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(
              labelText: l10n.commonName,
              hintText: l10n.routeNameHint,
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _description,
            decoration: InputDecoration(
              labelText: l10n.routeDescription,
            ),
            maxLines: 2,
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String?>(
            // ignore: deprecated_member_use
            value: _category,
            decoration: InputDecoration(labelText: l10n.commonCategory),
            items: [
              DropdownMenuItem(value: null, child: Text(l10n.commonNone)),
              DropdownMenuItem(value: 'work', child: Text(l10n.routeCatWork)),
              DropdownMenuItem(value: 'commute', child: Text(l10n.routeCatCommute)),
              DropdownMenuItem(value: 'home', child: Text(l10n.routeCatHome)),
              DropdownMenuItem(value: 'weekend', child: Text(l10n.routeCatWeekend)),
              DropdownMenuItem(value: 'touring', child: Text(l10n.routeCatTouring)),
              DropdownMenuItem(
                value: 'favourite',
                child: Text(l10n.routeCatFavourite),
              ),
              DropdownMenuItem(value: 'custom', child: Text(l10n.routeCatCustom)),
            ],
            onChanged: (v) => setState(() => _category = v),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(l10n.commonFavorite),
            subtitle: Text(l10n.routeFavoriteHint),
            value: _favorite,
            onChanged: (v) => setState(() => _favorite = v),
          ),
          const SizedBox(height: 8),
          Text(
            l10n.routeSection,
            style: GoogleFonts.barlowCondensed(
              fontSize: 22,
              fontWeight: FontWeight.w600,
            ),
          ),
          Text(
            l10n.routeSearchHint,
            style: TextStyle(
              color: AppTheme.steel.withValues(alpha: 0.9),
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 12),
          RouteMapPreview(
            waypoints: stopPoints,
            geometry: _geometry,
            loading: _mapLoading,
            error: _mapError,
          ),
          const SizedBox(height: 16),
          ...List.generate(_waypoints.length, (i) {
            final w = _waypoints[i];
            final role = waypointRole(l10n, i, _waypoints.length);
            return Card(
              margin: const EdgeInsets.only(bottom: 12),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Text(
                          role,
                          style: GoogleFonts.barlowCondensed(
                            fontWeight: FontWeight.w700,
                            fontSize: 18,
                          ),
                        ),
                        const Spacer(),
                        IconButton(
                          tooltip: l10n.plannerMoveUp,
                          onPressed: () => _move(i, -1),
                          icon: const Icon(Icons.arrow_upward),
                        ),
                        IconButton(
                          tooltip: l10n.plannerMoveDown,
                          onPressed: () => _move(i, 1),
                          icon: const Icon(Icons.arrow_downward),
                        ),
                        if (_waypoints.length > 2)
                          IconButton(
                            tooltip: l10n.commonRemove,
                            onPressed: () => _removeStop(i),
                            icon: const Icon(Icons.delete_outline),
                          ),
                      ],
                    ),
                    PlaceSearchField(
                      key: ValueKey('place-$i-${w.providerPlaceId ?? w.displayLabel}'),
                      search: _location.search,
                      label: role,
                      initialDisplay: w.displayLabel.isEmpty
                          ? null
                          : w.displayLabel,
                      onSelected: (place) => _onPlaceSelected(i, place),
                      onCleared: () => _onPlaceCleared(i),
                    ),
                    if (w.isResolved)
                      Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text(
                          w.address ?? w.displayLabel,
                          style: TextStyle(
                            color: AppTheme.steel.withValues(alpha: 0.85),
                            fontSize: 12,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            );
          }),
          OutlinedButton.icon(
            onPressed: _addStop,
            icon: const Icon(Icons.add),
            label: Text(l10n.plannerAddStop),
          ),
          const SizedBox(height: 8),
          ExpansionTile(
            tilePadding: EdgeInsets.zero,
            title: Text(l10n.routeAdvancedCoords),
            subtitle: Text(l10n.routeAdvancedHint),
            children: [
              for (var i = 0; i < _waypoints.length; i++)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _advLat[i],
                          keyboardType: const TextInputType.numberWithOptions(
                            decimal: true,
                            signed: true,
                          ),
                          decoration: InputDecoration(
                            labelText: l10n.coordLatitude(
                              waypointRole(l10n, i, _waypoints.length),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextField(
                          controller: _advLon[i],
                          keyboardType: const TextInputType.numberWithOptions(
                            decimal: true,
                            signed: true,
                          ),
                          decoration: InputDecoration(labelText: l10n.coordLongitude),
                        ),
                      ),
                      IconButton(
                        tooltip: l10n.coordApply,
                        onPressed: () => _applyAdvanced(i),
                        icon: const Icon(Icons.check),
                      ),
                    ],
                  ),
                ),
            ],
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: Colors.red)),
          ],
          const SizedBox(height: 16),
          FilledButton(
            onPressed: (_saving || !_canSave) ? null : _save,
            child: Text(l10n.plannerSaveRoute),
          ),
        ],
      ),
    );
  }
}
