import 'dart:async';

import 'package:flutter/material.dart';
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
  bool _loading = false;
  String? _error;
  List<PlaceSuggestion> _suggestions = const [];
  bool _resolving = false;
  bool _suppressSearch = false;
  bool _hadSelection = false;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialDisplay ?? '');
    _hadSelection =
        widget.initialDisplay != null && widget.initialDisplay!.trim().isNotEmpty;
    _focus.addListener(() {
      if (!_focus.hasFocus) {
        Future<void>.delayed(const Duration(milliseconds: 200), () {
          if (mounted && !_focus.hasFocus) {
            setState(() => _suggestions = const []);
          }
        });
      }
    });
  }

  @override
  void didUpdateWidget(covariant PlaceSearchField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.initialDisplay != oldWidget.initialDisplay &&
        widget.initialDisplay != _controller.text) {
      _suppressSearch = true;
      _controller.text = widget.initialDisplay ?? '';
      _suppressSearch = false;
      _hadSelection = widget.initialDisplay != null &&
          widget.initialDisplay!.trim().isNotEmpty;
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    _focus.dispose();
    super.dispose();
  }

  void _onChanged(String value) {
    if (_suppressSearch) return;
    // Clear resolved selection once when the user starts editing.
    if (_hadSelection) {
      _hadSelection = false;
      widget.onCleared?.call();
    }
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 320), () {
      _runAutocomplete(value);
    });
  }

  Future<void> _runAutocomplete(String value) async {
    final q = value.trim();
    if (q.length < 2) {
      if (mounted) {
        setState(() {
          _suggestions = const [];
          _loading = false;
          _error = null;
        });
      }
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await widget.search.autocomplete(q);
      if (!mounted) return;
      setState(() {
        _suggestions = results;
        _loading = false;
        if (results.isEmpty) {
          _error = 'No places found';
        }
      });
    } on LocationProviderException catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _suggestions = const [];
        _error = e.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _suggestions = const [];
        _error = 'Place search failed';
      });
    }
  }

  Future<void> _select(PlaceSuggestion suggestion) async {
    setState(() {
      _resolving = true;
      _error = null;
      _suggestions = const [];
    });
    try {
      final place = await widget.search.resolve(suggestion);
      if (!mounted) return;
      _suppressSearch = true;
      _controller.text = place.label;
      _suppressSearch = false;
      _hadSelection = true;
      _focus.unfocus();
      widget.onSelected?.call(place);
    } on LocationProviderException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _resolving = false);
    }
  }

  void _clear() {
    _suppressSearch = true;
    _controller.clear();
    _suppressSearch = false;
    _hadSelection = false;
    setState(() {
      _suggestions = const [];
      _error = null;
    });
    widget.onCleared?.call();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: _controller,
          focusNode: _focus,
          enabled: widget.enabled && !_resolving,
          onChanged: _onChanged,
          decoration: InputDecoration(
            labelText: widget.label,
            hintText: 'Search place or address',
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
                    tooltip: 'Clear',
                    onPressed: widget.enabled ? _clear : null,
                    icon: const Icon(Icons.clear),
                  ),
              ],
            ),
          ),
        ),
        if (_error != null && _suggestions.isEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text(
              _error!,
              style: TextStyle(
                color: _error == 'No places found'
                    ? AppTheme.steel
                    : Colors.red.shade700,
                fontSize: 13,
              ),
            ),
          ),
        if (_suggestions.isNotEmpty)
          Material(
            elevation: 2,
            borderRadius: BorderRadius.circular(8),
            child: ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _suggestions.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (context, i) {
                final s = _suggestions[i];
                return ListTile(
                  dense: true,
                  leading: const Icon(Icons.place_outlined),
                  title: Text(s.primaryText),
                  subtitle:
                      s.secondaryText == null ? null : Text(s.secondaryText!),
                  onTap: () => _select(s),
                );
              },
            ),
          ),
      ],
    );
  }
}
