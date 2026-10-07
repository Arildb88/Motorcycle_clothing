import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { GeocodingUnavailableError } from './ors-geocoding.service';
import { geocodingHttpException } from './location.controller';

describe('geocodingHttpException', () => {
  it('keeps a missing or rejected key distinct from a temporary outage', () => {
    for (const reason of ['not_configured', 'authentication'] as const) {
      const error = geocodingHttpException(new GeocodingUnavailableError(reason));
      expect(error).toBeInstanceOf(ServiceUnavailableException);
      expect(error.getStatus()).toBe(503);
      expect(error.getResponse()).toMatchObject({
        code: 'GEOCODING_NOT_CONFIGURED',
      });
    }
  });

  it('maps a missing place lookup to not found, not a temporary outage', () => {
    const error = geocodingHttpException(new GeocodingUnavailableError('not_found'));
    expect(error).toBeInstanceOf(NotFoundException);
    expect(error.getStatus()).toBe(404);
    expect(error.getResponse()).toMatchObject({ code: 'PLACE_NOT_FOUND' });
    expect(JSON.stringify(error.getResponse())).not.toContain('temporarily');
  });

  it('keeps provider and unknown failures temporary', () => {
    for (const cause of [new GeocodingUnavailableError('provider'), new Error('boom')]) {
      const error = geocodingHttpException(cause);
      expect(error).toBeInstanceOf(ServiceUnavailableException);
      expect(error.getResponse()).toMatchObject({ code: 'GEOCODING_UNAVAILABLE' });
    }
  });
});
