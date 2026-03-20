-- AlterTable
ALTER TABLE "MessageThread" ADD COLUMN "workId" TEXT;

-- CreateIndex
CREATE INDEX "MessageThread_workId_idx" ON "MessageThread"("workId");

-- AddForeignKey
ALTER TABLE "MessageThread" ADD CONSTRAINT "MessageThread_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE SET NULL ON UPDATE CASCADE;
