import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:motorcycle_clothing/domain/garment.dart';
import 'package:motorcycle_clothing/features/wardrobe/garment_form_screen.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/l10n/ui_labels.dart';
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
      if (mounted) {
        setState(() => _error = localizeUserError(e, AppLocalizations.of(context)));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _seedDemo() async {
    final api = context.read<ApiClient>();
    final code =
        Localizations.localeOf(context).languageCode == 'nb' ? 'nb' : 'en';
    await api.post('/wardrobe/actions/seed-demo?lang=$code', {}, auth: true);
    await _load();
  }

  Future<void> _deleteDemo() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) {
        final l10n = AppLocalizations.of(ctx);
        return AlertDialog(
          title: Text(l10n.wardrobeDeleteDemoTitle),
          content: Text(l10n.wardrobeDeleteDemoBody),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: Text(l10n.commonCancel),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: Text(l10n.wardrobeDeleteDemo),
            ),
          ],
        );
      },
    );
    if (ok != true || !mounted) return;
    final api = context.read<ApiClient>();
    await api.delete('/wardrobe/actions/demo');
    await _load();
  }

  Future<void> _delete(Garment g) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) {
        final l10n = AppLocalizations.of(ctx);
        return AlertDialog(
          title: Text(l10n.wardrobeDeleteTitle),
          content: Text(l10n.wardrobeDeleteBody(g.name)),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: Text(l10n.commonCancel),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: Text(l10n.commonDelete),
            ),
          ],
        );
      },
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
    final l10n = AppLocalizations.of(context);
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
                    l10n.navWardrobe,
                    style: GoogleFonts.barlowCondensed(
                      fontSize: 32,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                IconButton(
                  tooltip: l10n.wardrobeAdd,
                  onPressed: () => _openForm(),
                  icon: const Icon(Icons.add),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Text(
              l10n.wardrobeIntro,
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
                                    title: Row(
                                      children: [
                                        Flexible(
                                          child: Text(
                                            g.name,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        if (g.isDemo) ...[
                                          const SizedBox(width: 8),
                                          _DemoBadge(
                                            label: l10n.wardrobeDemoBadge,
                                          ),
                                        ],
                                      ],
                                    ),
                                    subtitle: Text(garmentSubtitle(l10n, g)),
                                    trailing: IconButton(
                                      tooltip: l10n.commonDelete,
                                      icon: const Icon(Icons.delete_outline),
                                      onPressed: () => _delete(g),
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),
          ),
          if (!_loading && _error == null && _items.any((g) => g.isDemo))
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: OutlinedButton(
                onPressed: _deleteDemo,
                child: Text(l10n.wardrobeDeleteDemo),
              ),
            ),
        ],
      ),
    );
  }
}

class _DemoBadge extends StatelessWidget {
  const _DemoBadge({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: AppTheme.steel.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: const TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.6,
          color: AppTheme.steel,
        ),
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
    final l10n = AppLocalizations.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              l10n.wardrobeEmptyTitle,
              style: GoogleFonts.barlowCondensed(
                fontSize: 24,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              l10n.wardrobeEmptyBody,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            FilledButton(onPressed: onAdd, child: Text(l10n.wardrobeAdd)),
            const SizedBox(height: 8),
            TextButton(
              onPressed: onSeed,
              child: Text(l10n.wardrobeLoadDemo),
            ),
          ],
        ),
      ),
    );
  }
}
