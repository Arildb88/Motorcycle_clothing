import 'package:geolocator/geolocator.dart';
import 'package:motorcycle_clothing/services/location/location_models.dart';

/// Result of a one-shot current-location request (no continuous tracking).
enum DeviceLocationFailure {
  permissionDenied,
  permissionDeniedForever,
  serviceDisabled,
  temporaryFailure,
}

class DeviceLocationResult {
  const DeviceLocationResult._({this.place, this.failure});

  factory DeviceLocationResult.ok(ResolvedPlace place) =>
      DeviceLocationResult._(place: place);

  factory DeviceLocationResult.err(DeviceLocationFailure failure) =>
      DeviceLocationResult._(failure: failure);

  final ResolvedPlace? place;
  final DeviceLocationFailure? failure;

  bool get isOk => place != null;
}

/// Abstraction so planner UI never calls Geolocator directly in tests.
abstract class DeviceLocationService {
  Future<DeviceLocationResult> getCurrentPlace();
}

class GeolocatorDeviceLocationService implements DeviceLocationService {
  @override
  Future<DeviceLocationResult> getCurrentPlace() async {
    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        return DeviceLocationResult.err(DeviceLocationFailure.serviceDisabled);
      }

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied) {
        return DeviceLocationResult.err(DeviceLocationFailure.permissionDenied);
      }
      if (permission == LocationPermission.deniedForever) {
        return DeviceLocationResult.err(
          DeviceLocationFailure.permissionDeniedForever,
        );
      }

      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 15),
        ),
      );
      return DeviceLocationResult.ok(
        ResolvedPlace(
          providerPlaceId: 'device:${pos.latitude},${pos.longitude}',
          label: 'Current location',
          lat: pos.latitude,
          lon: pos.longitude,
        ),
      );
    } catch (_) {
      return DeviceLocationResult.err(DeviceLocationFailure.temporaryFailure);
    }
  }
}

/// Test double — returns a fixed place or a configured failure.
class FakeDeviceLocationService implements DeviceLocationService {
  FakeDeviceLocationService({this.place, this.failure});

  ResolvedPlace? place;
  DeviceLocationFailure? failure;

  @override
  Future<DeviceLocationResult> getCurrentPlace() async {
    if (failure != null) return DeviceLocationResult.err(failure!);
    if (place != null) return DeviceLocationResult.ok(place!);
    return DeviceLocationResult.err(DeviceLocationFailure.temporaryFailure);
  }
}
