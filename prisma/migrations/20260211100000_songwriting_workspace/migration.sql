-- AlterEnum
ALTER TYPE "MessageThreadType" ADD VALUE 'songwriting';

-- AlterTable
ALTER TABLE "Song" ADD COLUMN "songwritingLyricsJson" JSONB;
