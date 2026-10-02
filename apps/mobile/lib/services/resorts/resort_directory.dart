import 'package:motorcycle_clothing/services/resorts/ski_resort.dart';

class ResortDirectoryException implements Exception {
  ResortDirectoryException(this.message, {this.code});

  final String message;
  final String? code;

  @override
  String toString() => message;
}

/// Ski resort discovery through the RideWear API. Flutter does not call Fnugg.
abstract class ResortDirectory {
  Future<List<SkiResort>> searchByName(String query);

  Future<List<SkiResort>> nearby({required double lat, required double lon});
}
