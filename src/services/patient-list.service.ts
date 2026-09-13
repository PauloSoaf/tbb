import { prisma } from "@/lib/prisma";

export async function getPatientsStats(nutritionistId: string) {
  const now = new Date();

  const [
    totalPatients,
    activePatients,
    patientsWithoutPlan,
    patientsWithUpcomingAppointments,
  ] = await Promise.all([
    // Total
    prisma.patient.count({
      where: { nutritionistId, status: { not: "ARCHIVED" } },
    }),
    
    // Ativos
    prisma.patient.count({
      where: { nutritionistId, status: "ACTIVE" },
    }),
    
    // Sem plano ativo (não tem plano ou o plano expirou/não está ativo)
    // Para simplificar: pacientes que não possuem nenhum mealPlan ou possuem mas nenhum ativo
    prisma.patient.count({
      where: {
        nutritionistId,
        status: "ACTIVE",
        mealPlans: {
          none: {}
        }
      }
    }),

    // Consulta Futura
    prisma.patient.count({
      where: {
        nutritionistId,
        appointments: {
          some: {
            date: { gte: now },
            status: "SCHEDULED"
          }
        }
      }
    })
  ]);

  return {
    totalPatients,
    activePatients,
    patientsWithoutPlan,
    patientsWithUpcomingAppointments,
  };
}
