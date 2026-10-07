import 'dart:async';

import 'package:flutter/material.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/l10n/ui_labels.dart';
import 'package:motorcycle_clothing/services/location/location_models.dart';
import 'package:motorcycle_clothing/services/location/location_search_service.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';

typedef PlaceSelected = void Function(ResolvedPlace place);

/// Autocomplete field for Start / Destination / intermediate stops.
class PlaceSearchField extends StatefulWidget {
  const PlaceSearchField({
    super.key,
    required this.search,
    required this.label,
    this.initialDisplay,
    this.onSelected,
    this.onCleared,
    this.enabled = true,
  });

  final LocationSearchService search;
  final String label;
  final String? initialDisplay;
  final PlaceSelected? onSelected;
  final VoidCallback? onCleared;
  final bool enabled;

  @override
  State<PlaceSearchField> createState() => _PlaceSearchFieldState();
}

class _PlaceSearchFieldState extends State<PlaceSearchField> {
  late final TextEditingController _controller;
  final FocusNode _focus = FocusNode();
  Timer? _debounce;
  Timer? _hideTimer;
  bool _loading = false;
  String? _error;
  List<PlaceSuggestion> _suggestions = const [];
  bool _resolving = false;
  bool _suppressSearch = false;
  bool _hadSelection = false;
  int _requestId = 0;
  int _hideGeneration = 0;
  String _typedQuery = '';
  String? _retryQuery;
  PlaceSuggestion? _retrySuggestion;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialDisplay ?? '');
    _hadSelection =
        widget.initialDisplay != null &&
        widget.initialDisplay!.trim().isNotEmpty;
    _focus.addListener(() {
      if (_focus.hasFocus) return;
      _scheduleHideSuggestions();
    });
  }

  @override
  void didUpdateWidget(covariant PlaceSearchField oldWidget) {
    super.didUpdateWidget(oldWidget);
    final next = widget.initialDisplay ?? '';
    final prev = oldWidget.initialDisplay ?? '';
    if (next == prev) return;

    final typed = _controller.text;
    final userIsEditing = typed.trim().isNotEmpty && typed != prev;
    if (userIsEditing && next.isEmpty) {
      // The parent cleared the selected place because typing started.
      // Keep the typed query, including Norwegian characters, and let the
      // in-flight search finish.
      _hadSelection = false;
      return;
    }

    _requestId++;
    _hideGeneration++;
    _debounce?.cancel();
    _suppressSearch = true;
    _controller.text = next;
    _suppressSearch = false;
    _typedQuery = '';
    _hadSelection = next.trim().isNotEmpty;
    _suggestions = const [];
    _error = null;
    _loading = false;
    _resolving = false;
    _retryQuery = null;
    _retrySuggestion = null;
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    _focus.dispose();
    _hideTimer?.cancel();
    super.dispose();
  }

  void _scheduleHideSuggestions() {
    final generation = ++_hideGeneration;
    _hideTimer?.cancel();
    _hideTimer = Timer(const Duration(milliseconds: 200), () {
      if (!mounted || generation != _hideGeneration || _focus.hasFocus) return;
      // Hide the list after blur. Do not invent or restore a provider error.
      setState(() => _suggestions = const []);
    });
  }

  void _onChanged(String value) {
    if (_suppressSearch) return;
    _requestId++;
    _typedQuery = value;
    // Clear resolved selection once when the user starts editing.
    if (_hadSelection) {
      _hadSelection = false;
      widget.onCleared?.call();
    }
    if (_resolving || _error != null || _retrySuggestion != null) {
      setState(() {
        _resolving = false;
        _error = null;
        _retryQuery = null;
        _retrySuggestion = null;
      });
    }
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 320), () {
      _runAutocomplete(value);
    });
  }

  Future<void> _runAutocomplete(String value) async {
    final requestId = ++_requestId;
    final q = value.trim();
    if (q.length < 2) {
      if (mounted && requestId == _requestId) {
        setState(() => _publish(suggestions: const [], error: null));
      }
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await widget.search.autocomplete(q);
      if (!mounted || requestId != _requestId) return;
      final l10n = AppLocalizations.of(context);
      setState(() {
        _hideGeneration++;
        _hideTimer?.cancel();
        _publish(
          suggestions: results,
          error: results.isEmpty ? l10n.placeNoResults : null,
        );
      });
    } on LocationProviderException catch (e) {
      if (!mounted || requestId != _requestId) return;
      setState(() {
        _retryQuery = q;
        _retrySuggestion = null;
        _publish(
          suggestions: const [],
          error: localizeLocationError(e, AppLocalizations.of(context)),
        );
      });
    } catch (_) {
      if (!mounted || requestId != _requestId) return;
      setState(() {
        _retryQuery = q;
        _retrySuggestion = null;
        _publish(
          suggestions: const [],
          error: AppLocalizations.of(context).placeSearchFailed,
        );
      });
    }
  }

  /// Suggestions and a provider/empty error never stay visible together.
  void _publish({
    required List<PlaceSuggestion> suggestions,
    required String? error,
  }) {
    if (suggestions.isNotEmpty) {
      _suggestions = suggestions;
      _error = null;
    } else {
      _suggestions = const [];
      _error = error;
    }
    _loading = false;
  }

  Future<void> _select(PlaceSuggestion suggestion) async {
    final requestId = ++_requestId;
    _debounce?.cancel();
    _hideGeneration++;
    _hideTimer?.cancel();
    final typedQuery = _typedQuery;
    if (suggestion.hasCoordinates) {
      _applySelection(
        _resolvedFromSuggestion(suggestion, typedQuery: typedQuery),
      );
      return;
    }
    setState(() {
      _resolving = true;
      _error = null;
      _retryQuery = null;
      _retrySuggestion = null;
      _suggestions = const [];
    });
    try {
      final place = await widget.search.resolve(suggestion);
      if (!mounted || requestId != _requestId) return;
      final label = preserveSelectedPlaceLabel(
        typedQuery: typedQuery,
        suggestionLabel: suggestion.displayLabel,
        resolvedLabel: place.label,
      );
      _applySelection(
        ResolvedPlace(
          providerPlaceId: place.providerPlaceId,
          label: label,
          lat: place.lat,
          lon: place.lon,
          address: place.address,
        ),
      );
    } on LocationProviderException catch (e) {
      if (mounted && requestId == _requestId) {
        setState(() {
          _suggestions = const [];
          _retryQuery = null;
          _retrySuggestion = suggestion;
          _error = localizeLocationError(e, AppLocalizations.of(context));
        });
      }
    } catch (_) {
      if (mounted && requestId == _requestId) {
        setState(() {
          _suggestions = const [];
          _retryQuery = null;
          _retrySuggestion = suggestion;
          _error = AppLocalizations.of(context).placeSearchFailed;
        });
      }
    } finally {
      if (mounted && requestId == _requestId) {
        setState(() => _resolving = false);
      }
    }
  }

  ResolvedPlace _resolvedFromSuggestion(
    PlaceSuggestion suggestion, {
    required String typedQuery,
  }) {
    final label = preserveSelectedPlaceLabel(
      typedQuery: typedQuery,
      suggestionLabel: suggestion.displayLabel,
      resolvedLabel: suggestion.label?.trim().isNotEmpty == true
          ? suggestion.label!.trim()
          : suggestion.displayLabel,
    );
    return ResolvedPlace(
      providerPlaceId: suggestion.providerPlaceId,
      label: label,
      lat: suggestion.lat!,
      lon: suggestion.lon!,
      address: suggestion.address,
    );
  }

  void _applySelection(ResolvedPlace place) {
    _suppressSearch = true;
    _controller.text = place.label;
    _suppressSearch = false;
    _typedQuery = '';
    _hadSelection = true;
    setState(() {
      _loading = false;
      _resolving = false;
      _suggestions = const [];
      _error = null;
      _retryQuery = null;
      _retrySuggestion = null;
    });
    _focus.unfocus();
    widget.onSelected?.call(place);
  }

  void _retry() {
    final suggestion = _retrySuggestion;
    final query = _retryQuery ?? _controller.text;
    if (suggestion != null) {
      _select(suggestion);
      return;
    }
    if (query.trim().length >= 2) _runAutocomplete(query);
  }

  void _clear() {
    _requestId++;
    _hideGeneration++;
    _debounce?.cancel();
    _hideTimer?.cancel();
    _typedQuery = '';
    _suppressSearch = true;
    _controller.clear();
    _suppressSearch = false;
    _hadSelection = false;
    setState(() {
      _loading = false;
      _resolving = false;
      _suggestions = const [];
      _error = null;
      _retryQuery = null;
      _retrySuggestion = null;
    });
    widget.onCleared?.call();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: _controller,
          focusNode: _focus,
          enabled: widget.enabled,
          keyboardType: TextInputType.text,
          textCapitalization: TextCapitalization.none,
          autocorrect: false,
          enableSuggestions: false,
          smartDashesType: SmartDashesType.disabled,
          smartQuotesType: SmartQuotesType.disabled,
          onChanged: _onChanged,
          decoration: InputDecoration(
            labelText: widget.label,
            hintText: l10n.placeSearchHint,
            suffixIcon: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (_loading || _resolving)
                  const Padding(
                    padding: EdgeInsets.only(right: 8),
                    child: SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  ),
                if (_controller.text.isNotEmpty)
                  IconButton(
                    tooltip: l10n.commonClear,
                    onPressed: widget.enabled ? _clear : null,
                    icon: const Icon(Icons.clear),
                  ),
              ],
            ),
          ),
        ),
        if (_suggestions.isEmpty && _error != null && !_loading)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _error!,
                  style: TextStyle(
                    color: _error == l10n.placeNoResults
                        ? AppTheme.steel
                        : Colors.red.shade700,
                    fontSize: 13,
                  ),
                ),
                if (_error != l10n.placeNoResults)
                  TextButton(
                    style: TextButton.styleFrom(
                      minimumSize: const Size(48, 48),
                      tapTargetSize: MaterialTapTargetSize.padded,
                    ),
                    onPressed: widget.enabled ? _retry : null,
                    child: Text(l10n.commonRetry),
                  ),
              ],
            ),
          ),
        if (_suggestions.isNotEmpty)
          TextFieldTapRegion(
            child: Material(
              elevation: 2,
              borderRadius: BorderRadius.circular(8),
              child: ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _suggestions.length,
                separatorBuilder: (_, _) => const Divider(height: 1),
                itemBuilder: (context, i) {
                  final s = _suggestions[i];
                  return ListTile(
                    dense: true,
                    leading: const Icon(Icons.place_outlined),
                    title: Text(s.primaryText),
                    subtitle: s.secondaryText == null
                        ? null
                        : Text(s.secondaryText!),
                    onTap: () => _select(s),
                  );
                },
              ),
            ),
          ),
      ],
    );
  }
}
