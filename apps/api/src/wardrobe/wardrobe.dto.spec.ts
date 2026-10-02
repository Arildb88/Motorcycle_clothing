import {
  ArgumentMetadata,
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';
import { CreateGarmentDto } from './dto/create-garment.dto';
import { UpdateGarmentDto } from './dto/update-garment.dto';

describe('garment DTO demo identity', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  });

  const body = (metatype: new () => object): ArgumentMetadata => ({
    type: 'body',
    metatype,
    data: '',
  });

  it('rejects a client attempt to set isDemo on create', async () => {
    await expect(
      pipe.transform(
        { name: 'Mine', category: 'gloves', isDemo: true },
        body(CreateGarmentDto),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a client attempt to clear isDemo on update', async () => {
    await expect(
      pipe.transform({ name: 'Renamed', isDemo: false }, body(UpdateGarmentDto)),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts a normal garment body without isDemo', async () => {
    const created = await pipe.transform(
      { name: 'Mine', category: 'gloves' },
      body(CreateGarmentDto),
    );
    expect(created).toMatchObject({ name: 'Mine', category: 'gloves' });
    expect(created).not.toHaveProperty('isDemo');

    const updated = await pipe.transform(
      { name: 'Renamed' },
      body(UpdateGarmentDto),
    );
    expect(updated).toMatchObject({ name: 'Renamed' });
    expect(updated).not.toHaveProperty('isDemo');
  });
});
