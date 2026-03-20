import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainError } from '../errors/domain-error';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof DomainError) {
      response.status(exception.statusCode).json({
        error: {
          code: exception.code,
          message: exception.message,
          details: exception.details ?? null,
        },
        timestamp: new Date().toISOString(),
        path: request.url,
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      response.status(status).json({
        error: {
          code: HttpStatus[status] ?? 'HTTP_EXCEPTION',
          message:
            typeof exceptionResponse === 'string'
              ? exceptionResponse
              : (exceptionResponse as { message?: string | string[] }).message ?? exception.message,
          details: typeof exceptionResponse === 'object' ? exceptionResponse : null,
        },
        timestamp: new Date().toISOString(),
        path: request.url,
      });
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Unexpected server error',
        details: null,
      },
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
