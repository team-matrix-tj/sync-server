import { BadRequestException, Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentDevice } from '../../common/decorators/current-device.decorator';
import { AuthenticatedDevice, DeviceAuthGuard } from '../../common/guards/device-auth.guard';
import { PullSyncQueryDto } from './dto/pull-sync.dto';
import { PushSyncDto } from './dto/push-sync.dto';
import { SyncService } from './sync.service';

@Controller('sync')
@UseGuards(DeviceAuthGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('push')
  push(
    @Body() dto: PushSyncDto,
    @CurrentDevice() device: AuthenticatedDevice | undefined,
  ) {
    if (device && device.workspaceId !== dto.workspaceId) {
      throw new BadRequestException('Authenticated device workspace mismatch');
    }

    return this.syncService.push(dto);
  }

  @Get('pull')
  pull(
    @Query() query: PullSyncQueryDto,
    @CurrentDevice() device: AuthenticatedDevice | undefined,
  ) {
    if (device && device.workspaceId !== query.workspaceId) {
      throw new BadRequestException('Authenticated device workspace mismatch');
    }

    return this.syncService.pull(query);
  }
}
