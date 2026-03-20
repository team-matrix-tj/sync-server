import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsUUID, ValidateNested } from 'class-validator';
import { PushChangeDto } from './push-change.dto';

export class PushSyncDto {
  @IsUUID()
  workspaceId!: string;

  @IsUUID()
  deviceId!: string;

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PushChangeDto)
  changes!: PushChangeDto[];
}
