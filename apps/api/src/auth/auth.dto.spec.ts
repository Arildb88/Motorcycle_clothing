import {
  ArgumentMetadata,
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';

describe('auth DTO bounds', () => {
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

  it('rejects an oversized login password before bcrypt', async () => {
    await expect(
      pipe.transform(
        { email: 'rider@example.com', password: 'x'.repeat(129) },
        body(LoginDto),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts a login password at the register maximum', async () => {
    const dto = await pipe.transform(
      { email: 'Rider@Example.com', password: 'x'.repeat(128) },
      body(LoginDto),
    );
    expect(dto).toMatchObject({
      email: 'Rider@Example.com',
      password: 'x'.repeat(128),
    });
  });

  it('rejects an oversized forgot-password email', async () => {
    await expect(
      pipe.transform(
        { email: `${'a'.repeat(250)}@example.com` },
        body(ForgotPasswordDto),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
