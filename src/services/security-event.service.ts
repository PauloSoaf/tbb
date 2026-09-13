import { prisma } from "@/lib/prisma";

export interface SecurityEventFilters {
  tenantId: string;
  severity?: string;
  status?: string;
}

export const securityEventService = {
  async listEvents(filters: SecurityEventFilters) {
    const where: { tenantId: string; severity?: string; status?: string } = {
      tenantId: filters.tenantId,
    };
    if (filters.severity && filters.severity !== "ALL") {
      where.severity = filters.severity;
    }
    if (filters.status && filters.status !== "ALL") {
      where.status = filters.status;
    }

    return await prisma.securityEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  },

  async acknowledgeEvent(tenantId: string, eventId: string) {
    const event = await prisma.securityEvent.findFirst({
      where: { id: eventId, tenantId },
    });
    if (!event) throw new Error("Alerta de segurança não encontrado.");

    return await prisma.securityEvent.update({
      where: { id: eventId },
      data: { status: "ACKNOWLEDGED" },
    });
  },

  async resolveEvent(tenantId: string, eventId: string) {
    const event = await prisma.securityEvent.findFirst({
      where: { id: eventId, tenantId },
    });
    if (!event) throw new Error("Alerta de segurança não encontrado.");

    return await prisma.securityEvent.update({
      where: { id: eventId },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });
  },
};
