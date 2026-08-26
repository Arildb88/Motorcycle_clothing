import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:motorcycle_clothing/services/api_client.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';
import 'package:motorcycle_clothing/widgets/common.dart';
import 'package:motorcycle_clothing/screens/feedback_sheet.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  Map<String, dynamic>? _data;
  String? _error;
  bool _loading = true;

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
      final data = await api.get('/recommend');
      if (mounted) setState(() => _data = data);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (e) {
      if (mounted) {
        setState(() => _error = 'Could not load recommendation');
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _load,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 56, 24, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const BrandMark(compact: true),
                  const SizedBox(height: 6),
                  Text(
                    'Today’s ride kit',
                    style: GoogleFonts.sourceSerif4(
                      fontSize: 22,
                      color: AppTheme.steel,
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (_loading)
            const SliverFillRemaining(
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_error != null)
            SliverFillRemaining(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      _error!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 16),
                    ),
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: _load,
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            )
          else
            SliverToBoxAdapter(child: _RecommendationBody(data: _data!)),
        ],
      ),
    );
  }
}

class _RecommendationBody extends StatelessWidget {
  const _RecommendationBody({required this.data});

  final Map<String, dynamic> data;

  @override
  Widget build(BuildContext context) {
    final route = data['route'] as Map<String, dynamic>;
    final weather = data['weather'] as Map<String, dynamic>;
    final rec = data['recommendation'] as Map<String, dynamic>;
    final items = (rec['items'] as List).cast<String>();
    final reasons = (rec['reasons'] as List).cast<String>();

    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            route['name']?.toString() ?? 'Commute',
            style: GoogleFonts.barlowCondensed(
              fontSize: 34,
              fontWeight: FontWeight.w600,
              color: AppTheme.asphalt,
            ),
          ),
          Text(
            '${route['startLabel'] ?? 'Start'} → ${route['endLabel'] ?? 'End'}',
            style: TextStyle(color: AppTheme.steel.withValues(alpha: 0.9)),
          ),
          const SizedBox(height: 20),
          Wrap(
            spacing: 16,
            runSpacing: 8,
            children: [
              _Metric(
                label: 'Temp',
                value:
                    '${(weather['minTempC'] as num).toStringAsFixed(0)}–${(weather['maxTempC'] as num).toStringAsFixed(0)}°C',
              ),
              _Metric(
                label: 'Feels',
                value: '${rec['effectiveTempC']}°C',
              ),
              _Metric(
                label: 'Rain',
                value: '${(weather['maxRainProbPct'] as num).toStringAsFixed(0)}%',
              ),
              _Metric(
                label: 'Wind',
                value: '${(weather['maxWindMs'] as num).toStringAsFixed(0)} m/s',
              ),
            ],
          ),
          const SizedBox(height: 28),
          Text(
            'Wear',
            style: GoogleFonts.barlowCondensed(
              fontSize: 22,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          ...items.map(
            (item) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  const Icon(Icons.check_circle_outline, size: 20),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(item, style: const TextStyle(fontSize: 17)),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          ...reasons.map(
            (r) => Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Text(
                r,
                style: TextStyle(
                  color: AppTheme.steel.withValues(alpha: 0.85),
                  fontSize: 13,
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),
          FilledButton.tonal(
            onPressed: () => showFeedbackSheet(context, data),
            child: const Text('How was the ride?'),
          ),
          const SizedBox(height: 24),
          const AdBannerSlot(),
        ],
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: GoogleFonts.barlowCondensed(
            fontSize: 12,
            letterSpacing: 1.1,
            color: AppTheme.steel,
          ),
        ),
        Text(
          value,
          style: GoogleFonts.barlowCondensed(
            fontSize: 26,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}
