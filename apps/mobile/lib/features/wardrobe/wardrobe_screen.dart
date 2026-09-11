import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:motorcycle_clothing/domain/garment.dart';
import 'package:motorcycle_clothing/features/wardrobe/garment_form_screen.dart';
import 'package:motorcycle_clothing/services/api_client.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';

class WardrobeScreen extends StatefulWidget {
  const WardrobeScreen({super.key});

  @override
  State<WardrobeScreen> createState() => _WardrobeScreenState();
}

class _WardrobeScreenState extends State<WardrobeScreen> {
  List<Garment> _items = [];
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
      final list = await api.getList('/wardrobe');
      if (!mounted) return;
      setState(() {
        _items = list
            .map((e) => Garment.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList();
      });
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _seedDemo() async {
    final api = context.read<ApiClient>();
    await api.post('/wardrobe/actions/seed-demo', {}, auth: true);
    await _load();
  }

  Future<void> _delete(Garment g) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete garment?'),
        content: Text('Remove “${g.name}” from your wardrobe.'),
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
    await api.delete('/wardrobe/${g.id}');
    await _load();
  }

  Future<void> _openForm({Garment? existing}) async {
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => GarmentFormScreen(existing: existing),
      ),
    );
    if (changed == true) await _load();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 24, 16, 8),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    'Wardrobe',
                    style: GoogleFonts.barlowCondensed(
                      fontSize: 32,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                IconButton(
                  tooltip: 'Add garment',
                  onPressed: () => _openForm(),
                  icon: const Icon(Icons.add),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Text(
              'Add what you actually own. Category sets sensible defaults — refine later.',
              style: TextStyle(color: AppTheme.steel.withValues(alpha: 0.9)),
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? Center(child: Text(_error!))
                    : _items.isEmpty
                        ? _EmptyWardrobe(
                            onAdd: () => _openForm(),
                            onSeed: _seedDemo,
                          )
                        : RefreshIndicator(
                            onRefresh: _load,
                            child: ListView.separated(
                              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                              itemCount: _items.length,
                              separatorBuilder: (_, _) =>
                                  const SizedBox(height: 8),
                              itemBuilder: (context, i) {
                                final g = _items[i];
                                return Material(
                                  color: Colors.white.withValues(alpha: 0.55),
                                  borderRadius: BorderRadius.circular(12),
                                  child: ListTile(
                                    onTap: () => _openForm(existing: g),
                                    title: Text(g.name),
                                    subtitle: Text(g.subtitleBits),
                                    trailing: IconButton(
                                      icon: const Icon(Icons.delete_outline),
                                      onPressed: () => _delete(g),
                                    ),
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

class _EmptyWardrobe extends StatelessWidget {
  const _EmptyWardrobe({required this.onAdd, required this.onSeed});

  final VoidCallback onAdd;
  final VoidCallback onSeed;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'No garments yet',
              style: GoogleFonts.barlowCondensed(
                fontSize: 24,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Add a few pieces you ride in, or load a demo kit for testing.',
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            FilledButton(onPressed: onAdd, child: const Text('Add garment')),
            const SizedBox(height: 8),
            TextButton(
              onPressed: onSeed,
              child: const Text('Load demo motorcycle wardrobe'),
            ),
          ],
        ),
      ),
    );
  }
}
