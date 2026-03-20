import { RevisionKind } from '@prisma/client';

export interface PushAcceptedChange {
  path: string;
  revisionId: string;
}

export interface PushConflictChange {
  path: string;
  reason: 'base_revision_mismatch' | 'file_missing' | 'workspace_mismatch';
  serverRevisionId: string | null;
}

export interface PullChangeResponse {
  seq: number;
  path: string;
  kind: Lowercase<RevisionKind>;
  revisionId: string;
  contentHash?: string | null;
  sizeBytes?: number | null;
  contentBase64?: string;
}
