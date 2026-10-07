import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:motorcycle_clothing/domain/garment.dart';
import 'package:motorcycle_clothing/domain/garment_catalogue_form.dart';
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
  bool _warmthTouched = false;
  bool _windTouched = false;
  bool _waterTouched = false;
  bool _breathTouched = false;
  String _warmthSource = 'fallback';
  String _windSource = 'fallback';
  String _waterSource = 'fallback';
  int _warmthSamples = 0;
  int _windSamples = 0;
  int _waterSamples = 0;
  bool _writeYourself = false;
  String? _selectedBrand;
  String? _selectedModel;
  List<String> _brands = const [];
  List<CatalogueChoice> _modelChoices = const [];
  bool _busy = false;
  bool _advanced = false;
  bool _motorcycleLocked = true;
  String? _warmthBand;
  final Set<String> _membership = {};

  bool get _isEdit => widget.existing != null;
  bool get _cyclingChoices => widget.activity == 'cycling';

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
      _preset = g.preset;
      _material = g.material;
      _hasVentilation = g.hasVentilation;
      _isHeated = g.isHeated;
      _warmth = g.warmthTier.toDouble();
      _wind = g.windResistTier.toDouble();
      _water = g.waterResistTier.toDouble();
      _breath = g.breathabilityTier.toDouble();
      _thermalLiner = g.components.any((c) => c.kind == 'thermal_liner');
      _waterproofLiner = g.components.any((c) => c.kind == 'waterproof_liner');
      final cycling = cyclingGarmentChoice(g.preset);
      if (cycling != null && cycling.warmthBands) {
        _warmthBand = switch (g.warmthTier) {
          2 => 'thin',
          3 => 'medium',
          4 => 'warm',
          _ => null,
        };
      }
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
      if (widget.activity != 'cycling') {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _loadChoices();
          _refreshPreview();
        });
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
      _warmthTouched = false;
      _windTouched = false;
      _waterTouched = false;
      _breathTouched = false;
    });
    _refreshPreview();
  }

  void _applyCyclingChoice(String? id) {
    setState(() {
      _preset = id;
      _warmthBand = null;
      _warmthTouched = false;
      _windTouched = false;
      _waterTouched = false;
      _breathTouched = false;
      _writeYourself = true;
      _selectedBrand = null;
      _selectedModel = null;
      final choice = cyclingGarmentChoice(id);
      if (choice == null) return;
      _category = choice.category;
      _material = choice.material;
      _hasVentilation = false;
      _isHeated = false;
      _thermalLiner = false;
      _waterproofLiner = false;
      _warmth = choice.warmth.toDouble();
      _wind = choice.wind.toDouble();
      _water = choice.water.toDouble();
      _breath = choice.breath.toDouble();
      if (choice.warmthBands) _warmthBand = 'thin';
    });
  }

  void _applyWarmthBand(String band) {
    final tier = cyclingWarmthBandTier[band];
    if (tier == null) return;
    setState(() {
      _warmthBand = band;
      _warmth = tier.toDouble();
      _warmthTouched = false;
      _warmthSource = 'fallback';
    });
  }

  Future<void> _loadChoices() async {
    if (_isEdit || !mounted) return;
    final api = context.read<ApiClient>();
    final tags = [..._activityTags()]..sort();
    final scope = Uri.encodeQueryComponent(tags.join(','));
    final category = Uri.encodeQueryComponent(_category);
    try {
      final json = await api.get(
        '/wardrobe/catalogue/choices?category=$category&activityScope=$scope',
      );
      if (!mounted) return;
      final brands = (json['brands'] as List? ?? const [])
          .map((item) => item.toString())
          .toList();
      final models = (json['models'] as List? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(CatalogueChoice.fromJson)
          .toList();
      setState(() {
        _brands = brands;
        _modelChoices = models;
      });
    } catch (_) {
      // Free-text entry still works when the choice list cannot load.
    }
  }

  Future<void> _refreshPreview() async {
    if (_isEdit || !mounted) return;
    final api = context.read<ApiClient>();
    final liners = _linerKinds();
    final body = <String, dynamic>{
      'category': _category,
      'activityTags': _activityTags(),
      'isHeated': _isHeated,
      'linerKinds': liners,
      if (_material != null) 'material': _material,
      if (_preset != null) 'preset': _preset,
      if (!_writeYourself && _selectedBrand != null) 'brand': _selectedBrand,
      if (!_writeYourself && _selectedModel != null) 'model': _selectedModel,
      if (_writeYourself || _selectedBrand == null || _selectedModel == null)
        'name': _name.text.trim(),
    };
    try {
      final json = await api.post(
        '/wardrobe/catalogue/preview',
        body,
        auth: true,
      );
      if (!mounted || _isEdit) return;
      final preview = CataloguePreviewView.fromJson(json);
      setState(() {
        final warmth = _tierField(
          _warmth,
          _warmthTouched,
          _warmthSource,
          _warmthSamples,
        ).applyPreview(preview.warmth, preview.fallbackWarmth);
        final wind = _tierField(
          _wind,
          _windTouched,
          _windSource,
          _windSamples,
        ).applyPreview(preview.wind, preview.fallbackWind);
        final water = _tierField(
          _water,
          _waterTouched,
          _waterSource,
          _waterSamples,
        ).applyPreview(preview.water, preview.fallbackWater);
        if (!_warmthTouched) {
          _warmth = warmth.value.toDouble();
          _warmthSource = warmth.source;
          _warmthSamples = warmth.sampleCount;
        }
        if (!_windTouched) {
          _wind = wind.value.toDouble();
          _windSource = wind.source;
          _windSamples = wind.sampleCount;
        }
        if (!_waterTouched) {
          _water = water.value.toDouble();
          _waterSource = water.source;
          _waterSamples = water.sampleCount;
        }
        if (!_breathTouched) {
          _breath = preview.fallbackBreath.toDouble();
        }
      });
    } catch (_) {
      // The server applies the same lookup when the tier is left untouched.
    }
  }

  TierField _tierField(
    double value,
    bool touched,
    String source,
    int sampleCount,
  ) {
    return TierField(
      value: value.round(),
      touched: touched,
      source: source,
      sampleCount: sampleCount,
    );
  }

  List<String> _linerKinds() {
    return [
      if (_thermalLiner) 'thermal_liner',
      if (_waterproofLiner) 'waterproof_liner',
    ];
  }

  void _selectProduct(CatalogueChoice choice) {
    setState(() {
      _writeYourself = false;
      _selectedBrand = choice.brand;
      _selectedModel = choice.model;
      _brand.text = choice.brand;
      _model.text = choice.model;
      _category = choice.category;
      _preset = null;
      _isHeated = choice.heated;
      if (choice.materialKey != 'unspecified') {
        _material = choice.materialKey;
      }
      _thermalLiner = choice.linerKey.split(',').contains('thermal_liner');
      _waterproofLiner = choice.linerKey
          .split(',')
          .contains('waterproof_liner');
      _warmthTouched = false;
      _windTouched = false;
      _waterTouched = false;
      if (_name.text.trim().isEmpty) {
        _name.text = choice.curatedName.isEmpty
            ? '${choice.brand} ${choice.model}'
            : choice.curatedName;
      }
    });
    _refreshPreview();
  }

  void _useTypedModel() {
    final model = _model.text.trim();
    if (_selectedBrand == null || model.isEmpty) return;
    setState(() {
      _writeYourself = false;
      _selectedModel = model;
      _warmthTouched = false;
      _windTouched = false;
      _waterTouched = false;
    });
    _refreshPreview();
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
    final warmth = _tierField(
      _warmth,
      _warmthTouched,
      _warmthSource,
      _warmthSamples,
    );
    final wind = _tierField(_wind, _windTouched, _windSource, _windSamples);
    final water = _tierField(
      _water,
      _waterTouched,
      _waterSource,
      _waterSamples,
    );
    final breath = _tierField(_breath, _breathTouched, 'fallback', 0);
    final brand = _isEdit ? _brand.text : _selectedBrand;
    final model = _isEdit ? _model.text : _selectedModel;
    final body = garmentSaveBody(
      isEdit: _isEdit,
      name: _name.text,
      category: _category,
      writeYourself: _cyclingChoices
          ? false
          : (_isEdit ? false : _writeYourself),
      brand: _cyclingChoices ? _brand.text : brand,
      model: _cyclingChoices ? _model.text : model,
      preset: _preset,
      writePreset: _cyclingChoices,
      includeUntouchedPresetTiers: _cyclingChoices && _preset != null,
      material: _material,
      hasVentilation: _hasVentilation,
      isHeated: _isHeated,
      notes: _notes.text,
      activityTags: _activityTags(),
      linerKinds: _linerKinds(),
      warmth: warmth,
      wind: wind,
      water: water,
      breath: breath,
    );
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
            onChanged: (_) {
              if (!_isEdit && !_cyclingChoices) _refreshPreview();
            },
          ),
          if (_cyclingChoices) ..._cyclingFields(l10n),
          if (!_cyclingChoices) ...[
            if (!_isEdit)
              OutlineFormField(
                child: DropdownButtonFormField<String?>(
                  // ignore: deprecated_member_use
                  value: _preset,
                  decoration: InputDecoration(labelText: l10n.garmentQuickType),
                  items: [
                    DropdownMenuItem(
                      value: null,
                      child: Text(l10n.commonCustom),
                    ),
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
                  if (v != null) {
                    setState(() {
                      _category = v;
                      _selectedModel = null;
                      _model.clear();
                    });
                    _loadChoices();
                    _refreshPreview();
                  }
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
              onChanged: (v) {
                setState(() => _isHeated = v);
                if (!_isEdit) _refreshPreview();
              },
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(l10n.garmentThermalLiner),
              subtitle: Text(l10n.garmentThermalLinerHint),
              value: _thermalLiner,
              onChanged: (v) {
                setState(() => _thermalLiner = v);
                if (!_isEdit) _refreshPreview();
              },
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(l10n.garmentWaterproofLiner),
              value: _waterproofLiner,
              onChanged: (v) {
                setState(() => _waterproofLiner = v);
                if (!_isEdit) _refreshPreview();
              },
            ),
            if (_isEdit) ...[
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
            ] else ...[
              Text(
                l10n.catalogueNotVerified,
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 8),
              if (_selectedBrand != null && _selectedModel != null)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text('$_selectedBrand $_selectedModel'),
                  subtitle: Text(
                    _warmthSource == 'community'
                        ? l10n.catalogueCommunityEstimate(_warmthSamples)
                        : l10n.catalogueAutomaticDefault,
                  ),
                  trailing: TextButton(
                    onPressed: () {
                      setState(() {
                        _selectedBrand = null;
                        _selectedModel = null;
                        _brand.clear();
                        _model.clear();
                      });
                      _refreshPreview();
                    },
                    child: Text(l10n.catalogueChangeProduct),
                  ),
                )
              else ...[
                OutlineFormField(
                  child: TextField(
                    controller: _brand,
                    decoration: InputDecoration(
                      labelText: l10n.catalogueSearchBrand,
                    ),
                    onChanged: (_) => setState(() {}),
                  ),
                ),
                for (final brand in filterLabels(_brands, _brand.text).take(6))
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(brand),
                    onTap: () {
                      setState(() {
                        _writeYourself = false;
                        _selectedBrand = brand;
                        _selectedModel = null;
                        _brand.text = brand;
                        _model.clear();
                      });
                      _loadChoices();
                    },
                  ),
                if (_selectedBrand != null) ...[
                  OutlineFormField(
                    child: TextField(
                      controller: _model,
                      decoration: InputDecoration(
                        labelText: l10n.catalogueSearchModel,
                      ),
                      onChanged: (_) => setState(() {}),
                    ),
                  ),
                  for (final choice
                      in _modelChoices
                          .where(
                            (choice) =>
                                choice.brand.toLowerCase() ==
                                    _selectedBrand!.toLowerCase() &&
                                (_model.text.trim().isEmpty ||
                                    choice.model.toLowerCase().contains(
                                      _model.text.trim().toLowerCase(),
                                    )),
                          )
                          .take(6))
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(choice.model),
                      subtitle: Text(choice.curatedName),
                      onTap: () => _selectProduct(choice),
                    ),
                  if (_model.text.trim().isNotEmpty)
                    Align(
                      alignment: Alignment.centerLeft,
                      child: TextButton(
                        onPressed: _useTypedModel,
                        child: Text(l10n.catalogueUseModel),
                      ),
                    ),
                ],
                Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton(
                    onPressed: () {
                      setState(() {
                        _writeYourself = true;
                        _selectedBrand = null;
                        _selectedModel = null;
                        _brand.clear();
                        _model.clear();
                        _warmthTouched = false;
                        _windTouched = false;
                        _waterTouched = false;
                      });
                      _refreshPreview();
                    },
                    child: Text(l10n.catalogueWriteYourself),
                  ),
                ),
                if (_writeYourself)
                  Text(
                    l10n.catalogueWriteYourselfHint,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
              ],
            ],
            const SizedBox(height: 8),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(l10n.garmentMoreDetails),
              subtitle: Text(l10n.garmentMoreDetailsHint),
              value: _advanced || _isEdit,
              onChanged: (v) => setState(() => _advanced = v),
            ),
            ...[
              _tier(
                l10n.tierWarmth,
                _warmth,
                _caption(l10n, _warmthTouched, _warmthSource, _warmthSamples),
                (v) => setState(() {
                  _warmth = v;
                  _warmthTouched = true;
                  _warmthSource = 'explicit';
                }),
              ),
              _tier(
                l10n.tierWind,
                _wind,
                _caption(l10n, _windTouched, _windSource, _windSamples),
                (v) => setState(() {
                  _wind = v;
                  _windTouched = true;
                  _windSource = 'explicit';
                }),
              ),
              _tier(
                l10n.tierWater,
                _water,
                _caption(l10n, _waterTouched, _waterSource, _waterSamples),
                (v) => setState(() {
                  _water = v;
                  _waterTouched = true;
                  _waterSource = 'explicit';
                }),
              ),
              if (_advanced || _isEdit)
                _tier(
                  l10n.tierBreath,
                  _breath,
                  _breathTouched
                      ? l10n.catalogueYourValue
                      : l10n.catalogueAutomaticDefault,
                  (v) => setState(() {
                    _breath = v;
                    _breathTouched = true;
                  }),
                ),
            ],
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

  List<Widget> _cyclingFields(AppLocalizations l10n) {
    final selected = cyclingGarmentChoice(_preset)?.id;
    final choice = cyclingGarmentChoice(selected);
    return [
      OutlineFormField(
        child: DropdownButtonFormField<String?>(
          // ignore: deprecated_member_use
          value: selected,
          decoration: InputDecoration(labelText: l10n.cyclingGarmentType),
          items: [
            DropdownMenuItem(value: null, child: Text(l10n.commonCustom)),
            for (final item in cyclingGarmentChoices)
              DropdownMenuItem(
                value: item.id,
                child: Text(garmentPresetLabel(l10n, item.id)),
              ),
          ],
          onChanged: _applyCyclingChoice,
        ),
      ),
      if (choice?.warmthBands == true) ...[
        const SizedBox(height: 8),
        SegmentedButton<String>(
          emptySelectionAllowed: true,
          showSelectedIcon: false,
          segments: [
            for (final band in cyclingWarmthBandTier.keys)
              ButtonSegment(
                value: band,
                label: Text(cyclingWarmthBandLabel(l10n, band)),
              ),
          ],
          selected: {?_warmthBand},
          onSelectionChanged: (next) {
            if (next.isEmpty) return;
            _applyWarmthBand(next.first);
          },
        ),
      ],
      const SizedBox(height: 8),
      Text(
        l10n.cyclingDefaultsEstimate,
        style: Theme.of(context).textTheme.bodySmall,
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
      ListTile(
        contentPadding: EdgeInsets.zero,
        title: Text(l10n.cyclingAdvancedWinter),
        trailing: Icon(_advanced ? Icons.expand_less : Icons.expand_more),
        onTap: () => setState(() => _advanced = !_advanced),
      ),
      if (_advanced) ..._cyclingAdvanced(l10n),
    ];
  }

  List<Widget> _cyclingAdvanced(AppLocalizations l10n) {
    return [
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
            if (v == null) return;
            setState(() => _category = v);
          },
        ),
      ),
      OutlineFormField(
        child: DropdownButtonFormField<String?>(
          // ignore: deprecated_member_use
          value: _material,
          decoration: InputDecoration(labelText: l10n.garmentMaterial),
          items: [
            DropdownMenuItem(value: null, child: Text(l10n.garmentUnspecified)),
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
      _tier(
        l10n.tierWarmth,
        _warmth,
        _caption(l10n, _warmthTouched, _warmthSource, _warmthSamples),
        (v) => setState(() {
          _warmth = v;
          _warmthTouched = true;
          _warmthSource = 'explicit';
          _warmthBand = switch (v.round()) {
            2 => 'thin',
            3 => 'medium',
            4 => 'warm',
            _ => null,
          };
        }),
      ),
      _tier(
        l10n.tierWind,
        _wind,
        _caption(l10n, _windTouched, _windSource, _windSamples),
        (v) => setState(() {
          _wind = v;
          _windTouched = true;
          _windSource = 'explicit';
        }),
      ),
      _tier(
        l10n.tierWater,
        _water,
        _caption(l10n, _waterTouched, _waterSource, _waterSamples),
        (v) => setState(() {
          _water = v;
          _waterTouched = true;
          _waterSource = 'explicit';
        }),
      ),
      _tier(
        l10n.tierBreath,
        _breath,
        _breathTouched
            ? l10n.catalogueYourValue
            : l10n.catalogueAutomaticDefault,
        (v) => setState(() {
          _breath = v;
          _breathTouched = true;
        }),
      ),
    ];
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

  String _caption(
    AppLocalizations l10n,
    bool touched,
    String source,
    int sampleCount,
  ) {
    return tierCaption(
      touched: touched,
      source: source,
      sampleCount: sampleCount,
      yourValue: l10n.catalogueYourValue,
      automaticDefault: l10n.catalogueAutomaticDefault,
      communityEstimate: l10n.catalogueCommunityEstimate,
    );
  }

  Widget _tier(
    String label,
    double value,
    String caption,
    ValueChanged<double> onChanged,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(child: Text(label)),
            Text('${value.round()}/5'),
          ],
        ),
        Text(caption, style: Theme.of(context).textTheme.bodySmall),
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
