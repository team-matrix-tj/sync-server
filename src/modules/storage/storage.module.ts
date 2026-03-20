import { Module } from '@nestjs/common';
import { DiskStorageService } from './disk-storage.service';
import { STORAGE_SERVICE } from './storage.constants';

@Module({
  providers: [
    DiskStorageService,
    {
      provide: STORAGE_SERVICE,
      useExisting: DiskStorageService,
    },
  ],
  exports: [STORAGE_SERVICE],
})
export class StorageModule {}
