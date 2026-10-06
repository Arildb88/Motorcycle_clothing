import { BadRequestException, Logger } from '@nestjs/common';
import { SanitizeExceptionFilter } from './sanitize-exception.filter';

describe('SanitizeExceptionFilter', () => {
  function hostFor(capture: { status?: number; body?: unknown }) {
    return {
      switchToHttp: () => ({
        getResponse: () => ({
          status: (code: number) => ({
            json: (body: unknown) => {
              capture.status = code;
              capture.body = body;
            },
          }),
        }),
      }),
    };
  }

  it('keeps an HttpException body', () => {
    const capture: { status?: number; body?: unknown } = {};
    const filter = new SanitizeExceptionFilter();
    filter.catch(
      new BadRequestException({
        code: 'INVALID_RESET_TOKEN',
        message: 'This password reset link is invalid or has expired.',
      }),
      hostFor(capture) as never,
    );
    expect(capture.status).toBe(400);
    expect(capture.body).toEqual({
      code: 'INVALID_RESET_TOKEN',
      message: 'This password reset link is invalid or has expired.',
    });
  });

  it('hides unexpected error text from the client', () => {
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const capture: { status?: number; body?: unknown } = {};
    const filter = new SanitizeExceptionFilter();
    filter.catch(
      new Error('JWT_SECRET=super-secret leaked in this message'),
      hostFor(capture) as never,
    );
    expect(capture.status).toBe(500);
    expect(capture.body).toEqual({
      statusCode: 500,
      message: 'Internal server error',
    });
    expect(JSON.stringify(capture.body)).not.toContain('super-secret');
    expect(errorSpy).toHaveBeenCalledWith('Unhandled Error');
    errorSpy.mockRestore();
  });
});
