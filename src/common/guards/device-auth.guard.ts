import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { hashDeviceToken, safeCompareHash } from '../utils/hash.util';

export interface AuthenticatedDevice {
  id: string;
  workspaceId: string;
  name: string;
}

@Injectable()
export class DeviceAuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      body?: Record<string, unknown>;
      query?: Record<string, unknown>;
      device?: AuthenticatedDevice;
    }>();

    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = authorization.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const deviceId = this.resolveDeviceId(request);
    if (!deviceId) {
      throw new UnauthorizedException('deviceId is required for authenticated requests');
    }

    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      select: {
        id: true,
        name: true,
        workspaceId: true,
        tokenHash: true,
      },
    });

    if (!device) {
      throw new UnauthorizedException('Device not found');
    }

    const pepper = this.configService.getOrThrow<string>('auth.deviceTokenPepper');
    const candidateHash = hashDeviceToken(token, pepper);
    if (!safeCompareHash(candidateHash, device.tokenHash)) {
      throw new UnauthorizedException('Invalid device token');
    }

    await this.prisma.device.update({
      where: { id: device.id },
      data: { lastSeenAt: new Date() },
    });

    request.device = {
      id: device.id,
      name: device.name,
      workspaceId: device.workspaceId,
    };

    return true;
  }

  private resolveDeviceId(request: {
    body?: Record<string, unknown>;
    query?: Record<string, unknown>;
  }): string | undefined {
    const bodyDeviceId = request.body?.deviceId;
    const queryDeviceId = request.query?.deviceId;

    if (typeof bodyDeviceId === 'string') {
      return bodyDeviceId;
    }

    if (typeof queryDeviceId === 'string') {
      return queryDeviceId;
    }

    return undefined;
  }
}
