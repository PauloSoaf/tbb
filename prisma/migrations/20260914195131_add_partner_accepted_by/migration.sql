-- AlterTable
ALTER TABLE "PartnerConnection" ADD COLUMN     "acceptedByUserId" TEXT;

-- AddForeignKey
ALTER TABLE "PartnerConnection" ADD CONSTRAINT "PartnerConnection_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
