import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Whether a parent label change must leave the characters the user is typing.
///
/// A cleared selection must not wipe an in-progress query, and an active
/// composing range (the keyboard is still building æ, ø, or å) must not be
/// replaced by a parent rebuild.
bool shouldKeepTypedPlaceQuery({
  required String previousDisplay,
  required String nextDisplay,
  required String typed,
  required bool composing,
}) {
  if (composing) return true;
  if (nextDisplay == previousDisplay) return true;
  final userIsEditing = typed.trim().isNotEmpty && typed != previousDisplay;
  return userIsEditing && nextDisplay.isEmpty;
}

/// Free-text field for place, resort, and route-planner names.
///
/// Suggestions stay enabled. On Android, `enableSuggestions: false` sets
/// `TYPE_TEXT_FLAG_NO_SUGGESTIONS`, and keyboards such as Gboard then hide
/// the layout required to type æ, ø, and å. No formatter strips characters.
/// Autocorrect stays off so a typed place name is not rewritten.
class PlaceQueryField extends StatelessWidget {
  const PlaceQueryField({
    super.key,
    required this.controller,
    required this.decoration,
    this.focusNode,
    this.onChanged,
    this.enabled = true,
    this.maxLines = 1,
  });

  final TextEditingController controller;
  final InputDecoration decoration;
  final FocusNode? focusNode;
  final ValueChanged<String>? onChanged;
  final bool enabled;
  final int maxLines;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      focusNode: focusNode,
      enabled: enabled,
      maxLines: maxLines,
      keyboardType: TextInputType.text,
      textCapitalization: TextCapitalization.none,
      autocorrect: false,
      enableSuggestions: true,
      smartDashesType: SmartDashesType.disabled,
      smartQuotesType: SmartQuotesType.disabled,
      inputFormatters: const <TextInputFormatter>[],
      onChanged: onChanged,
      decoration: decoration,
    );
  }
}
