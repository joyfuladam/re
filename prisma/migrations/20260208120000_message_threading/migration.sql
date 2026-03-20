-- CreateEnum
CREATE TYPE "MessageThreadType" AS ENUM ('direct', 'group', 'song_scoped', 'org_wide', 'work_collab');

-- AlterTable
ALTER TABLE "MessageThread" ADD COLUMN "threadType" "MessageThreadType" NOT NULL DEFAULT 'group';

CREATE INDEX "MessageThread_threadType_idx" ON "MessageThread"("threadType");

-- AlterTable
ALTER TABLE "Message" ADD COLUMN "parentMessageId" TEXT,
ADD COLUMN "rootMessageId" TEXT;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_parentMessageId_fkey" FOREIGN KEY ("parentMessageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Message_parentMessageId_idx" ON "Message"("parentMessageId");
CREATE INDEX "Message_rootMessageId_idx" ON "Message"("rootMessageId");
