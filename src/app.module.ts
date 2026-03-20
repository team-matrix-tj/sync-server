import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from './config/app.config';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { DevicesModule } from './modules/devices/devices.module';
import { StorageModule } from './modules/storage/storage.module';
import { SyncModule } from './modules/sync/sync.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      load: [appConfig],
      validate: validateEnv,
    }),
    PrismaModule,
    HealthModule,
    WorkspacesModule,
    DevicesModule,
    StorageModule,
    SyncModule,
  ],
})
export class AppModule {}
