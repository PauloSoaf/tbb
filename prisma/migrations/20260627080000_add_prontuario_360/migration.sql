-- CreateEnum
CREATE TYPE "PatientTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'CANCELED');

-- CreateEnum
CREATE TYPE "PatientTaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "patient_notes" (
    "id" TEXT NOT NULL,
    "nutritionistId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_tags" (
    "id" TEXT NOT NULL,
    "nutritionistId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_tasks" (
    "id" TEXT NOT NULL,
    "nutritionistId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "PatientTaskStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "PatientTaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_note_tags" (
    "noteId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "patient_note_tags_pkey" PRIMARY KEY ("noteId","tagId")
);

-- CreateIndex
CREATE INDEX "patient_notes_nutritionistId_idx" ON "patient_notes"("nutritionistId");
CREATE INDEX "patient_notes_patientId_idx" ON "patient_notes"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "patient_tags_nutritionistId_patientId_label_key" ON "patient_tags"("nutritionistId", "patientId", "label");
CREATE INDEX "patient_tags_nutritionistId_idx" ON "patient_tags"("nutritionistId");
CREATE INDEX "patient_tags_patientId_idx" ON "patient_tags"("patientId");

-- CreateIndex
CREATE INDEX "patient_tasks_nutritionistId_idx" ON "patient_tasks"("nutritionistId");
CREATE INDEX "patient_tasks_patientId_idx" ON "patient_tasks"("patientId");
CREATE INDEX "patient_tasks_status_idx" ON "patient_tasks"("status");

-- AddForeignKey
ALTER TABLE "patient_notes" ADD CONSTRAINT "patient_notes_nutritionistId_fkey" FOREIGN KEY ("nutritionistId") REFERENCES "nutritionists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "patient_notes" ADD CONSTRAINT "patient_notes_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_tags" ADD CONSTRAINT "patient_tags_nutritionistId_fkey" FOREIGN KEY ("nutritionistId") REFERENCES "nutritionists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "patient_tags" ADD CONSTRAINT "patient_tags_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_tasks" ADD CONSTRAINT "patient_tasks_nutritionistId_fkey" FOREIGN KEY ("nutritionistId") REFERENCES "nutritionists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "patient_tasks" ADD CONSTRAINT "patient_tasks_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_note_tags" ADD CONSTRAINT "patient_note_tags_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "patient_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "patient_note_tags" ADD CONSTRAINT "patient_note_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "patient_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
