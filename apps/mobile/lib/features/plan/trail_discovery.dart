import 'package:flutter/material.dart';
import 'package:motorcycle_clothing/features/plan/device_location_service.dart';
import 'package:motorcycle_clothing/features/routes/place_search_field.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/services/location/location_search_service.dart';
import 'package:motorcycle_clothing/services/trails/ski_trail.dart';
import 'package:motorcycle_clothing/services/trails/trail_directory.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';

/// Straight-line context for a trail row. This is not driving distance.
String trailResultSubtitle(AppLocalizations l10n, SkiTrail trail) {
  final meters = trail.straightLineDistanceM;
  if (meters < 1000) {
    return l10n.plannerResortStraightLineMeters(meters);
  }
  return l10n.plannerResortStraightLineKm((meters / 1000).toStringAsFixed(1));
}

/// Nearby ski-trail discovery. Manual start/end planning stays on the planner.
class TrailDiscoverySection extends StatefulWidget {
  const TrailDiscoverySection({
    super.key,
    required this.directory,
    required this.deviceLocation,
    required this.places,
    required this.onSelected,
    this.selectedTrailId,
    this.selectedTrailName,
  });

  final TrailDirectory directory;
  final DeviceLocationService deviceLocation;
  final LocationSearchService places;
  final ValueChanged<SkiTrail> onSelected;
  final String? selectedTrailId;
  final String? selectedTrailName;

  @override
  State<TrailDiscoverySection> createState() => _TrailDiscoverySectionState();
}

class _TrailDiscoverySectionState extends State<TrailDiscoverySection> {
  int _request = 0;
  bool _loading = false;
  bool _locating = false;
  bool _settled = false;
  String? _error;
  String? _locationError;
  List<SkiTrail> _results = const [];

  Future<void> _nearbyFrom(double lat, double lon) async {
    if (!lat.isFinite || !lon.isFinite) {
      setState(() {
        _locationError =
            AppLocalizations.of(context).plannerTrailLocationTemporary;
      });
      return;
    }
    final id = ++_request;
    setState(() {
      _loading = true;
      _error = null;
      _locationError = null;
    });
    try {
      final hits = await widget.directory.nearby(lat: lat, lon: lon);
      if (!mounted || id != _request) return;
      setState(() {
        _results = hits;
        _error = null;
        _settled = true;
        _loading = false;
      });
    } on TrailDirectoryException {
      if (!mounted || id != _request) return;
      setState(() {
        _results = const [];
        _error = AppLocalizations.of(context).plannerTrailUnavailable;
        _settled = true;
        _loading = false;
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
      final result = await widget.deviceLocation.getCurrentPlace(
        label: l10n.currentLocation,
      );
      if (!mounted) return;
      if (!result.isOk || result.place == null) {
        setState(() {
          _locationError = _locationFailure(
            l10n,
            result.failure ?? DeviceLocationFailure.temporaryFailure,
          );
        });
        return;
      }
      final place = result.place!;
      setState(() => _locationError = null);
      await _nearbyFrom(place.lat, place.lon);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _locationError = l10n.plannerTrailLocationTemporary;
      });
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  String _locationFailure(
    AppLocalizations l10n,
    DeviceLocationFailure failure,
  ) {
    return switch (failure) {
      DeviceLocationFailure.permissionDenied => l10n.plannerTrailLocationDenied,
      DeviceLocationFailure.permissionDeniedForever =>
        l10n.plannerTrailLocationDeniedForever,
      DeviceLocationFailure.serviceDisabled =>
        l10n.plannerTrailLocationDisabled,
      DeviceLocationFailure.temporaryFailure =>
        l10n.plannerTrailLocationTemporary,
    };
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final selected = widget.selectedTrailName?.trim() ?? '';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          l10n.plannerTrailAttribution,
          style: TextStyle(
            fontSize: 13,
            color: AppTheme.steel.withValues(alpha: 0.9),
          ),
        ),
        const SizedBox(height: 8),
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton.icon(
            style: TextButton.styleFrom(
              minimumSize: const Size(48, 48),
              tapTargetSize: MaterialTapTargetSize.padded,
            ),
            onPressed: _locating || _loading ? null : _useCurrentLocation,
            icon: _locating || _loading
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
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
              style: TextStyle(color: Colors.red.shade700, fontSize: 13),
            ),
          ),
        PlaceSearchField(
          search: widget.places,
          label: l10n.plannerTrailNearPlace,
          onSelected: (place) => _nearbyFrom(place.lat, place.lon),
        ),
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              _error!,
              style: TextStyle(color: Colors.red.shade700, fontSize: 13),
            ),
          ),
        if (_settled && _error == null && _results.isEmpty && !_loading)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              l10n.plannerTrailEmpty,
              style: TextStyle(
                color: AppTheme.steel.withValues(alpha: 0.9),
                fontSize: 13,
              ),
            ),
          ),
        if (_results.isNotEmpty) ...[
          const SizedBox(height: 8),
          for (final trail in _results)
            ListTile(
              key: ValueKey('trail-${trail.id}'),
              contentPadding: EdgeInsets.zero,
              leading: Icon(
                trail.id == widget.selectedTrailId
                    ? Icons.check_circle
                    : Icons.downhill_skiing,
              ),
              title: Text(trail.name),
              subtitle: Text(trailResultSubtitle(l10n, trail)),
              onTap: () => widget.onSelected(trail),
            ),
        ],
        if (selected.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text('${l10n.plannerTrailSelected}: $selected'),
        ],
      ],
    );
  }
}
