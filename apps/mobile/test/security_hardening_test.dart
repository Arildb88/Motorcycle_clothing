import 'dart:io';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:motorcycle_clothing/services/api_client.dart';

void main() {
  test('session storage is device-local and not iCloud-synced', () {
    final options = ridewearSecureStorage;
    expect(options, isA<FlutterSecureStorage>());
    expect(
      ridewearIosOptions.accessibility,
      KeychainAccessibility.first_unlock_this_device,
    );
    expect(ridewearIosOptions.synchronizable, isFalse);
  });

  test('release manifest blocks cleartext and Android backup', () {
    final manifest = File(
      'android/app/src/main/AndroidManifest.xml',
    ).readAsStringSync();
    expect(manifest, contains('android:usesCleartextTraffic="false"'));
    expect(manifest, contains('android:allowBackup="false"'));
    expect(manifest, isNot(contains('android:usesCleartextTraffic="true"')));
  });

  test('debug and profile builds can still reach a local HTTP API', () {
    for (final name in ['debug', 'profile']) {
      final manifest = File(
        'android/app/src/$name/AndroidManifest.xml',
      ).readAsStringSync();
      expect(manifest, contains('android:usesCleartextTraffic="true"'));
    }
  });

  test('iOS allows local networking and not arbitrary cleartext', () {
    final plist = File('ios/Runner/Info.plist').readAsStringSync();
    expect(plist, contains('<key>NSAllowsLocalNetworking</key>'));
    expect(plist, isNot(contains('NSAllowsArbitraryLoads')));
  });
}
