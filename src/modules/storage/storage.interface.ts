export interface SaveRevisionContentInput {
  workspaceId: string;
  revisionId: string;
  content: Buffer;
}

export interface StorageService {
  saveRevisionContent(input: SaveRevisionContentInput): Promise<string>;
  readRevisionContent(storageKey: string): Promise<Buffer>;
  exists(storageKey: string): Promise<boolean>;
  delete(storageKey: string): Promise<void>;
}
