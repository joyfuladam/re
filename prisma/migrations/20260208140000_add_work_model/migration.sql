-- CreateTable
CREATE TABLE "Work" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "iswcCode" TEXT,
    "labelPublishingShare" DECIMAL(5,4) NOT NULL DEFAULT 0.5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Work_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Work_iswcCode_key" ON "Work"("iswcCode");

-- AlterTable
ALTER TABLE "Song" ADD COLUMN "workId" TEXT;

-- CreateIndex
CREATE INDEX "Song_workId_idx" ON "Song"("workId");

-- AddForeignKey
ALTER TABLE "Song" ADD CONSTRAINT "Song_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE SET NULL ON UPDATE CASCADE;
