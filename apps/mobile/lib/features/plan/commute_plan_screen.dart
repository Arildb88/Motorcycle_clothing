import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:motorcycle_clothing/domain/saved_route.dart';
import 'package:motorcycle_clothing/features/plan/commute_plan.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/l10n/ui_labels.dart';
import 'package:motorcycle_clothing/services/api_client.dart';

class CommutePlanScreen extends StatefulWidget {
  const CommutePlanScreen({super.key, required this.route});

  final SavedRoute route;

  @override
  State<CommutePlanScreen> createState() => _CommutePlanScreenState();
}

class _CommutePlanScreenState extends State<CommutePlanScreen> {
  late final TextEditingController _date;
  late final TextEditingController _outbound;
  late final TextEditingController _returning;
  bool _nextDay = false;
  bool _busy = false;
  String? _error;
  Map<String, dynamic>? _result;

  @override
  void initState() {
    super.initState();
    _date = TextEditingController(text: initialCommuteDate(DateTime.now()));
    _outbound = TextEditingController(
      text: widget.route.outboundDepartureLocal ?? '07:30',
    );
    _returning = TextEditingController(
      text: widget.route.returnDepartureLocal ?? '16:30',
    );
  }

  @override
  void dispose() {
    _date.dispose();
    _outbound.dispose();
    _returning.dispose();
    super.dispose();
  }

  Future<void> _analyze() async {
    final l10n = AppLocalizations.of(context);
    if (!commuteDatePattern.hasMatch(_date.text.trim()) ||
        !commuteClockPattern.hasMatch(_outbound.text.trim()) ||
        !commuteClockPattern.hasMatch(_returning.text.trim())) {
      setState(() => _error = l10n.commuteTimeInvalid);
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final api = context.read<ApiClient>();
      final data = await api.post(
        '/routes/${widget.route.id}/commute-plan',
        commutePlanBody(
          date: _date.text.trim(),
          outboundTime: _outbound.text.trim(),
          returnTime: _returning.text.trim(),
          returnNextDay: _nextDay,
        ),
        auth: true,
      );
      if (mounted) setState(() => _result = data);
    } catch (error) {
      if (mounted) {
        setState(() => _error = localizeUserError(error, l10n));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.commutePlanTitle)),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(widget.route.name, style: const TextStyle(fontSize: 22)),
          const SizedBox(height: 12),
          CommuteScheduleFields(
            date: _date,
            outbound: _outbound,
            returning: _returning,
            nextDay: _nextDay,
            onNextDay: (value) => setState(() => _nextDay = value),
          ),
          const SizedBox(height: 8),
          FilledButton(
            key: const Key('commute-analyze'),
            onPressed: _busy ? null : _analyze,
            child: Text(l10n.commuteAnalyze),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!),
          ],
          if (_result != null) ...[
            const SizedBox(height: 16),
            CommuteResultView(payload: _result!),
          ],
        ],
      ),
    );
  }
}
