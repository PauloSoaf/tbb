import { z } from "zod";

export const appointmentSchema = z.object({
  patientId: z.string().min(1, "Paciente é obrigatório"),
  date: z.string().min(1, "Data é obrigatória"),
  startTime: z.string().min(1, "Horário de início é obrigatório"),
  endTime: z.string().optional().or(z.literal("")),
  mode: z.enum(["ONLINE", "PRESENTIAL"], {
    message: "Modalidade inválida",
  }),
  status: z.enum(["SCHEDULED", "DONE", "CANCELED"]).optional().default("SCHEDULED"),
  notes: z.string().optional().or(z.literal("")),
});

export type AppointmentInput = z.infer<typeof appointmentSchema>;
