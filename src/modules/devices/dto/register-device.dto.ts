import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class RegisterDeviceDto {
  @IsUUID()
  workspaceId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;
}
