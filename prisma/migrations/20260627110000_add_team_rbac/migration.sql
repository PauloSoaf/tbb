-- CreateEnum
CREATE TYPE "TeamMemberRole" AS ENUM ('ADMIN', 'EDITOR', 'VIEWER');
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "nutritionistId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "TeamMemberRole" NOT NULL DEFAULT 'VIEWER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_invites" (
    "id" TEXT NOT NULL,
    "nutritionistId" TEXT NOT NULL,
    "teamMemberId" TEXT,
    "email" TEXT NOT NULL,
    "role" "TeamMemberRole" NOT NULL DEFAULT 'VIEWER',
    "token" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "team_members_nutritionistId_email_key" ON "team_members"("nutritionistId", "email");
CREATE INDEX "team_members_nutritionistId_idx" ON "team_members"("nutritionistId");
CREATE UNIQUE INDEX "team_invites_token_key" ON "team_invites"("token");
CREATE INDEX "team_invites_nutritionistId_idx" ON "team_invites"("nutritionistId");
CREATE INDEX "team_invites_token_idx" ON "team_invites"("token");
CREATE INDEX "team_invites_email_idx" ON "team_invites"("email");

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_nutritionistId_fkey" FOREIGN KEY ("nutritionistId") REFERENCES "nutritionists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_nutritionistId_fkey" FOREIGN KEY ("nutritionistId") REFERENCES "nutritionists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "team_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
