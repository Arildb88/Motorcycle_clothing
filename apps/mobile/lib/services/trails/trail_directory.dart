import 'package:motorcycle_clothing/services/trails/ski_trail.dart';

class TrailDirectoryException implements Exception {
  TrailDirectoryException(this.message, {this.code});

  final String message;
  final String? code;

  @override
  String toString() => message;
}

/// Ski-trail discovery through the RideWear API. Flutter does not call Kartverket.
abstract class TrailDirectory {
  Future<List<SkiTrail>> nearby({required double lat, required double lon});
}
