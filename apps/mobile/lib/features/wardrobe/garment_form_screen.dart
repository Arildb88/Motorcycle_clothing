import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:motorcycle_clothing/domain/garment.dart';
import 'package:motorcycle_clothing/domain/wardrobe_sharing.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/l10n/ui_labels.dart';
import 'package:motorcycle_clothing/services/api_client.dart';
import 'package:motorcycle_clothing/theme/outline_form_field.dart';

class GarmentFormScreen extends StatefulWidget {
  const GarmentFormScreen({
    super.key,
    this.existing,
    this.activity = 'motorcycle',
  });

  final Garment? existing;
  final String activity;

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
  bool _motorcycleLocked = true;
  final Set<String> _membership = {};

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
      _waterproofLiner = g.components.any((c) => c.kind == 'waterproof_liner');
      _motorcycleLocked = tagsAreMotorcycleOnly(g.activityTags);
      if (!_motorcycleLocked) {
        _membership.addAll(categoriesForActivityTags(g.activityTags));
      }
    } else {
      final category = wardrobeCategoryForActivity(widget.activity);
      _motorcycleLocked = category == null || category == 'motorcycle';
      if (!_motorcycleLocked && category != null) {
        _membership.add(category);
      }
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
    if (!_motorcycleLocked && _membership.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            AppLocalizations.of(context).wardrobeActivityMembership,
          ),
        ),
      );
      return;
    }
    if (_name.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(AppLocalizations.of(context).garmentNameRequired),
        ),
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
      'activityTags': _activityTags(),
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
          SnackBar(
            content: Text(localizeUserError(e, AppLocalizations.of(context))),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(_isEdit ? l10n.garmentEditTitle : l10n.wardrobeAdd),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(
            _isEdit ? l10n.garmentUpdatePiece : l10n.garmentKeepSimple,
            style: GoogleFonts.barlowCondensed(
              fontSize: 22,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            _motorcycleLocked
                ? l10n.garmentMotorcycleLocked
                : l10n.wardrobeActivityMembership,
          ),
          if (!_motorcycleLocked)
            for (final category in shareableWardrobeCategories)
              CheckboxListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(_membershipLabel(l10n, category)),
                value: _membership.contains(category),
                onChanged: (value) {
                  setState(() {
                    if (value ?? false) {
                      _membership.add(category);
                    } else if (_membership.length > 1) {
                      _membership.remove(category);
                    }
                  });
                },
              ),
          const SizedBox(height: 12),
          TextField(
            controller: _name,
            decoration: InputDecoration(
              labelText: l10n.commonName,
              hintText: l10n.garmentNameHint,
            ),
            textCapitalization: TextCapitalization.sentences,
          ),
          if (!_isEdit)
            OutlineFormField(
              child: DropdownButtonFormField<String?>(
                // ignore: deprecated_member_use
                value: _preset,
                decoration: InputDecoration(labelText: l10n.garmentQuickType),
                items: [
                  DropdownMenuItem(value: null, child: Text(l10n.commonCustom)),
                  ...garmentPresets.map(
                    (p) => DropdownMenuItem(
                      value: p['id'],
                      child: Text(garmentPresetLabel(l10n, p['id']!)),
                    ),
                  ),
                ],
                onChanged: _applyPreset,
              ),
            ),
          OutlineFormField(
            child: DropdownButtonFormField<String>(
              // ignore: deprecated_member_use
              value: _category,
              decoration: InputDecoration(labelText: l10n.commonCategory),
              items: garmentCategories
                  .map(
                    (c) => DropdownMenuItem(
                      value: c,
                      child: Text(garmentCategoryLabel(l10n, c)),
                    ),
                  )
                  .toList(),
              onChanged: (v) {
                if (v != null) setState(() => _category = v);
              },
            ),
          ),
          OutlineFormField(
            child: DropdownButtonFormField<String?>(
              // ignore: deprecated_member_use
              value: _material,
              decoration: InputDecoration(labelText: l10n.garmentMaterial),
              items: [
                DropdownMenuItem(
                  value: null,
                  child: Text(l10n.garmentUnspecified),
                ),
                ...garmentMaterials.map(
                  (m) => DropdownMenuItem(
                    value: m,
                    child: Text(garmentMaterialLabel(l10n, m)),
                  ),
                ),
              ],
              onChanged: (v) => setState(() => _material = v),
            ),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(l10n.garmentVentilation),
            subtitle: Text(l10n.garmentVentilationHint),
            value: _hasVentilation,
            onChanged: (v) => setState(() => _hasVentilation = v),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(l10n.garmentHeated),
            value: _isHeated,
            onChanged: (v) => setState(() => _isHeated = v),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(l10n.garmentThermalLiner),
            subtitle: Text(l10n.garmentThermalLinerHint),
            value: _thermalLiner,
            onChanged: (v) => setState(() => _thermalLiner = v),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(l10n.garmentWaterproofLiner),
            value: _waterproofLiner,
            onChanged: (v) => setState(() => _waterproofLiner = v),
          ),
          OutlineFormField(
            child: TextField(
              controller: _brand,
              decoration: InputDecoration(labelText: l10n.garmentBrand),
            ),
          ),
          OutlineFormField(
            child: TextField(
              controller: _model,
              decoration: InputDecoration(labelText: l10n.garmentModel),
            ),
          ),
          const SizedBox(height: 8),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(l10n.garmentMoreDetails),
            subtitle: Text(l10n.garmentMoreDetailsHint),
            value: _advanced || _isEdit,
            onChanged: (v) => setState(() => _advanced = v),
          ),
          if (_advanced || _isEdit) ...[
            _tier(l10n.tierWarmth, _warmth, (v) => setState(() => _warmth = v)),
            _tier(l10n.tierWind, _wind, (v) => setState(() => _wind = v)),
            _tier(l10n.tierWater, _water, (v) => setState(() => _water = v)),
            _tier(l10n.tierBreath, _breath, (v) => setState(() => _breath = v)),
          ],
          OutlineFormField(
            child: TextField(
              controller: _notes,
              decoration: InputDecoration(labelText: l10n.garmentNotes),
              maxLines: 2,
            ),
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _busy ? null : _save,
            child: Text(
              _isEdit ? l10n.garmentSaveChanges : l10n.garmentAddToWardrobe,
            ),
          ),
        ],
      ),
    );
  }

  List<String> _activityTags() {
    if (_motorcycleLocked) return const ['motorcycle'];
    return activityTagsForCategories(_membership);
  }

  String _membershipLabel(AppLocalizations l10n, String category) {
    switch (category) {
      case 'cycling':
        return l10n.activityCycling;
      case 'alpine_snowboard':
        return l10n.activityAlpineAndSnowboard;
      case 'xc_skiing':
        return l10n.activityXcSkiing;
      default:
        return category;
    }
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
