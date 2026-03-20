-- CreateEnum
CREATE TYPE "RevisionKind" AS ENUM ('UPSERT', 'DELETE');

-- CreateTable
CREATE TABLE "workspaces" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "tokenHash" VARCHAR(255) NOT NULL,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "path" VARCHAR(1024) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "currentRevisionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revisions" (
    "id" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "parentRevisionId" UUID,
    "kind" "RevisionKind" NOT NULL,
    "isDelete" BOOLEAN NOT NULL,
    "contentHash" VARCHAR(128),
    "sizeBytes" INTEGER,
    "storageKey" VARCHAR(1024),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "seq" BIGSERIAL NOT NULL,
    "workspaceId" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "revisionId" UUID NOT NULL,
    "path" VARCHAR(1024) NOT NULL,
    "kind" "RevisionKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "events_pkey" PRIMARY KEY ("seq")
);

-- CreateIndex
CREATE INDEX "devices_workspaceId_idx" ON "devices"("workspaceId");
CREATE UNIQUE INDEX "files_currentRevisionId_key" ON "files"("currentRevisionId");
CREATE UNIQUE INDEX "files_workspaceId_path_key" ON "files"("workspaceId", "path");
CREATE INDEX "files_workspaceId_deleted_idx" ON "files"("workspaceId", "deleted");
CREATE INDEX "revisions_fileId_createdAt_idx" ON "revisions"("fileId", "createdAt");
CREATE INDEX "revisions_workspaceId_createdAt_idx" ON "revisions"("workspaceId", "createdAt");
CREATE INDEX "revisions_deviceId_createdAt_idx" ON "revisions"("deviceId", "createdAt");
CREATE INDEX "events_workspaceId_seq_idx" ON "events"("workspaceId", "seq");
CREATE INDEX "events_workspaceId_createdAt_idx" ON "events"("workspaceId", "createdAt");

-- AddForeignKey
ALTER TABLE "devices"
  ADD CONSTRAINT "devices_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "files"
  ADD CONSTRAINT "files_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "revisions"
  ADD CONSTRAINT "revisions_fileId_fkey"
  FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "revisions"
  ADD CONSTRAINT "revisions_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "revisions"
  ADD CONSTRAINT "revisions_deviceId_fkey"
  FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "revisions"
  ADD CONSTRAINT "revisions_parentRevisionId_fkey"
  FOREIGN KEY ("parentRevisionId") REFERENCES "revisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "files"
  ADD CONSTRAINT "files_currentRevisionId_fkey"
  FOREIGN KEY ("currentRevisionId") REFERENCES "revisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "events"
  ADD CONSTRAINT "events_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "events"
  ADD CONSTRAINT "events_deviceId_fkey"
  FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "events"
  ADD CONSTRAINT "events_fileId_fkey"
  FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "events"
  ADD CONSTRAINT "events_revisionId_fkey"
  FOREIGN KEY ("revisionId") REFERENCES "revisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
