import {
  ArgumentMetadata,
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';
import { CreateFeedbackDto } from './create-feedback.dto';

describe('CreateFeedbackDto zone ratings', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  });
  const meta: ArgumentMetadata = {
    type: 'body',
    metatype: CreateFeedbackDto,
    data: '',
  };
  const body = {
    activityType: 'cycling',
    departureAt: '2026-10-07T12:00:00.000Z',
    weatherSnapshot: { minTempC: 4 },
    recommendation: { engine: 'cycling_v1' },
    rating: 'ok',
  };

  it('accepts omitted zones and one optional zone', async () => {
    const omitted = await pipe.transform(body, meta);
    expect(omitted.zones).toBeUndefined();

    const torso = await pipe.transform(
      { ...body, zones: { torso: 'too_cold' } },
      meta,
    );
    expect(torso.zones).toEqual({ torso: 'too_cold' });
  });

  it('rejects an unsupported zone and a rating outside cold, comfortable, and hot', async () => {
    await expect(
      pipe.transform({ ...body, zones: { hands: 'too_cold' } }, meta),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      pipe.transform({ ...body, zones: { legs: 'slightly_warm' } }, meta),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
