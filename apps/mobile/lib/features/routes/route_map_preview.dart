import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:motorcycle_clothing/services/location/location_models.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';

/// Schematic map preview of waypoints + route geometry.
///
/// Uses provider route geometry when available; falls back to straight
/// segments between stops. Does not require the Google Maps SDK (tiles),
/// so CI/local builds work without a native Maps key. Geometry still comes
/// from [RouteGeometryService] (Google Routes when configured).
class RouteMapPreview extends StatelessWidget {
  const RouteMapPreview({
    super.key,
    required this.waypoints,
    this.geometry,
    this.loading = false,
    this.error,
  });

  final List<GeoPoint> waypoints;
  final RouteGeometry? geometry;
  final bool loading;
  final String? error;

  @override
  Widget build(BuildContext context) {
    final points = (geometry?.points.isNotEmpty ?? false)
        ? geometry!.points
        : waypoints;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: SizedBox(
        height: 220,
        width: double.infinity,
        child: Stack(
          children: [
            Positioned.fill(
              child: ColoredBox(
                color: const Color(0xFFE8EEF2),
                child: points.length < 2
                    ? Center(
                        child: Text(
                          'Select start and destination to preview the route',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: AppTheme.steel.withValues(alpha: 0.9),
                          ),
                        ),
                      )
                    : CustomPaint(
                        painter: _RoutePreviewPainter(
                          line: points,
                          stops: waypoints,
                        ),
                      ),
              ),
            ),
            if (loading)
              const Positioned.fill(
                child: ColoredBox(
                  color: Color(0x66FFFFFF),
                  child: Center(child: CircularProgressIndicator()),
                ),
              ),
            if (error != null && !loading)
              Positioned(
                left: 8,
                right: 8,
                bottom: 8,
                child: Material(
                  color: Colors.white.withValues(alpha: 0.92),
                  borderRadius: BorderRadius.circular(8),
                  child: Padding(
                    padding: const EdgeInsets.all(8),
                    child: Text(
                      error!,
                      style: TextStyle(
                        color: Colors.red.shade700,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ),
              ),
            if (geometry?.providerWarning != null && error == null)
              Positioned(
                left: 8,
                right: 8,
                top: 8,
                child: Material(
                  color: Colors.white.withValues(alpha: 0.92),
                  borderRadius: BorderRadius.circular(8),
                  child: Padding(
                    padding: const EdgeInsets.all(8),
                    child: Text(
                      geometry!.providerWarning!,
                      style: const TextStyle(
                        color: AppTheme.steel,
                        fontSize: 11,
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _RoutePreviewPainter extends CustomPainter {
  _RoutePreviewPainter({required this.line, required this.stops});

  final List<GeoPoint> line;
  final List<GeoPoint> stops;

  @override
  void paint(Canvas canvas, Size size) {
    final all = [...line, ...stops];
    if (all.isEmpty) return;

    var minLat = all.first.lat;
    var maxLat = all.first.lat;
    var minLon = all.first.lon;
    var maxLon = all.first.lon;
    for (final p in all) {
      minLat = math.min(minLat, p.lat);
      maxLat = math.max(maxLat, p.lat);
      minLon = math.min(minLon, p.lon);
      maxLon = math.max(maxLon, p.lon);
    }
    final pad = 28.0;
    final latSpan = math.max(maxLat - minLat, 0.002);
    final lonSpan = math.max(maxLon - minLon, 0.002);

    Offset project(GeoPoint p) {
      final x = pad + (p.lon - minLon) / lonSpan * (size.width - 2 * pad);
      final y = pad + (maxLat - p.lat) / latSpan * (size.height - 2 * pad);
      return Offset(x, y);
    }

    // Soft grid
    final grid = Paint()
      ..color = const Color(0xFFD0DCE4)
      ..strokeWidth = 1;
    for (var i = 1; i < 4; i++) {
      final dx = size.width * i / 4;
      final dy = size.height * i / 4;
      canvas.drawLine(Offset(dx, 0), Offset(dx, size.height), grid);
      canvas.drawLine(Offset(0, dy), Offset(size.width, dy), grid);
    }

    if (line.length >= 2) {
      final path = Path()..moveTo(project(line.first).dx, project(line.first).dy);
      for (var i = 1; i < line.length; i++) {
        final o = project(line[i]);
        path.lineTo(o.dx, o.dy);
      }
      final stroke = Paint()
        ..color = AppTheme.asphalt
        ..style = PaintingStyle.stroke
        ..strokeWidth = 4
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round;
      canvas.drawPath(path, stroke);
    }

    for (var i = 0; i < stops.length; i++) {
      final o = project(stops[i]);
      final isStart = i == 0;
      final isEnd = i == stops.length - 1;
      final color = isStart
          ? const Color(0xFF2E7D32)
          : isEnd
              ? const Color(0xFFC62828)
              : AppTheme.asphalt;
      canvas.drawCircle(o, 8, Paint()..color = Colors.white);
      canvas.drawCircle(o, 6, Paint()..color = color);
    }
  }

  @override
  bool shouldRepaint(covariant _RoutePreviewPainter oldDelegate) {
    return oldDelegate.line != line || oldDelegate.stops != stops;
  }
}
