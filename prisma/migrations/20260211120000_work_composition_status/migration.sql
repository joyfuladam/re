-- CreateEnum
CREATE TYPE "WorkCompositionStatus" AS ENUM ('in_progress', 'finalized');

-- AlterTable
ALTER TABLE "Work" ADD COLUMN "compositionStatus" "WorkCompositionStatus" NOT NULL DEFAULT 'in_progress';

-- Existing catalog compositions were created before this lifecycle field; treat as finalized.
UPDATE "Work" SET "compositionStatus" = 'finalized';
