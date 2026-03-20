import { Body, Controller, Post } from '@nestjs/common';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { DevicesService } from './devices.service';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('register')
  registerDevice(@Body() dto: RegisterDeviceDto) {
    return this.devicesService.registerDevice(dto);
  }
}
