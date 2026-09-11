import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:motorcycle_clothing/domain/saved_route.dart';
import 'package:motorcycle_clothing/services/api_client.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';

/// Create / edit a saved motorcycle route (ordered waypoints).
/// Map search / tap-to-place is deferred — coords via form for MVP foundation.
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
  final List<_WpDraft> _waypoints = [];

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    if (e != null) {
      _name.text = e.name;
      _description.text = e.description ?? '';
      _category = e.category;
      _favorite = e.isFavorite;
      for (final w in e.waypoints) {
        _waypoints.add(
          _WpDraft(
            label: TextEditingController(text: w.label ?? ''),
            lat: TextEditingController(text: w.lat.toString()),
            lon: TextEditingController(text: w.lon.toString()),
          ),
        );
      }
    }
    if (_waypoints.isEmpty) {
      _waypoints.addAll([
        _WpDraft(
          label: TextEditingController(text: 'Start'),
          lat: TextEditingController(text: '58.1467'),
          lon: TextEditingController(text: '7.9956'),
        ),
        _WpDraft(
          label: TextEditingController(text: 'Destination'),
          lat: TextEditingController(text: '58.1599'),
          lon: TextEditingController(text: '8.0180'),
        ),
      ]);
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _description.dispose();
    for (final w in _waypoints) {
      w.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final waypoints = <Map<String, dynamic>>[];
      for (final w in _waypoints) {
        final lat = double.tryParse(w.lat.text.trim());
        final lon = double.tryParse(w.lon.text.trim());
        if (lat == null || lon == null) {
          throw ApiException('Each stop needs valid latitude and longitude');
        }
        waypoints.add({
          'lat': lat,
          'lon': lon,
          if (w.label.text.trim().isNotEmpty) 'label': w.label.text.trim(),
        });
      }
      if (waypoints.length < 2) {
        throw ApiException('Add at least a start and destination');
      }
      final body = {
        'name': _name.text.trim(),
        if (_description.text.trim().isNotEmpty)
          'description': _description.text.trim(),
        if (_category != null) 'category': _category,
        'isFavorite': _favorite,
        'activityType': 'motorcycle',
        'waypoints': waypoints,
        'typicalDurationMin': 35,
      };
      final api = context.read<ApiClient>();
      if (widget.existing == null) {
        await api.post('/routes', body, auth: true);
      } else {
        await api.patch('/routes/${widget.existing!.id}', body);
      }
      if (mounted) Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _addStop() {
    setState(() {
      _waypoints.add(
        _WpDraft(
          label: TextEditingController(text: 'Stop ${_waypoints.length}'),
          lat: TextEditingController(text: '58.15'),
          lon: TextEditingController(text: '8.00'),
        ),
      );
    });
  }

  void _removeStop(int i) {
    if (_waypoints.length <= 2) return;
    setState(() {
      _waypoints[i].dispose();
      _waypoints.removeAt(i);
    });
  }

  void _move(int i, int delta) {
    final j = i + delta;
    if (j < 0 || j >= _waypoints.length) return;
    setState(() {
      final item = _waypoints.removeAt(i);
      _waypoints.insert(j, item);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.existing == null ? 'New route' : 'Edit route'),
        actions: [
          TextButton(
            onPressed: _saving ? null : _save,
            child: _saving
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Save'),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          TextField(
            controller: _name,
            decoration: const InputDecoration(
              labelText: 'Name',
              hintText: 'Work 1, Sunday Loop…',
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _description,
            decoration: const InputDecoration(
              labelText: 'Description (optional)',
            ),
            maxLines: 2,
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String?>(
            // ignore: deprecated_member_use
            value: _category,
            decoration: const InputDecoration(labelText: 'Category'),
            items: const [
              DropdownMenuItem(value: null, child: Text('None')),
              DropdownMenuItem(value: 'work', child: Text('Work')),
              DropdownMenuItem(value: 'commute', child: Text('Commute')),
              DropdownMenuItem(value: 'home', child: Text('Home')),
              DropdownMenuItem(value: 'weekend', child: Text('Weekend')),
              DropdownMenuItem(value: 'touring', child: Text('Touring')),
              DropdownMenuItem(value: 'favourite', child: Text('Favourite')),
              DropdownMenuItem(value: 'custom', child: Text('Custom')),
            ],
            onChanged: (v) => setState(() => _category = v),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Favorite'),
            subtitle: const Text('Shows first on Motorcycle home'),
            value: _favorite,
            onChanged: (v) => setState(() => _favorite = v),
          ),
          const SizedBox(height: 8),
          Text(
            'Stops (ordered)',
            style: GoogleFonts.barlowCondensed(
              fontSize: 22,
              fontWeight: FontWeight.w600,
            ),
          ),
          Text(
            'Coordinates are saved so the route does not need re-geocoding. '
            'Map search arrives with the routing provider milestone.',
            style: TextStyle(
              color: AppTheme.steel.withValues(alpha: 0.9),
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 8),
          ...List.generate(_waypoints.length, (i) {
            final w = _waypoints[i];
            return Card(
              margin: const EdgeInsets.only(bottom: 10),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Text(
                          i == 0
                              ? 'Start'
                              : i == _waypoints.length - 1
                                  ? 'End'
                                  : 'Stop $i',
                          style: GoogleFonts.barlowCondensed(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const Spacer(),
                        IconButton(
                          onPressed: () => _move(i, -1),
                          icon: const Icon(Icons.arrow_upward),
                        ),
                        IconButton(
                          onPressed: () => _move(i, 1),
                          icon: const Icon(Icons.arrow_downward),
                        ),
                        if (_waypoints.length > 2)
                          IconButton(
                            onPressed: () => _removeStop(i),
                            icon: const Icon(Icons.delete_outline),
                          ),
                      ],
                    ),
                    TextField(
                      controller: w.label,
                      decoration: const InputDecoration(labelText: 'Label'),
                    ),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: w.lat,
                            keyboardType: const TextInputType.numberWithOptions(
                              decimal: true,
                              signed: true,
                            ),
                            decoration: const InputDecoration(
                              labelText: 'Latitude',
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextField(
                            controller: w.lon,
                            keyboardType: const TextInputType.numberWithOptions(
                              decimal: true,
                              signed: true,
                            ),
                            decoration: const InputDecoration(
                              labelText: 'Longitude',
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          }),
          OutlinedButton.icon(
            onPressed: _addStop,
            icon: const Icon(Icons.add),
            label: const Text('Add stop'),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: Colors.red)),
          ],
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _saving ? null : _save,
            child: const Text('Save route'),
          ),
        ],
      ),
    );
  }
}

class _WpDraft {
  _WpDraft({
    required this.label,
    required this.lat,
    required this.lon,
  });

  final TextEditingController label;
  final TextEditingController lat;
  final TextEditingController lon;

  void dispose() {
    label.dispose();
    lat.dispose();
    lon.dispose();
  }
}
