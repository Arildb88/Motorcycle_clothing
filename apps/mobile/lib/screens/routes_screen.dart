import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:motorcycle_clothing/domain/saved_route.dart';
import 'package:motorcycle_clothing/features/routes/route_editor_screen.dart';
import 'package:motorcycle_clothing/services/api_client.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';

class RoutesScreen extends StatefulWidget {
  const RoutesScreen({super.key});

  @override
  State<RoutesScreen> createState() => _RoutesScreenState();
}

class _RoutesScreenState extends State<RoutesScreen> {
  List<SavedRoute> _routes = [];
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
      final list = await api.getList('/routes?activityType=motorcycle');
      if (mounted) {
        setState(() {
          _routes = list
              .whereType<Map<String, dynamic>>()
              .map(SavedRoute.fromJson)
              .toList();
        });
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openEditor({SavedRoute? existing}) async {
    final saved = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => RouteEditorScreen(existing: existing),
      ),
    );
    if (saved == true) await _load();
  }

  Future<void> _toggleFavorite(SavedRoute r) async {
    final api = context.read<ApiClient>();
    await api.patch('/routes/${r.id}', {'isFavorite': !r.isFavorite});
    await _load();
  }

  Future<void> _delete(SavedRoute r) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete route?'),
        content: Text(
          '“${r.name}” will be removed. Past rides keep their route snapshot.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    final api = context.read<ApiClient>();
    await api.delete('/routes/${r.id}');
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
                    'Saved routes',
                    style: GoogleFonts.barlowCondensed(
                      fontSize: 32,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: () => _openEditor(),
                  tooltip: 'Plan new ride',
                  icon: const Icon(Icons.add),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Text(
              'Reusable templates for motorcycle. Weather and kit are always '
              'recalculated when you launch a ride.',
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
                            child: FilledButton.icon(
                              onPressed: () => _openEditor(),
                              icon: const Icon(Icons.add),
                              label: const Text('Plan new ride'),
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
                                final r = _routes[i];
                                return ListTile(
                                  tileColor:
                                      Colors.white.withValues(alpha: 0.55),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  leading: Icon(
                                    r.isFavorite
                                        ? Icons.star
                                        : Icons.star_border,
                                    color: r.isFavorite
                                        ? AppTheme.amber
                                        : AppTheme.steel,
                                  ),
                                  title: Text(r.name),
                                  subtitle: Text(
                                    '${r.summaryLabel}\n${r.durationLabel}'
                                    '${r.category != null ? ' · ${r.category}' : ''}',
                                  ),
                                  isThreeLine: true,
                                  onTap: () => _openEditor(existing: r),
                                  trailing: PopupMenuButton<String>(
                                    onSelected: (v) async {
                                      if (v == 'favorite') {
                                        await _toggleFavorite(r);
                                      } else if (v == 'delete') {
                                        await _delete(r);
                                      } else if (v == 'edit') {
                                        await _openEditor(existing: r);
                                      }
                                    },
                                    itemBuilder: (_) => [
                                      PopupMenuItem(
                                        value: 'favorite',
                                        child: Text(
                                          r.isFavorite
                                              ? 'Unfavorite'
                                              : 'Favorite',
                                        ),
                                      ),
                                      const PopupMenuItem(
                                        value: 'edit',
                                        child: Text('Edit'),
                                      ),
                                      const PopupMenuItem(
                                        value: 'delete',
                                        child: Text('Delete'),
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
