import 'dart:async';

import 'package:flutter/material.dart';
import 'package:motorcycle_clothing/features/plan/device_location_service.dart';
import 'package:motorcycle_clothing/features/routes/place_search_field.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/services/location/location_search_service.dart';
import 'package:motorcycle_clothing/services/resorts/resort_directory.dart';
import 'package:motorcycle_clothing/services/resorts/ski_resort.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';

/// Straight-line context for a resort row. Name search falls back to coordinates.
String resortResultSubtitle(AppLocalizations l10n, SkiResort resort) {
  final meters = resort.straightLineDistanceM;
  if (meters != null && meters >= 0) {
    if (meters < 1000) {
      return l10n.plannerResortStraightLineMeters(meters);
    }
    return l10n.plannerResortStraightLineKm((meters / 1000).toStringAsFixed(1));
  }
  return '${resort.lat.toStringAsFixed(2)}, ${resort.lon.toStringAsFixed(2)}';
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
    this.selectedResortName,
  });

  final ResortDirectory directory;
  final DeviceLocationService deviceLocation;
  final LocationSearchService places;
  final ValueChanged<SkiResort> onSelected;
  final String? selectedResortId;
  final String? selectedResortName;

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
    });
    try {
      final hits = await widget.directory.searchByName(query.trim());
      if (!mounted || id != _request) return;
      setState(() {
        _results = hits;
        _error = null;
        _settled = true;
        _loading = false;
      });
    } on ResortDirectoryException {
      if (!mounted || id != _request) return;
      setState(() {
        _results = const [];
        _error = AppLocalizations.of(context).plannerResortUnavailable;
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
    } on ResortDirectoryException {
      if (!mounted || id != _request) return;
      setState(() {
        _results = const [];
        _error = AppLocalizations.of(context).plannerResortUnavailable;
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

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final selected = widget.selectedResortName?.trim() ?? '';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          l10n.plannerResortAttribution,
          style: TextStyle(
            fontSize: 13,
            color: AppTheme.steel.withValues(alpha: 0.9),
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _nameCtrl,
          keyboardType: TextInputType.text,
          textCapitalization: TextCapitalization.none,
          autocorrect: false,
          enableSuggestions: false,
          smartDashesType: SmartDashesType.disabled,
          smartQuotesType: SmartQuotesType.disabled,
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
            child: Text(
              _error!,
              style: TextStyle(color: Colors.red.shade700, fontSize: 13),
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
              subtitle: Text(resortResultSubtitle(l10n, resort)),
              onTap: () => widget.onSelected(resort),
            ),
        ],
        if (selected.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text('${l10n.plannerResortSelected}: $selected'),
        ],
      ],
    );
  }
}
