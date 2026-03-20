import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, RevisionKind } from '@prisma/client';
import { randomUUID } from 'crypto';
import { decodeBase64Content } from '../../common/utils/content.util';
import { sha256Hex } from '../../common/utils/hash.util';
import { normalizeWorkspacePath } from '../../common/utils/path.util';
import { PrismaService } from '../../prisma/prisma.service';
import { STORAGE_SERVICE } from '../storage/storage.constants';
import { StorageService } from '../storage/storage.interface';
import { PullSyncQueryDto } from './dto/pull-sync.dto';
import { PushSyncDto } from './dto/push-sync.dto';
import { SyncChangeKind } from './dto/push-change.dto';
import { PullChangeResponse, PushAcceptedChange, PushConflictChange } from './sync.types';

@Injectable()
export class SyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(STORAGE_SERVICE) private readonly storageService: StorageService,
  ) {}

  async push(dto: PushSyncDto) {
    const maxBatchSize = this.configService.getOrThrow<number>('sync.maxBatchSize');
    if (dto.changes.length > maxBatchSize) {
      throw new BadRequestException(`changes exceeds max batch size of ${maxBatchSize}`);
    }

    await this.assertWorkspaceAndDevice(dto.workspaceId, dto.deviceId);

    const accepted: PushAcceptedChange[] = [];
    const conflicts: PushConflictChange[] = [];

    for (const change of dto.changes) {
      const normalizedPath = normalizeWorkspacePath(change.path);

      if (change.kind === SyncChangeKind.UPSERT) {
        const outcome = await this.applyUpsertChange(dto, {
          ...change,
          path: normalizedPath,
        });

        if (outcome.type === 'accepted') {
          accepted.push(outcome.value);
        } else {
          conflicts.push(outcome.value);
        }

        continue;
      }

      const outcome = await this.applyDeleteChange(dto, {
        ...change,
        path: normalizedPath,
      });

      if (outcome.type === 'accepted') {
        accepted.push(outcome.value);
      } else {
        conflicts.push(outcome.value);
      }
    }

    return {
      accepted,
      conflicts,
    };
  }

  async pull(query: PullSyncQueryDto) {
    await this.assertWorkspaceAndDevice(query.workspaceId, query.deviceId);

    const limit = this.configService.getOrThrow<number>('sync.pullLimit');
    const cursor = BigInt(query.cursor ?? '0');

    const events = await this.prisma.event.findMany({
      where: {
        workspaceId: query.workspaceId,
        seq: { gt: cursor },
      },
      include: {
        revision: true,
      },
      orderBy: {
        seq: 'asc',
      },
      take: limit,
    });

    const changes: PullChangeResponse[] = [];
    for (const event of events) {
      if (event.kind === RevisionKind.UPSERT && event.revision.storageKey) {
        const content = await this.storageService.readRevisionContent(event.revision.storageKey);
        changes.push({
          seq: Number(event.seq),
          path: event.path,
          kind: 'upsert',
          revisionId: event.revisionId,
          contentHash: event.revision.contentHash,
          sizeBytes: event.revision.sizeBytes,
          contentBase64: content.toString('base64'),
        });
        continue;
      }

      changes.push({
        seq: Number(event.seq),
        path: event.path,
        kind: 'delete',
        revisionId: event.revisionId,
      });
    }

    const nextCursor = events.length > 0 ? Number(events[events.length - 1].seq) : Number(cursor);

    return {
      changes,
      nextCursor,
    };
  }

  private async applyUpsertChange(
    dto: PushSyncDto,
    change: PushSyncDto['changes'][number] & { path: string },
  ): Promise<
    | { type: 'accepted'; value: PushAcceptedChange }
    | { type: 'conflict'; value: PushConflictChange }
  > {
    const maxFileSizeBytes = this.configService.getOrThrow<number>('sync.maxFileSizeBytes');
    const contentBuffer = decodeBase64Content(change.contentBase64 ?? '', maxFileSizeBytes);
    const contentHash = sha256Hex(contentBuffer);
    if (contentHash !== change.contentHash) {
      throw new BadRequestException(`content hash mismatch for ${change.path}`);
    }

    if (change.sizeBytes !== undefined && change.sizeBytes !== contentBuffer.byteLength) {
      throw new BadRequestException(`sizeBytes mismatch for ${change.path}`);
    }

    const revisionId = randomUUID();
    const storageKey = await this.storageService.saveRevisionContent({
      workspaceId: dto.workspaceId,
      revisionId,
      content: contentBuffer,
    });

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const file = await tx.file.findUnique({
          where: {
            workspaceId_path: {
              workspaceId: dto.workspaceId,
              path: change.path,
            },
          },
        });

        if (!file && change.baseRevisionId) {
          return {
            type: 'conflict' as const,
            value: {
              path: change.path,
              reason: 'file_missing' as const,
              serverRevisionId: null,
            },
          };
        }

        if (file && file.currentRevisionId !== (change.baseRevisionId ?? null)) {
          return {
            type: 'conflict' as const,
            value: {
              path: change.path,
              reason: 'base_revision_mismatch' as const,
              serverRevisionId: file.currentRevisionId,
            },
          };
        }

        const persistedFile =
          file ??
          (await tx.file.create({
            data: {
              workspaceId: dto.workspaceId,
              path: change.path,
            },
          }));

        const revision = await tx.revision.create({
          data: {
            id: revisionId,
            fileId: persistedFile.id,
            workspaceId: dto.workspaceId,
            deviceId: dto.deviceId,
            parentRevisionId: change.baseRevisionId ?? null,
            kind: RevisionKind.UPSERT,
            isDelete: false,
            contentHash,
            sizeBytes: contentBuffer.byteLength,
            storageKey,
          },
        });

        await tx.file.update({
          where: { id: persistedFile.id },
          data: {
            currentRevisionId: revision.id,
            deleted: false,
          },
        });

        await tx.event.create({
          data: {
            workspaceId: dto.workspaceId,
            deviceId: dto.deviceId,
            fileId: persistedFile.id,
            revisionId: revision.id,
            path: change.path,
            kind: RevisionKind.UPSERT,
          },
        });

        return {
          type: 'accepted' as const,
          value: {
            path: change.path,
            revisionId: revision.id,
          },
        };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

      if (result.type === 'conflict') {
        await this.storageService.delete(storageKey);
      }

      return result;
    } catch (error) {
      await this.storageService.delete(storageKey);
      throw error;
    }
  }

  private async applyDeleteChange(
    dto: PushSyncDto,
    change: PushSyncDto['changes'][number] & { path: string },
  ): Promise<
    | { type: 'accepted'; value: PushAcceptedChange }
    | { type: 'conflict'; value: PushConflictChange }
  > {
    return this.prisma.$transaction(async (tx) => {
      const file = await tx.file.findUnique({
        where: {
          workspaceId_path: {
            workspaceId: dto.workspaceId,
            path: change.path,
          },
        },
      });

      if (!file) {
        return {
          type: 'conflict' as const,
          value: {
            path: change.path,
            reason: 'file_missing' as const,
            serverRevisionId: null,
          },
        };
      }

      if (file.currentRevisionId !== (change.baseRevisionId ?? null)) {
        return {
          type: 'conflict' as const,
          value: {
            path: change.path,
            reason: 'base_revision_mismatch' as const,
            serverRevisionId: file.currentRevisionId,
          },
        };
      }

      const revision = await tx.revision.create({
        data: {
          fileId: file.id,
          workspaceId: dto.workspaceId,
          deviceId: dto.deviceId,
          parentRevisionId: change.baseRevisionId ?? null,
          kind: RevisionKind.DELETE,
          isDelete: true,
        },
      });

      await tx.file.update({
        where: { id: file.id },
        data: {
          currentRevisionId: revision.id,
          deleted: true,
        },
      });

      await tx.event.create({
        data: {
          workspaceId: dto.workspaceId,
          deviceId: dto.deviceId,
          fileId: file.id,
          revisionId: revision.id,
          path: change.path,
          kind: RevisionKind.DELETE,
        },
      });

      return {
        type: 'accepted' as const,
        value: {
          path: change.path,
          revisionId: revision.id,
        },
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private async assertWorkspaceAndDevice(workspaceId: string, deviceId: string): Promise<void> {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      select: {
        id: true,
        workspaceId: true,
      },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    if (device.workspaceId !== workspaceId) {
      throw new BadRequestException('Device does not belong to the provided workspace');
    }
  }
}
