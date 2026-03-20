import {
  IsBase64,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export enum SyncChangeKind {
  UPSERT = 'upsert',
  DELETE = 'delete',
}

export class PushChangeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  @Matches(/^[^\\]+$/, { message: 'path must use forward slashes only' })
  path!: string;

  @IsEnum(SyncChangeKind)
  kind!: SyncChangeKind;

  @ValidateIf((value: PushChangeDto) => value.kind === SyncChangeKind.UPSERT)
  @IsBase64()
  contentBase64?: string;

  @ValidateIf((value: PushChangeDto) => value.kind === SyncChangeKind.UPSERT)
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  contentHash?: string;

  @ValidateIf((value: PushChangeDto) => value.kind === SyncChangeKind.UPSERT)
  @IsInt()
  @Min(0)
  sizeBytes?: number;

  @IsOptional()
  @IsUUID()
  baseRevisionId?: string | null;
}
