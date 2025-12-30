-- CreateEnum
CREATE TYPE "CollaboratorRole" AS ENUM ('musician', 'writer', 'producer', 'artist', 'label');

-- CreateEnum
CREATE TYPE "MasterRevenueScope" AS ENUM ('digital_only', 'full');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('digital_master_only', 'songwriter_publishing', 'producer_agreement', 'label_record');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('pending', 'signed', 'expired');

-- CreateEnum
CREATE TYPE "SplitType" AS ENUM ('publishing', 'master');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'collaborator');

-- CreateTable
CREATE TABLE "Collaborator" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "password" TEXT,
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'collaborator',
    "phone" TEXT,
    "address" TEXT,
    "capableRoles" "CollaboratorRole"[],
    "proAffiliation" TEXT,
    "ipiNumber" TEXT,
    "taxId" TEXT,
    "publishingCompany" TEXT,
    "managerName" TEXT,
    "managerEmail" TEXT,
    "managerPhone" TEXT,
    "royaltyAccountInfo" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collaborator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "collaboratorId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "collaboratorId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Song" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isrcCode" TEXT,
    "catalogNumber" TEXT,
    "releaseDate" TIMESTAMP(3),
    "proWorkRegistrationNumber" TEXT,
    "publishingAdmin" TEXT,
    "masterOwner" TEXT,
    "genre" TEXT,
    "subGenre" TEXT,
    "duration" INTEGER,
    "recordingDate" TIMESTAMP(3),
    "recordingLocation" TEXT,
    "publishingLocked" BOOLEAN NOT NULL DEFAULT false,
    "publishingLockedAt" TIMESTAMP(3),
    "masterLocked" BOOLEAN NOT NULL DEFAULT false,
    "masterLockedAt" TIMESTAMP(3),
    "labelMasterShare" DECIMAL(5,4),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Song_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SongCollaborator" (
    "id" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "collaboratorId" TEXT NOT NULL,
    "roleInSong" "CollaboratorRole" NOT NULL,
    "publishingOwnership" DECIMAL(5,4),
    "masterOwnership" DECIMAL(5,4),
    "contractStatus" "ContractStatus" NOT NULL DEFAULT 'pending',
    "contractType" "ContractType",
    "notes" TEXT,
    "addedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SongCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublishingEntity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "address" TEXT,
    "proAffiliation" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublishingEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SongPublishingEntity" (
    "id" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "publishingEntityId" TEXT NOT NULL,
    "ownershipPercentage" DECIMAL(5,4) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SongPublishingEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "collaboratorId" TEXT NOT NULL,
    "songCollaboratorId" TEXT NOT NULL,
    "templateType" "ContractType" NOT NULL,
    "pdfPath" TEXT,
    "pdfUrl" TEXT,
    "esignatureStatus" TEXT DEFAULT 'pending',
    "esignatureDocId" TEXT,
    "signerEmail" TEXT,
    "signedAt" TIMESTAMP(3),
    "revenueScope" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ContractType" NOT NULL,
    "content" TEXT NOT NULL,
    "pdfStyling" JSONB,
    "roleRestriction" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SplitHistory" (
    "id" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "splitType" "SplitType" NOT NULL,
    "previousValues" JSONB NOT NULL,
    "newValues" JSONB NOT NULL,
    "changedBy" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SplitHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Collaborator_email_key" ON "Collaborator"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Song_isrcCode_key" ON "Song"("isrcCode");

-- CreateIndex
CREATE INDEX "SongCollaborator_songId_idx" ON "SongCollaborator"("songId");

-- CreateIndex
CREATE INDEX "SongCollaborator_collaboratorId_idx" ON "SongCollaborator"("collaboratorId");

-- CreateIndex
CREATE UNIQUE INDEX "SongCollaborator_songId_collaboratorId_roleInSong_key" ON "SongCollaborator"("songId", "collaboratorId", "roleInSong");

-- CreateIndex
CREATE INDEX "PublishingEntity_name_idx" ON "PublishingEntity"("name");

-- CreateIndex
CREATE INDEX "PublishingEntity_isInternal_idx" ON "PublishingEntity"("isInternal");

-- CreateIndex
CREATE INDEX "SongPublishingEntity_songId_idx" ON "SongPublishingEntity"("songId");

-- CreateIndex
CREATE INDEX "SongPublishingEntity_publishingEntityId_idx" ON "SongPublishingEntity"("publishingEntityId");

-- CreateIndex
CREATE UNIQUE INDEX "SongPublishingEntity_songId_publishingEntityId_key" ON "SongPublishingEntity"("songId", "publishingEntityId");

-- CreateIndex
CREATE INDEX "Contract_songId_idx" ON "Contract"("songId");

-- CreateIndex
CREATE INDEX "Contract_collaboratorId_idx" ON "Contract"("collaboratorId");

-- CreateIndex
CREATE INDEX "Contract_esignatureStatus_idx" ON "Contract"("esignatureStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_songCollaboratorId_templateType_key" ON "Contract"("songCollaboratorId", "templateType");

-- CreateIndex
CREATE UNIQUE INDEX "ContractTemplate_type_key" ON "ContractTemplate"("type");

-- CreateIndex
CREATE INDEX "SplitHistory_songId_idx" ON "SplitHistory"("songId");

-- CreateIndex
CREATE INDEX "SplitHistory_timestamp_idx" ON "SplitHistory"("timestamp");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "Collaborator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "Collaborator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongCollaborator" ADD CONSTRAINT "SongCollaborator_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongCollaborator" ADD CONSTRAINT "SongCollaborator_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "Collaborator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongPublishingEntity" ADD CONSTRAINT "SongPublishingEntity_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongPublishingEntity" ADD CONSTRAINT "SongPublishingEntity_publishingEntityId_fkey" FOREIGN KEY ("publishingEntityId") REFERENCES "PublishingEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_songCollaboratorId_fkey" FOREIGN KEY ("songCollaboratorId") REFERENCES "SongCollaborator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitHistory" ADD CONSTRAINT "SplitHistory_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

