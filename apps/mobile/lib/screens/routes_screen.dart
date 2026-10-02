import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:motorcycle_clothing/ads/ad_placement_policy.dart';
import 'package:motorcycle_clothing/config/app_config.dart';
import 'package:motorcycle_clothing/domain/saved_route.dart';
import 'package:motorcycle_clothing/state/activity_context.dart';
import 'package:motorcycle_clothing/widgets/common.dart';
import 'package:motorcycle_clothing/features/routes/route_editor_screen.dart';
import 'package:motorcycle_clothing/features/plan/ride_planner_screen.dart';
import 'package:motorcycle_clothing/services/api_client.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/l10n/ui_labels.dart';
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

  String _planningActivityType() {
    final activity = context.read<ActivityContext>().currentActivity;
    if (!activity.hasRecommendationEngine) return 'motorcycle';
    return activity.apiValue;
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = context.read<ApiClient>();
      final list =
          await api.getList('/routes?activityType=${_planningActivityType()}');
      if (mounted) {
        setState(() {
          _routes = list
              .whereType<Map<String, dynamic>>()
              .map(SavedRoute.fromJson)
              .toList();
        });
      }
    } on ApiException catch (e) {
      if (mounted) {
        setState(() => _error = localizeUserError(e, AppLocalizations.of(context)));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openEditor({SavedRoute? existing}) async {
    final saved = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => RouteEditorScreen(
          existing: existing,
          activityType: existing?.activityType ?? _planningActivityType(),
        ),
      ),
    );
    if (saved == true) await _load();
  }

  Future<void> _openPlanner({SavedRoute? existing}) async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => RidePlannerScreen(
          initialRoute: existing,
          savedRoutes: _routes,
          activityType: existing?.activityType ?? _planningActivityType(),
        ),
      ),
    );
    await _load();
  }

  Future<void> _toggleFavorite(SavedRoute r) async {
    final api = context.read<ApiClient>();
    await api.patch('/routes/${r.id}', {'isFavorite': !r.isFavorite});
    await _load();
  }

  Future<void> _delete(SavedRoute r) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) {
        final l10n = AppLocalizations.of(ctx);
        return AlertDialog(
          title: Text(l10n.routesDeleteTitle),
          content: Text(l10n.routesDeleteBody(r.name)),
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
    await api.delete('/routes/${r.id}');
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
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
                    l10n.routesTitle,
                    style: GoogleFonts.barlowCondensed(
                      fontSize: 32,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: () => _openPlanner(),
                  tooltip: l10n.plannerTitle,
                  icon: const Icon(Icons.add),
                ),
                IconButton(
                  onPressed: () => _openEditor(),
                  tooltip: l10n.routesEditTemplate,
                  icon: const Icon(Icons.edit_road),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Text(
              l10n.routesSubtitle,
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
                              onPressed: () => _openPlanner(),
                              icon: const Icon(Icons.add),
                              label: Text(l10n.plannerTitle),
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
                                    '${routeSummary(l10n, r)}\n${routeDuration(l10n, r.typicalDurationMin)}'
                                    '${r.category != null ? ' · ${routeCategoryLabel(l10n, r.category)}' : ''}',
                                  ),
                                  isThreeLine: true,
                                  onTap: () => _openPlanner(existing: r),
                                  trailing: PopupMenuButton<String>(
                                    onSelected: (v) async {
                                      if (v == 'favorite') {
                                        await _toggleFavorite(r);
                                      } else if (v == 'delete') {
                                        await _delete(r);
                                      } else if (v == 'edit') {
                                        await _openEditor(existing: r);
                                      } else if (v == 'plan') {
                                        await _openPlanner(existing: r);
                                      }
                                    },
                                    itemBuilder: (_) => [
                                      PopupMenuItem(
                                        value: 'plan',
                                        child: Text(l10n.plannerTitle),
                                      ),
                                      PopupMenuItem(
                                        value: 'favorite',
                                        child: Text(
                                          r.isFavorite
                                              ? l10n.commonUnfavorite
                                              : l10n.commonFavorite,
                                        ),
                                      ),
                                      PopupMenuItem(
                                        value: 'edit',
                                        child: Text(l10n.commonEdit),
                                      ),
                                      PopupMenuItem(
                                        value: 'delete',
                                        child: Text(l10n.commonDelete),
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),
                          ),
          ),
          if (_showRoutesAd)
            const AdBannerSlot(
              surface: AdSurface.savedRoutesList,
              contentState: AdContentState.ready,
              position: AdPlacementPosition.reservedFooter,
            ),
        ],
      ),
    );
  }

  bool get _showRoutesAd => evaluateAdPlacement(
        AdPlacementRequest(
          adsEnabled: AppConfig.adsEnabled,
          surface: AdSurface.savedRoutesList,
          format: AdFormat.banner,
          contentState: _routesAdState,
          position: AdPlacementPosition.reservedFooter,
        ),
      ).show;

  AdContentState get _routesAdState {
    if (_loading) return AdContentState.loading;
    if (_error != null) return AdContentState.error;
    if (_routes.isEmpty) return AdContentState.empty;
    return AdContentState.ready;
  }
}
