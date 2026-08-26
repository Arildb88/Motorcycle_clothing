import 'package:flutter_test/flutter_test.dart';
import 'package:motorcycle_clothing/config/app_config.dart';

void main() {
  test('app brand name is set', () {
    expect(AppConfig.appName, 'RideWear');
  });
}
