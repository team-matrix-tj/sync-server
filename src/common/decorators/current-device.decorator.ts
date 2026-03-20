import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedDevice } from '../guards/device-auth.guard';

export const CurrentDevice = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedDevice | undefined => {
    const request = context.switchToHttp().getRequest<{ device?: AuthenticatedDevice }>();
    return request.device;
  },
);
