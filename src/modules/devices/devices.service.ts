import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { hashDeviceToken, randomToken } from '../../common/utils/hash.util';
import { RegisterDeviceDto } from './dto/register-device.dto';

@Injectable()
export class DevicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async registerDevice(dto: RegisterDeviceDto) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: dto.workspaceId },
      select: { id: true },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const deviceToken = randomToken();
    const pepper = this.configService.getOrThrow<string>('auth.deviceTokenPepper');
    const tokenHash = hashDeviceToken(deviceToken, pepper);

    const device = await this.prisma.device.create({
      data: {
        workspaceId: dto.workspaceId,
        name: dto.name.trim(),
        tokenHash,
      },
      select: {
        id: true,
        workspaceId: true,
        name: true,
        createdAt: true,
      },
    });

    return {
      deviceId: device.id,
      workspaceId: device.workspaceId,
      deviceName: device.name,
      deviceToken,
      createdAt: device.createdAt,
    };
  }
}
