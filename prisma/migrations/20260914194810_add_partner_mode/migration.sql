-- CreateEnum
CREATE TYPE "PartnerConnectionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED', 'BLOCKED');

-- CreateTable
CREATE TABLE "PartnerConnection" (
    "id" TEXT NOT NULL,
    "requesterWorkspaceId" TEXT NOT NULL,
    "receiverWorkspaceId" TEXT,
    "requestedByUserId" TEXT NOT NULL,
    "status" "PartnerConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "inviteTokenHash" TEXT,
    "inviteExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "PartnerConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerSharingPolicy" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "ownerWorkspaceId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerSharingPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PartnerConnection_inviteTokenHash_key" ON "PartnerConnection"("inviteTokenHash");

-- CreateIndex
CREATE INDEX "PartnerConnection_requesterWorkspaceId_status_idx" ON "PartnerConnection"("requesterWorkspaceId", "status");

-- CreateIndex
CREATE INDEX "PartnerConnection_receiverWorkspaceId_status_idx" ON "PartnerConnection"("receiverWorkspaceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerSharingPolicy_connectionId_ownerWorkspaceId_module_key" ON "PartnerSharingPolicy"("connectionId", "ownerWorkspaceId", "module");

-- AddForeignKey
ALTER TABLE "PartnerConnection" ADD CONSTRAINT "PartnerConnection_requesterWorkspaceId_fkey" FOREIGN KEY ("requesterWorkspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerConnection" ADD CONSTRAINT "PartnerConnection_receiverWorkspaceId_fkey" FOREIGN KEY ("receiverWorkspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerConnection" ADD CONSTRAINT "PartnerConnection_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerSharingPolicy" ADD CONSTRAINT "PartnerSharingPolicy_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "PartnerConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerSharingPolicy" ADD CONSTRAINT "PartnerSharingPolicy_ownerWorkspaceId_fkey" FOREIGN KEY ("ownerWorkspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
