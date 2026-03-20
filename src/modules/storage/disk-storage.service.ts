import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { dirname, join, resolve } from 'path';
import { DomainError } from '../../common/errors/domain-error';
import { SaveRevisionContentInput, StorageService } from './storage.interface';

@Injectable()
export class DiskStorageService implements StorageService {
  private readonly storageRoot: string;

  constructor(private readonly configService: ConfigService) {
    this.storageRoot = resolve(this.configService.getOrThrow<string>('storage.root'));
  }

  async saveRevisionContent(input: SaveRevisionContentInput): Promise<string> {
    const storageKey = `${input.workspaceId}/${input.revisionId}`;
    const absolutePath = this.resolveStoragePath(storageKey);

    await fs.mkdir(dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, input.content, { flag: 'wx' }).catch(async (error: NodeJS.ErrnoException) => {
      if (error.code === 'EEXIST') {
        await fs.writeFile(absolutePath, input.content, { flag: 'w' });
        return;
      }

      throw error;
    });

    return storageKey;
  }

  async readRevisionContent(storageKey: string): Promise<Buffer> {
    const absolutePath = this.resolveStoragePath(storageKey);
    return fs.readFile(absolutePath);
  }

  async exists(storageKey: string): Promise<boolean> {
    try {
      await fs.access(this.resolveStoragePath(storageKey));
      return true;
    } catch {
      return false;
    }
  }

  async delete(storageKey: string): Promise<void> {
    try {
      await fs.unlink(this.resolveStoragePath(storageKey));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  private resolveStoragePath(storageKey: string): string {
    const absolutePath = resolve(this.storageRoot, storageKey);
    if (!absolutePath.startsWith(this.storageRoot)) {
      throw new DomainError('INVALID_STORAGE_KEY', 'Storage path escapes configured root', 400, {
        storageKey,
      });
    }

    return absolutePath;
  }
}
