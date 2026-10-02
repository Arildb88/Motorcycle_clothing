import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:motorcycle_clothing/ads/ad_placement_policy.dart';
import 'package:motorcycle_clothing/config/app_config.dart';
import 'package:motorcycle_clothing/domain/activity.dart';
import 'package:motorcycle_clothing/domain/garment.dart';
import 'package:motorcycle_clothing/domain/wardrobe_sharing.dart';
import 'package:motorcycle_clothing/widgets/common.dart';
import 'package:motorcycle_clothing/features/wardrobe/garment_form_screen.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/l10n/ui_labels.dart';
import 'package:motorcycle_clothing/services/api_client.dart';
import 'package:motorcycle_clothing/state/activity_context.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';

class WardrobeScreen extends StatefulWidget {
  const WardrobeScreen({super.key});

  @override
  State<WardrobeScreen> createState() => _WardrobeScreenState();
}

class _WardrobeScreenState extends State<WardrobeScreen> {
  List<Garment> _items = [];
  Set<String> _shared = {};
  bool _loading = true;
  String? _error;
  String? _loadedFor;

  @override
  void initState() {
    super.initState();
    _load();
  }

  AppActivity get _activity => context.read<ActivityContext>().currentActivity;

  Future<void> _load() async {
    final activity = _activity.apiValue;
    setState(() {
      _loading = true;
      _error = null;
      _loadedFor = activity;
    });
    try {
      final api = context.read<ApiClient>();
      final list = await api.getList('/wardrobe?activity=$activity');
      final sharing = await api.get('/wardrobe/sharing');
      if (!mounted) return;
      setState(() {
        _items = list
            .map((e) => Garment.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList();
        _shared = {
          for (final category in (sharing['sharedCategories'] as List? ?? const []))
            category.toString(),
        };
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
    final activity = _activity.apiValue;
    final code =
        Localizations.localeOf(context).languageCode == 'nb' ? 'nb' : 'en';
    await api.post(
      '/wardrobe/actions/seed-demo?lang=$code&activity=$activity',
      {},
      auth: true,
    );
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
    final activity = _activity.apiValue;
    await api.delete('/wardrobe/actions/demo?activity=$activity');
    await _load();
  }

  Future<void> _toggleShared(String category, bool selected) async {
    final next = {..._shared};
    if (selected) {
      next.add(category);
    } else {
      next.remove(category);
    }
    final ordered = [
      for (final item in shareableWardrobeCategories)
        if (next.contains(item)) item,
    ];
    setState(() => _shared = next);
    try {
      final api = context.read<ApiClient>();
      await api.patch('/wardrobe/sharing', {'sharedCategories': ordered});
      if (mounted) await _load();
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(localizeUserError(e, AppLocalizations.of(context)))),
      );
      await _load();
    }
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
        builder: (_) => GarmentFormScreen(
          existing: existing,
          activity: _activity.apiValue,
        ),
      ),
    );
    if (changed == true) await _load();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final activity = context.watch<ActivityContext>().currentActivity;
    if (_loadedFor != null && _loadedFor != activity.apiValue && !_loading) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && _loadedFor != activity.apiValue) _load();
      });
    }
    final hiking = activity == AppActivity.hiking;
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
                if (!hiking)
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
                    : RefreshIndicator(
                        onRefresh: _load,
                        child: ListView(
                          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                          children: [
                            if (hiking)
                              Text(l10n.wardrobeHikingUnavailable)
                            else ...[
                              _SharingPanel(
                                shared: _shared,
                                onChanged: _toggleShared,
                              ),
                              const SizedBox(height: 12),
                              if (_items.isEmpty)
                                _EmptyWardrobe(
                                  onAdd: () => _openForm(),
                                  onSeed: _seedDemo,
                                )
                              else
                                ...[
                                  for (var i = 0; i < _items.length; i++) ...[
                                    if (i > 0) const SizedBox(height: 8),
                                    _GarmentTile(
                                      garment: _items[i],
                                      onOpen: () => _openForm(existing: _items[i]),
                                      onDelete: () => _delete(_items[i]),
                                    ),
                                  ],
                                  const SizedBox(height: 12),
                                  if (!_items.any((g) => g.isDemo))
                                    OutlinedButton(
                                      onPressed: _seedDemo,
                                      child: Text(l10n.wardrobeLoadDemo),
                                    ),
                                  if (_items.any((g) => g.isDemo))
                                    OutlinedButton(
                                      onPressed: _deleteDemo,
                                      child: Text(l10n.wardrobeDeleteDemo),
                                    ),
                                ],
                            ],
                          ],
                        ),
                      ),
          ),
          if (_showWardrobeAd)
            const AdBannerSlot(
              surface: AdSurface.wardrobeList,
              contentState: AdContentState.ready,
              position: AdPlacementPosition.reservedFooter,
            ),
        ],
      ),
    );
  }

  bool get _showWardrobeAd => evaluateAdPlacement(
        AdPlacementRequest(
          adsEnabled: AppConfig.adsEnabled,
          surface: AdSurface.wardrobeList,
          format: AdFormat.banner,
          contentState: _wardrobeAdState,
          position: AdPlacementPosition.reservedFooter,
        ),
      ).show;

  AdContentState get _wardrobeAdState {
    if (_loading) return AdContentState.loading;
    if (_error != null) return AdContentState.error;
    if (_items.isEmpty) return AdContentState.empty;
    return AdContentState.ready;
  }
}

class _SharingPanel extends StatelessWidget {
  const _SharingPanel({required this.shared, required this.onChanged});

  final Set<String> shared;
  final void Function(String category, bool selected) onChanged;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final labels = {
      'cycling': l10n.activityCycling,
      'alpine_snowboard': l10n.activityAlpineAndSnowboard,
      'xc_skiing': l10n.activityXcSkiing,
    };
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          l10n.wardrobeSharingTitle,
          style: GoogleFonts.barlowCondensed(
            fontSize: 22,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 4),
        Text(l10n.wardrobeSharingBody),
        const SizedBox(height: 4),
        Text(l10n.wardrobeMotorcycleIsolated),
        for (final category in shareableWardrobeCategories)
          CheckboxListTile(
            contentPadding: EdgeInsets.zero,
            dense: true,
            title: Text(labels[category]!),
            value: shared.contains(category),
            onChanged: (value) => onChanged(category, value ?? false),
          ),
      ],
    );
  }
}

class _GarmentTile extends StatelessWidget {
  const _GarmentTile({
    required this.garment,
    required this.onOpen,
    required this.onDelete,
  });

  final Garment garment;
  final VoidCallback onOpen;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Material(
      color: Colors.white.withValues(alpha: 0.55),
      borderRadius: BorderRadius.circular(12),
      child: ListTile(
        onTap: onOpen,
        title: Row(
          children: [
            Flexible(
              child: Text(
                garment.name,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            if (garment.isDemo) ...[
              const SizedBox(width: 8),
              _DemoBadge(label: l10n.wardrobeDemoBadge),
            ],
          ],
        ),
        subtitle: Text(garmentSubtitle(l10n, garment)),
        trailing: IconButton(
          tooltip: l10n.commonDelete,
          icon: const Icon(Icons.delete_outline),
          onPressed: onDelete,
        ),
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
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 24),
      child: Column(
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
    );
  }
}
