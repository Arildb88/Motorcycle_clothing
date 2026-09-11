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
  String _category = 'shell_jacket';
  String? _preset;
  String? _material;
  bool _hasVentilation = false;
  bool _isHeated = false;
  bool _thermalLiner = false;
  bool _waterproofLiner = false;
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
      _material = g.material;
      _hasVentilation = g.hasVentilation;
      _isHeated = g.isHeated;
      _warmth = g.warmthTier.toDouble();
      _wind = g.windResistTier.toDouble();
      _water = g.waterResistTier.toDouble();
      _breath = g.breathabilityTier.toDouble();
      _thermalLiner = g.components.any((c) => c.kind == 'thermal_liner');
      _waterproofLiner =
          g.components.any((c) => c.kind == 'waterproof_liner');
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

  void _applyPreset(String? id) {
    setState(() {
      _preset = id;
      if (id == null) return;
      switch (id) {
        case 'textile_jacket':
          _category = 'shell_jacket';
          _material = 'textile';
          _hasVentilation = true;
          _thermalLiner = true;
          _waterproofLiner = true;
          break;
        case 'mesh_jacket':
          _category = 'shell_jacket';
          _material = 'mesh';
          _hasVentilation = true;
          _warmth = 1;
          _wind = 2;
          _water = 1;
          _breath = 5;
          _thermalLiner = false;
          _waterproofLiner = false;
          break;
        case 'leather_jacket':
          _category = 'shell_jacket';
          _material = 'leather';
          _hasVentilation = false;
          _warmth = 3;
          _wind = 5;
          _water = 2;
          break;
        case 'textile_pants':
          _category = 'pants';
          _material = 'textile';
          _hasVentilation = true;
          _thermalLiner = true;
          break;
        case 'motorcycle_jeans':
          _category = 'pants';
          _material = 'denim';
          _hasVentilation = false;
          _thermalLiner = false;
          _waterproofLiner = false;
          break;
        case 'one_piece_suit':
          _category = 'one_piece_suit';
          _material = 'leather';
          break;
        case 'summer_gloves':
          _category = 'gloves';
          _warmth = 1;
          _isHeated = false;
          break;
        case 'winter_gloves':
          _category = 'gloves';
          _warmth = 5;
          _wind = 5;
          _water = 4;
          _isHeated = false;
          break;
        case 'heated_gloves':
          _category = 'gloves';
          _warmth = 5;
          _isHeated = true;
          break;
      }
    });
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
    final components = <Map<String, dynamic>>[];
    if (_thermalLiner) components.add({'kind': 'thermal_liner'});
    if (_waterproofLiner) components.add({'kind': 'waterproof_liner'});

    final body = <String, dynamic>{
      'name': _name.text.trim(),
      'category': _category,
      if (!_isEdit && _preset != null) 'preset': _preset,
      if (_material != null) 'material': _material,
      'hasVentilation': _hasVentilation,
      'isHeated': _isHeated,
      'brand': _brand.text.trim().isEmpty ? null : _brand.text.trim(),
      'model': _model.text.trim().isEmpty ? null : _model.text.trim(),
      'notes': _notes.text.trim().isEmpty ? null : _notes.text.trim(),
      'activityTags': ['motorcycle'],
      'components': components,
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
              hintText: 'e.g. Dainese Carve Master',
            ),
            textCapitalization: TextCapitalization.sentences,
          ),
          if (!_isEdit) ...[
            const SizedBox(height: 12),
            DropdownButtonFormField<String?>(
              // ignore: deprecated_member_use
              value: _preset,
              decoration: const InputDecoration(
                labelText: 'Quick type (optional)',
              ),
              items: [
                const DropdownMenuItem(value: null, child: Text('Custom')),
                ...garmentPresets.map(
                  (p) => DropdownMenuItem(
                    value: p['id'],
                    child: Text(p['label']!),
                  ),
                ),
              ],
              onChanged: _applyPreset,
            ),
          ],
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
          DropdownButtonFormField<String?>(
            // ignore: deprecated_member_use
            value: _material,
            decoration: const InputDecoration(labelText: 'Material'),
            items: [
              const DropdownMenuItem(value: null, child: Text('Unspecified')),
              ...garmentMaterials.map(
                (m) => DropdownMenuItem(value: m, child: Text(m)),
              ),
            ],
            onChanged: (v) => setState(() => _material = v),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Has ventilation'),
            subtitle: const Text('Open/closed is chosen per ride later'),
            value: _hasVentilation,
            onChanged: (v) => setState(() => _hasVentilation = v),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Heated'),
            value: _isHeated,
            onChanged: (v) => setState(() => _isHeated = v),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Thermal liner included'),
            subtitle: const Text('Same jacket — liner installable, not a second item'),
            value: _thermalLiner,
            onChanged: (v) => setState(() => _thermalLiner = v),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Waterproof liner included'),
            value: _waterproofLiner,
            onChanged: (v) => setState(() => _waterproofLiner = v),
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
            title: const Text('More details'),
            subtitle: const Text('Adjust warmth / weather properties'),
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
