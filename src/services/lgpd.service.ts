import { prisma } from "@/lib/prisma";
import { auditLogService } from "@/services/audit-log.service";
import type { ConsentStatus } from "@prisma/client";

export interface ConsentRecordUIData {
  id: string;
  tenantId: string;
  patientId: string;
  patientName: string;
  consentType: string;
  status: ConsentStatus;
  version: string;
  textSnapshot: string;
  source: string;
  grantedAt: Date;
  revokedAt: Date | null;
}

export interface DataSubjectRequestUIData {
  id: string;
  tenantId: string;
  patientId: string;
  patientName: string;
  type: string;
  status: string;
  requestedAt: Date;
  completedAt: Date | null;
  notes: string | null;
}

export const lgpdService = {
  async listConsentRecords(tenantId: string, patientId?: string): Promise<ConsentRecordUIData[]> {
    const where: { tenantId: string; patientId?: string } = { tenantId };
    if (patientId) where.patientId = patientId;

    const records = await prisma.consentRecord.findMany({
      where,
      orderBy: { grantedAt: "desc" },
      include: { patient: { select: { name: true } } },
    });

    return records.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      patientId: r.patientId,
      patientName: r.patient.name,
      consentType: r.consentType,
      status: r.status,
      version: r.version,
      textSnapshot: r.textSnapshot,
      source: r.source,
      grantedAt: r.grantedAt,
      revokedAt: r.revokedAt,
    }));
  },

  async recordConsent(
    tenantId: string,
    patientId: string,
    consentType: string,
    textSnapshot: string,
    source: string,
    actor: { userId: string; teamMemberId?: string | null; name: string; role: string }
  ) {
    const record = await prisma.consentRecord.create({
      data: {
        tenantId,
        patientId,
        consentType,
        status: "GRANTED",
        version: "v1.0",
        textSnapshot,
        source,
        createdByUserId: actor.userId,
      },
      include: { patient: true },
    });

    await auditLogService.record({
      tenantId,
      actor: {
        userId: actor.userId,
        teamMemberId: actor.teamMemberId,
        name: actor.name,
        role: actor.role,
      },
      action: "lgpd.consent.granted",
      resource: "lgpd",
      resourceId: record.id,
      patientId,
      patientNameSnapshot: record.patient.name,
      result: "SUCCESS",
      changedFields: ["status", "grantedAt"],
      reason: `Consentimento ${consentType} concedido via ${source}`,
    });

    return record;
  },

  async revokeConsent(
    tenantId: string,
    consentId: string,
    actor: { userId: string; teamMemberId?: string | null; name: string; role: string }
  ) {
    const existing = await prisma.consentRecord.findUnique({
      where: { id: consentId },
      include: { patient: true },
    });

    if (!existing || existing.tenantId !== tenantId) {
      throw new Error("Registro de consentimento não encontrado no tenant.");
    }

    const updated = await prisma.consentRecord.update({
      where: { id: consentId },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
      },
    });

    await auditLogService.record({
      tenantId,
      actor: {
        userId: actor.userId,
        teamMemberId: actor.teamMemberId,
        name: actor.name,
        role: actor.role,
      },
      action: "lgpd.consent.revoked",
      resource: "lgpd",
      resourceId: consentId,
      patientId: existing.patientId,
      patientNameSnapshot: existing.patient.name,
      result: "SUCCESS",
      changedFields: ["status", "revokedAt"],
      reason: `Consentimento ${existing.consentType} revogado no sistema`,
    });

    return updated;
  },

  async listDataSubjectRequests(tenantId: string, status?: string): Promise<DataSubjectRequestUIData[]> {
    const where: { tenantId: string; status?: string } = { tenantId };
    if (status && status !== "ALL") where.status = status;

    const requests = await prisma.dataSubjectRequest.findMany({
      where,
      orderBy: { requestedAt: "desc" },
      include: { patient: { select: { name: true } } },
    });

    return requests.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      patientId: r.patientId,
      patientName: r.patient.name,
      type: r.type,
      status: r.status,
      requestedAt: r.requestedAt,
      completedAt: r.completedAt,
      notes: r.notes,
    }));
  },

  async createDataSubjectRequest(
    tenantId: string,
    patientId: string,
    type: "ACCESS" | "EXPORT" | "DELETION",
    notes: string | undefined,
    actor: { userId: string; teamMemberId?: string | null; name: string; role: string }
  ) {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient || patient.nutritionistId !== tenantId) {
      throw new Error("Paciente não encontrado neste tenant.");
    }

    const request = await prisma.dataSubjectRequest.create({
      data: {
        tenantId,
        patientId,
        type,
        status: "PENDING",
        notes: notes || `Solicitação do tipo ${type} aberta`,
        handledByUserId: actor.userId,
      },
    });

    await auditLogService.record({
      tenantId,
      actor: {
        userId: actor.userId,
        teamMemberId: actor.teamMemberId,
        name: actor.name,
        role: actor.role,
      },
      action: "lgpd.request.created",
      resource: "lgpd",
      resourceId: request.id,
      patientId,
      patientNameSnapshot: patient.name,
      result: "SUCCESS",
      reason: `Requisição de titular aberta: ${type}`,
    });

    return request;
  },

  async exportPatientData(
    tenantId: string,
    patientId: string,
    actor: { userId: string; teamMemberId?: string | null; name: string; role: string }
  ) {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        skinfoldAssessments: true,
        anamneseResponses: true,
        appointments: true,
        careSessions: true,
        mealPlans: true,
      },
    });

    if (!patient || patient.nutritionistId !== tenantId) {
      throw new Error("Paciente não encontrado ou não pertence à clínica.");
    }

    const exportBundle = {
      exportedAt: new Date().toISOString(),
      patient: {
        id: patient.id,
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
        birthDate: patient.birthDate,
        gender: patient.gender,
        goal: patient.goal,
      },
      skinfoldAssessments: patient.skinfoldAssessments,
      anamneseResponses: patient.anamneseResponses,
      appointments: patient.appointments,
      careSessions: patient.careSessions,
      mealPlans: patient.mealPlans,
    };

    await auditLogService.record({
      tenantId,
      actor: {
        userId: actor.userId,
        teamMemberId: actor.teamMemberId,
        name: actor.name,
        role: actor.role,
      },
      action: "lgpd.data.exported",
      resource: "patient",
      resourceId: patient.id,
      patientId: patient.id,
      patientNameSnapshot: patient.name,
      result: "SUCCESS",
      reason: "Exportação estruturada de portabilidade de dados (LGPD)",
    });

    return exportBundle;
  },

  async pseudonymizePatient(
    tenantId: string,
    patientId: string,
    actor: { userId: string; teamMemberId?: string | null; name: string; role: string }
  ) {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient || patient.nutritionistId !== tenantId) {
      throw new Error("Paciente não encontrado no tenant.");
    }

    const anonymizedName = `Paciente Anônimo [LGPD Excluído #${patientId.slice(-6)}]`;
    const anonymizedPhone = `ANON_${patientId.slice(-10)}_${Date.now().toString().slice(-4)}`;

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.patient.update({
        where: { id: patientId },
        data: {
          name: anonymizedName,
          email: null,
          phone: anonymizedPhone,
          birthDate: null,
          gender: "Prefer not to say",
          goal: "Excluído LGPD",
          status: "ARCHIVED",
        },
      });

      await tx.dataSubjectRequest.updateMany({
        where: { patientId, tenantId, type: "DELETION", status: "PENDING" },
        data: { status: "COMPLETED", completedAt: new Date() },
      });

      return p;
    });

    await auditLogService.record({
      tenantId,
      actor: {
        userId: actor.userId,
        teamMemberId: actor.teamMemberId,
        name: actor.name,
        role: actor.role,
      },
      action: "patient.delete",
      resource: "patient",
      resourceId: patientId,
      patientId,
      patientNameSnapshot: patient.name,
      result: "SUCCESS",
      changedFields: ["name", "email", "phone", "birthDate", "status"],
      reason: "Exclusão / Pseudonimização irreversível por requisição LGPD do titular",
    });

    return updated;
  },
};
