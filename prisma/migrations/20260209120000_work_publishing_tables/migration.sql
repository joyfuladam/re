-- AlterTable
ALTER TABLE "Work" ADD COLUMN     "publishingLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publishingLockedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "WorkCollaborator" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "collaboratorId" TEXT NOT NULL,
    "roleInWork" "CollaboratorRole" NOT NULL,
    "publishingOwnership" DECIMAL(5,4),
    "addedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkPublishingEntity" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "publishingEntityId" TEXT NOT NULL,
    "ownershipPercentage" DECIMAL(5,4) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkPublishingEntity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkCollaborator_workId_idx" ON "WorkCollaborator"("workId");

-- CreateIndex
CREATE INDEX "WorkCollaborator_collaboratorId_idx" ON "WorkCollaborator"("collaboratorId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkCollaborator_workId_collaboratorId_roleInWork_key" ON "WorkCollaborator"("workId", "collaboratorId", "roleInWork");

-- CreateIndex
CREATE INDEX "WorkPublishingEntity_workId_idx" ON "WorkPublishingEntity"("workId");

-- CreateIndex
CREATE INDEX "WorkPublishingEntity_publishingEntityId_idx" ON "WorkPublishingEntity"("publishingEntityId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkPublishingEntity_workId_publishingEntityId_key" ON "WorkPublishingEntity"("workId", "publishingEntityId");

-- AddForeignKey
ALTER TABLE "WorkCollaborator" ADD CONSTRAINT "WorkCollaborator_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkCollaborator" ADD CONSTRAINT "WorkCollaborator_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "Collaborator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkPublishingEntity" ADD CONSTRAINT "WorkPublishingEntity_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkPublishingEntity" ADD CONSTRAINT "WorkPublishingEntity_publishingEntityId_fkey" FOREIGN KEY ("publishingEntityId") REFERENCES "PublishingEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
