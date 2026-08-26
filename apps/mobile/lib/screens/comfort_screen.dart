import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:motorcycle_clothing/services/api_client.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';

class ComfortScreen extends StatefulWidget {
  const ComfortScreen({super.key});

  @override
  State<ComfortScreen> createState() => _ComfortScreenState();
}

class _ComfortScreenState extends State<ComfortScreen> {
  Map<String, dynamic>? _settings;
  bool _loading = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final api = context.read<ApiClient>();
    final settings = await api.get('/comfort');
    if (mounted) {
      setState(() {
        _settings = settings;
        _loading = false;
      });
    }
  }

  Future<void> _save() async {
    if (_settings == null) return;
    setState(() => _saving = true);
    try {
      final api = context.read<ApiClient>();
      final updated = await api.patch('/comfort', {
        'glovesBelowC': _settings!['glovesBelowC'],
        'extraJacketLayerBelowC': _settings!['extraJacketLayerBelowC'],
        'extraPantsLayerBelowC': _settings!['extraPantsLayerBelowC'],
        'woolBaseBelowC': _settings!['woolBaseBelowC'],
        'rainProbThreshold': _settings!['rainProbThreshold'],
        'windChillSensitivity': _settings!['windChillSensitivity'],
      });
      if (mounted) {
        setState(() => _settings = updated);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Comfort zone saved')),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading || _settings == null) {
      return const Center(child: CircularProgressIndicator());
    }

    final s = _settings!;
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
        children: [
          Text(
            'Comfort zone',
            style: GoogleFonts.barlowCondensed(
              fontSize: 32,
              fontWeight: FontWeight.w600,
            ),
          ),
          Text(
            'When should we suggest gloves, layers, and wool? '
            'Ride feedback will nudge your personal bias '
            '(now ${ (s['personalColdBiasC'] as num).toStringAsFixed(1)}°C).',
            style: TextStyle(color: AppTheme.steel.withValues(alpha: 0.9)),
          ),
          const SizedBox(height: 20),
          _slider(
            label: 'Winter gloves below',
            keyName: 'glovesBelowC',
            min: -5,
            max: 20,
            unit: '°C',
          ),
          _slider(
            label: 'Extra jacket layer below',
            keyName: 'extraJacketLayerBelowC',
            min: -5,
            max: 20,
            unit: '°C',
          ),
          _slider(
            label: 'Extra pants layer below',
            keyName: 'extraPantsLayerBelowC',
            min: -5,
            max: 20,
            unit: '°C',
          ),
          _slider(
            label: 'Wool / thermal base below',
            keyName: 'woolBaseBelowC',
            min: -10,
            max: 15,
            unit: '°C',
          ),
          _slider(
            label: 'Rain gear from probability',
            keyName: 'rainProbThreshold',
            min: 10,
            max: 90,
            unit: '%',
          ),
          const SizedBox(height: 8),
          Text('Wind sensitivity', style: GoogleFonts.barlowCondensed(fontSize: 18)),
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'low', label: Text('Low')),
              ButtonSegment(value: 'medium', label: Text('Med')),
              ButtonSegment(value: 'high', label: Text('High')),
            ],
            selected: {s['windChillSensitivity'] as String},
            onSelectionChanged: (v) {
              setState(() => s['windChillSensitivity'] = v.first);
            },
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _saving ? null : _save,
            child: Text(_saving ? 'Saving…' : 'Save comfort zone'),
          ),
        ],
      ),
    );
  }

  Widget _slider({
    required String label,
    required String keyName,
    required double min,
    required double max,
    required String unit,
  }) {
    final value = (_settings![keyName] as num).toDouble();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(child: Text(label)),
            Text('${value.toStringAsFixed(0)}$unit'),
          ],
        ),
        Slider(
          value: value.clamp(min, max),
          min: min,
          max: max,
          divisions: (max - min).round(),
          onChanged: (v) => setState(() => _settings![keyName] = v),
        ),
      ],
    );
  }
}
