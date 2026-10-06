import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';

type JsonResponse = {
  status: (code: number) => { json: (body: unknown) => void };
};

/**
 * HttpException bodies stay intact so clients still see validation and auth codes.
 * Unexpected errors return a fixed message and log only the error name.
 */
@Catch()
export class SanitizeExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SanitizeExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<JsonResponse>();
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const payload =
        typeof body === 'string'
          ? { statusCode: status, message: body }
          : body;
      response.status(status).json(payload);
      return;
    }
    const name = exception instanceof Error ? exception.name : 'UnknownError';
    this.logger.error(`Unhandled ${name}`);
    response.status(500).json({
      statusCode: 500,
      message: 'Internal server error',
    });
  }
}
