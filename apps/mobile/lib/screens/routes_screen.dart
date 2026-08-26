import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:motorcycle_clothing/services/api_client.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';

class RoutesScreen extends StatefulWidget {
  const RoutesScreen({super.key});

  @override
  State<RoutesScreen> createState() => _RoutesScreenState();
}

class _RoutesScreenState extends State<RoutesScreen> {
  List<dynamic> _routes = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = context.read<ApiClient>();
      final list = await api.getList('/routes');
      if (mounted) setState(() => _routes = list);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _addDemoCommute() async {
    final api = context.read<ApiClient>();
    await api.post('/routes', {
      'name': 'Normal commute',
      'isDefaultCommute': true,
      'startLat': 59.9139,
      'startLon': 10.7522,
      'startLabel': 'Oslo center',
      'endLat': 59.9494,
      'endLon': 10.7686,
      'endLabel': 'Nydalen',
      'typicalDurationMin': 25,
    }, auth: true);
    await _load();
  }

  Future<void> _setDefault(String id) async {
    final api = context.read<ApiClient>();
    await api.patch('/routes/$id', {'isDefaultCommute': true});
    await _load();
  }

  Future<void> _delete(String id) async {
    final api = context.read<ApiClient>();
    await api.delete('/routes/$id');
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 24, 24, 8),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    'Routes',
                    style: GoogleFonts.barlowCondensed(
                      fontSize: 32,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: _addDemoCommute,
                  tooltip: 'Add Oslo commute sample',
                  icon: const Icon(Icons.add),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Text(
              'Mark one as your normal commute — it becomes the default on Today.',
              style: TextStyle(color: AppTheme.steel.withValues(alpha: 0.9)),
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? Center(child: Text(_error!))
                    : _routes.isEmpty
                        ? Center(
                            child: FilledButton(
                              onPressed: _addDemoCommute,
                              child: const Text('Add normal commute'),
                            ),
                          )
                        : RefreshIndicator(
                            onRefresh: _load,
                            child: ListView.separated(
                              padding: const EdgeInsets.all(16),
                              itemCount: _routes.length,
                              separatorBuilder: (_, _) =>
                                  const SizedBox(height: 8),
                              itemBuilder: (context, i) {
                                final r = _routes[i] as Map<String, dynamic>;
                                final isDefault = r['isDefaultCommute'] == true;
                                return ListTile(
                                  tileColor: Colors.white.withValues(alpha: 0.55),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  title: Text(r['name']?.toString() ?? 'Route'),
                                  subtitle: Text(
                                    '${r['startLabel'] ?? ''} → ${r['endLabel'] ?? ''}'
                                        .trim(),
                                  ),
                                  trailing: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      if (isDefault)
                                        Text(
                                          'COMMUTE',
                                          style: GoogleFonts.barlowCondensed(
                                            fontWeight: FontWeight.w700,
                                            color: AppTheme.amber,
                                          ),
                                        )
                                      else
                                        TextButton(
                                          onPressed: () =>
                                              _setDefault(r['id'] as String),
                                          child: const Text('Set default'),
                                        ),
                                      IconButton(
                                        onPressed: () =>
                                            _delete(r['id'] as String),
                                        icon: const Icon(Icons.delete_outline),
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }
}
