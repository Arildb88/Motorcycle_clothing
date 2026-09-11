import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:motorcycle_clothing/domain/garment.dart';
import 'package:motorcycle_clothing/services/api_client.dart';

class GarmentFormScreen extends StatefulWidget {
  const GarmentFormScreen({super.key, this.existing});

  final Garment? existing;

  @override
  State<GarmentFormScreen> createState() => _GarmentFormScreenState();
}

class _GarmentFormScreenState extends State<GarmentFormScreen> {
  final _name = TextEditingController();
  final _brand = TextEditingController();
  final _model = TextEditingController();
  final _notes = TextEditingController();
  String _category = 'base_layer';
  double _warmth = 3;
  double _wind = 2;
  double _water = 1;
  double _breath = 3;
  bool _busy = false;
  bool _advanced = false;

  bool get _isEdit => widget.existing != null;

  @override
  void initState() {
    super.initState();
    final g = widget.existing;
    if (g != null) {
      _name.text = g.name;
      _brand.text = g.brand ?? '';
      _model.text = g.model ?? '';
      _notes.text = g.notes ?? '';
      _category = g.category;
      _warmth = g.warmthTier.toDouble();
      _wind = g.windResistTier.toDouble();
      _water = g.waterResistTier.toDouble();
      _breath = g.breathabilityTier.toDouble();
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _brand.dispose();
    _model.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_name.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Name is required')),
      );
      return;
    }
    setState(() => _busy = true);
    final api = context.read<ApiClient>();
    final body = <String, dynamic>{
      'name': _name.text.trim(),
      'category': _category,
      'brand': _brand.text.trim().isEmpty ? null : _brand.text.trim(),
      'model': _model.text.trim().isEmpty ? null : _model.text.trim(),
      'notes': _notes.text.trim().isEmpty ? null : _notes.text.trim(),
      'activityTags': ['motorcycle'],
    };
    if (_isEdit || _advanced) {
      body['warmthTier'] = _warmth.round();
      body['windResistTier'] = _wind.round();
      body['waterResistTier'] = _water.round();
      body['breathabilityTier'] = _breath.round();
    }
    try {
      if (_isEdit) {
        await api.patch('/wardrobe/${widget.existing!.id}', body);
      } else {
        await api.post('/wardrobe', body, auth: true);
      }
      if (mounted) Navigator.pop(context, true);
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message)),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_isEdit ? 'Edit garment' : 'Add garment'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(
            _isEdit ? 'Update kit piece' : 'Keep it simple',
            style: GoogleFonts.barlowCondensed(
              fontSize: 22,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _name,
            decoration: const InputDecoration(
              labelText: 'Name',
              hintText: 'e.g. Merino 200 base layer',
            ),
            textCapitalization: TextCapitalization.sentences,
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            // ignore: deprecated_member_use
            value: _category,
            decoration: const InputDecoration(labelText: 'Category'),
            items: garmentCategories
                .map(
                  (c) => DropdownMenuItem(
                    value: c,
                    child: Text(c.replaceAll('_', ' ')),
                  ),
                )
                .toList(),
            onChanged: (v) {
              if (v != null) setState(() => _category = v);
            },
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _brand,
            decoration: const InputDecoration(labelText: 'Brand (optional)'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _model,
            decoration: const InputDecoration(labelText: 'Model (optional)'),
          ),
          const SizedBox(height: 8),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Adjust warmth / weather properties'),
            subtitle: const Text('Defaults come from category if left off'),
            value: _advanced || _isEdit,
            onChanged: (v) => setState(() => _advanced = v),
          ),
          if (_advanced || _isEdit) ...[
            _tier('Warmth', _warmth, (v) => setState(() => _warmth = v)),
            _tier('Wind resistance', _wind, (v) => setState(() => _wind = v)),
            _tier('Waterproofness', _water, (v) => setState(() => _water = v)),
            _tier(
              'Breathability',
              _breath,
              (v) => setState(() => _breath = v),
            ),
          ],
          TextField(
            controller: _notes,
            decoration: const InputDecoration(labelText: 'Notes (optional)'),
            maxLines: 2,
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _busy ? null : _save,
            child: Text(_isEdit ? 'Save changes' : 'Add to wardrobe'),
          ),
        ],
      ),
    );
  }

  Widget _tier(String label, double value, ValueChanged<double> onChanged) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(child: Text(label)),
            Text('${value.round()}/5'),
          ],
        ),
        Slider(
          value: value,
          min: 1,
          max: 5,
          divisions: 4,
          onChanged: onChanged,
        ),
      ],
    );
  }
}
