/**
 * Backfills the `StorageFile` ledger with files that were uploaded BEFORE
 * the ledger existed (documents, meal-plan template files, profile photos,
 * transcription audio). Safe to run more than once — skips any URL already
 * present in the ledger.
 *
 * When the owning row doesn't store a size (profile photos have none;
 * transcription audio predates `audioSizeBytes` in some rows), this script
 * tries a HEAD request against the file URL to read `content-length`. If
 * that also fails (deleted file, non-HTTP local path, network error), the
 * row is created with `sizeBytes = 0` and reported separately so an admin
 * can decide what to do with it — this script never guesses a size.
 *
 * Usage: npx tsx scripts/backfill-storage-ledger.ts [--dry-run]
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");

interface BackfillCounts {
  created: number;
  alreadyInLedger: number;
  sizeUnknown: number;
}

async function headContentLength(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    if (!res.ok) return null;
    const len = res.headers.get("content-length");
    return len ? Number(len) : null;
  } catch {
    return null;
  }
}

async function ledgerHasUrl(url: string): Promise<boolean> {
  const existing = await prisma.storageFile.findFirst({ where: { url }, select: { id: true } });
  return !!existing;
}

async function createLedgerRow(
  counts: BackfillCounts,
  data: { tenantId: string; url: string; sizeBytes: number | null; purpose: string; resourceId?: string }
) {
  if (await ledgerHasUrl(data.url)) {
    counts.alreadyInLedger += 1;
    return;
  }

  let sizeBytes = data.sizeBytes;
  if (sizeBytes === null || sizeBytes === undefined) {
    sizeBytes = await headContentLength(data.url);
    if (sizeBytes === null) {
      counts.sizeUnknown += 1;
      sizeBytes = 0;
    }
  }

  if (!DRY_RUN) {
    await prisma.storageFile.create({
      data: {
        tenantId: data.tenantId,
        url: data.url,
        sizeBytes,
        purpose: data.purpose,
        resourceId: data.resourceId,
      },
    });
  }
  counts.created += 1;
}

async function backfillDocuments(): Promise<BackfillCounts> {
  const counts: BackfillCounts = { created: 0, alreadyInLedger: 0, sizeUnknown: 0 };
  const documents = await prisma.document.findMany({
    select: { nutritionistId: true, patientId: true, fileUrl: true, size: true },
  });
  for (const doc of documents) {
    await createLedgerRow(counts, {
      tenantId: doc.nutritionistId,
      url: doc.fileUrl,
      sizeBytes: doc.size,
      purpose: "patient-document",
      resourceId: doc.patientId,
    });
  }
  return counts;
}

async function backfillTemplates(): Promise<BackfillCounts> {
  const counts: BackfillCounts = { created: 0, alreadyInLedger: 0, sizeUnknown: 0 };
  const templates = await prisma.template.findMany({
    where: { type: "FILE", fileUrl: { not: null } },
    select: { nutritionistId: true, fileUrl: true, size: true },
  });
  for (const tpl of templates) {
    if (!tpl.fileUrl) continue;
    await createLedgerRow(counts, {
      tenantId: tpl.nutritionistId,
      url: tpl.fileUrl,
      sizeBytes: tpl.size,
      purpose: "meal-template-file",
    });
  }
  return counts;
}

async function backfillProfilePhotos(): Promise<BackfillCounts> {
  const counts: BackfillCounts = { created: 0, alreadyInLedger: 0, sizeUnknown: 0 };
  const nutritionists = await prisma.nutritionist.findMany({
    where: { profileImageUrl: { not: null } },
    select: { id: true, profileImageUrl: true },
  });
  for (const n of nutritionists) {
    if (!n.profileImageUrl) continue;
    await createLedgerRow(counts, {
      tenantId: n.id,
      url: n.profileImageUrl,
      sizeBytes: null, // never stored for profile photos — always HEAD-checked
      purpose: "nutritionist-profile-photo",
    });
  }
  return counts;
}

async function backfillTranscriptionAudio(): Promise<BackfillCounts> {
  const counts: BackfillCounts = { created: 0, alreadyInLedger: 0, sizeUnknown: 0 };
  const transcriptions = await prisma.consultationTranscription.findMany({
    where: { audioUrl: { not: null } },
    select: { nutritionistId: true, patientId: true, audioUrl: true, audioSizeBytes: true },
  });
  for (const t of transcriptions) {
    if (!t.audioUrl) continue;
    await createLedgerRow(counts, {
      tenantId: t.nutritionistId,
      url: t.audioUrl,
      sizeBytes: t.audioSizeBytes,
      purpose: "transcription-audio",
      resourceId: t.patientId,
    });
  }
  return counts;
}

function mergeCounts(a: BackfillCounts, b: BackfillCounts): BackfillCounts {
  return {
    created: a.created + b.created,
    alreadyInLedger: a.alreadyInLedger + b.alreadyInLedger,
    sizeUnknown: a.sizeUnknown + b.sizeUnknown,
  };
}

async function main() {
  console.log(`Starting storage ledger backfill${DRY_RUN ? " (DRY RUN — no writes)" : ""}...`);

  const results = {
    documents: await backfillDocuments(),
    templates: await backfillTemplates(),
    profilePhotos: await backfillProfilePhotos(),
    transcriptionAudio: await backfillTranscriptionAudio(),
  };

  console.log("\nResults by source:");
  for (const [source, counts] of Object.entries(results)) {
    console.log(
      `  ${source}: +${counts.created} created, ${counts.alreadyInLedger} already in ledger, ${counts.sizeUnknown} with unknown size (set to 0)`
    );
  }

  const total = Object.values(results).reduce(mergeCounts, { created: 0, alreadyInLedger: 0, sizeUnknown: 0 });
  console.log(
    `\nTotal: +${total.created} created, ${total.alreadyInLedger} already in ledger, ${total.sizeUnknown} unknown size.`
  );
  if (total.sizeUnknown > 0) {
    console.log(
      `\n${total.sizeUnknown} row(s) were created with sizeBytes=0 because neither the DB nor a HEAD request` +
        ` could determine their size. Run the reconciliation report in /admin/storage to find and review them` +
        ` (WHERE sizeBytes = 0 AND createdAt is old is a reasonable filter).`
    );
  }
  if (DRY_RUN) {
    console.log("\nThis was a dry run — nothing was written. Re-run without --dry-run to apply.");
  }
}

main()
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
