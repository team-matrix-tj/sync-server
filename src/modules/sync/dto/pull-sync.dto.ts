import { IsOptional, IsUUID, Matches } from 'class-validator';

export class PullSyncQueryDto {
  @IsUUID()
  workspaceId!: string;

  @IsUUID()
  deviceId!: string;

  @IsOptional()
  @Matches(/^\d+$/)
  cursor?: string;
}
