import 'dart:async';

import 'package:flutter/material.dart';
import 'package:motorcycle_clothing/features/plan/device_location_service.dart';
import 'package:motorcycle_clothing/features/plan/fnugg_attribution_link.dart';
import 'package:motorcycle_clothing/features/routes/place_query_field.dart';
import 'package:motorcycle_clothing/features/routes/place_search_field.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/services/location/location_search_service.dart';
import 'package:motorcycle_clothing/services/resorts/fnugg_source.dart';
import 'package:motorcycle_clothing/services/resorts/resort_directory.dart';
import 'package:motorcycle_clothing/services/resorts/ski_resort.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';

/// Straight-line distance when the directory measured one.
/// Coordinates stay on [SkiResort] and are not shown on the card.
String? resortResultSubtitle(AppLocalizations l10n, SkiResort resort) {
  final meters = resort.straightLineDistanceM;
  if (meters == null || meters < 0) return null;
  if (meters < 1000) {
    return l10n.plannerResortStraightLineMeters(meters);
  }
  return l10n.plannerResortStraightLineKm((meters / 1000).toStringAsFixed(1));
}

/// Name search and nearby discovery for alpine skiing and snowboarding.
class ResortDiscoverySection extends StatefulWidget {
  const ResortDiscoverySection({
    super.key,
    required this.directory,
    required this.deviceLocation,
    required this.places,
    required this.onSelected,
    this.selectedResortId,
    this.onOpenAttribution,
  });

  final ResortDirectory directory;
  final DeviceLocationService deviceLocation;
  final LocationSearchService places;
  final ValueChanged<SkiResort> onSelected;
  final String? selectedResortId;
  final Future<void> Function(Uri uri)? onOpenAttribution;

  @override
  State<ResortDiscoverySection> createState() => _ResortDiscoverySectionState();
}

class _ResortDiscoverySectionState extends State<ResortDiscoverySection> {
  final _nameCtrl = TextEditingController();
  Timer? _debounce;
  int _request = 0;
  bool _loading = false;
  bool _locating = false;
  bool _settled = false;
  String? _error;
  String? _locationError;
  String? _retryQuery;
  ({double lat, double lon})? _retryNearby;
  List<SkiResort> _results = const [];

  @override
  void dispose() {
    _debounce?.cancel();
    _nameCtrl.dispose();
    super.dispose();
  }

  void _onNameChanged(String value) {
    _debounce?.cancel();
    final query = value;
    if (query.trim().isEmpty) {
      _request++;
      setState(() {
        _loading = false;
        _settled = false;
        _error = null;
        _results = const [];
      });
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 300), () {
      _search(query);
    });
  }

  Future<void> _search(String query) async {
    final id = ++_request;
    setState(() {
      _loading = true;
      _error = null;
      _retryNearby = null;
    });
    try {
      final hits = await widget.directory.searchByName(query.trim());
      if (!mounted || id != _request) return;
      setState(() {
        _results = hits;
        _error = null;
        _retryQuery = null;
        _settled = true;
        _loading = false;
      });
    } on ResortDirectoryException {
      if (!mounted || id != _request) return;
      setState(() {
        _results = const [];
        _error = AppLocalizations.of(context).plannerResortUnavailable;
        _retryQuery = query.trim();
        _settled = true;
        _loading = false;
      });
    }
  }

  Future<void> _nearbyFrom(double lat, double lon) async {
    if (!lat.isFinite || !lon.isFinite) {
      setState(() {
        _locationError = AppLocalizations.of(context)
            .plannerResortLocationTemporary;
      });
      return;
    }
    final id = ++_request;
    setState(() {
      _loading = true;
      _error = null;
      _locationError = null;
      _retryQuery = null;
    });
    try {
      final hits = await widget.directory.nearby(lat: lat, lon: lon);
      if (!mounted || id != _request) return;
      setState(() {
        _results = hits;
        _error = null;
        _retryNearby = null;
        _settled = true;
        _loading = false;
      });
    } on ResortDirectoryException {
      if (!mounted || id != _request) return;
      setState(() {
        _results = const [];
        _error = AppLocalizations.of(context).plannerResortUnavailable;
        _retryNearby = (lat: lat, lon: lon);
        _settled = true;
        _loading = false;
      });
    }
  }

  void _retry() {
    final nearby = _retryNearby;
    if (nearby != null) {
      _nearbyFrom(nearby.lat, nearby.lon);
      return;
    }
    final query = (_retryQuery ?? _nameCtrl.text).trim();
    if (query.isNotEmpty) _search(query);
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
        _locationError = l10n.plannerResortLocationTemporary;
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
      DeviceLocationFailure.permissionDenied =>
        l10n.plannerResortLocationDenied,
      DeviceLocationFailure.permissionDeniedForever =>
        l10n.plannerResortLocationDeniedForever,
      DeviceLocationFailure.serviceDisabled =>
        l10n.plannerResortLocationDisabled,
      DeviceLocationFailure.temporaryFailure =>
        l10n.plannerResortLocationTemporary,
    };
  }

  void _choose(SkiResort resort) {
    widget.onSelected(resort);
  }

  Widget? _distanceSubtitle(AppLocalizations l10n, SkiResort resort) {
    final subtitle = resortResultSubtitle(l10n, resort);
    if (subtitle == null) return null;
    return Text(subtitle);
  }

  Widget _attribution(AppLocalizations l10n, {required Uri uri, Key? key}) {
    return FnuggAttributionLink(
      key: key,
      label: l10n.plannerResortAttribution,
      uri: uri,
      onOpen: widget.onOpenAttribution,
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final directoryAttribution = _attribution(
      l10n,
      uri: fnuggHomeUri,
      key: const Key('fnugg-attribution'),
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (_results.isEmpty) directoryAttribution,
        if (_results.isEmpty) const SizedBox(height: 12),
        PlaceQueryField(
          controller: _nameCtrl,
          onChanged: _onNameChanged,
          decoration: InputDecoration(
            labelText: l10n.plannerResortName,
            suffixIcon: _loading
                ? const Padding(
                    padding: EdgeInsets.all(12),
                    child: SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  )
                : null,
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
            onPressed: _locating ? null : _useCurrentLocation,
            icon: _locating
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.my_location, size: 18),
            label: Text(l10n.plannerResortNearby),
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
          label: l10n.plannerResortNearPlace,
          onSelected: (place) => _nearbyFrom(place.lat, place.lon),
        ),
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _error!,
                  style: TextStyle(color: Colors.red.shade700, fontSize: 13),
                ),
                TextButton(
                  style: TextButton.styleFrom(
                    minimumSize: const Size(48, 48),
                    tapTargetSize: MaterialTapTargetSize.padded,
                  ),
                  onPressed: _loading ? null : _retry,
                  child: Text(l10n.commonRetry),
                ),
              ],
            ),
          ),
        if (_settled && _error == null && _results.isEmpty && !_loading)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              l10n.plannerResortEmpty,
              style: TextStyle(
                color: AppTheme.steel.withValues(alpha: 0.9),
                fontSize: 13,
              ),
            ),
          ),
        if (_results.isNotEmpty) ...[
          const SizedBox(height: 8),
          directoryAttribution,
          for (final resort in _results)
            ListTile(
              key: ValueKey('resort-${resort.id}'),
              contentPadding: EdgeInsets.zero,
              leading: Icon(
                resort.id == widget.selectedResortId
                    ? Icons.check_circle
                    : Icons.downhill_skiing,
              ),
              title: Text(resort.name),
              subtitle: _distanceSubtitle(l10n, resort),
              onTap: () => _choose(resort),
            ),
        ],
      ],
    );
  }
}
