import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as ics from "ics";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return new NextResponse("Token de calendário inválido ou ausente.", { status: 401 });
  }

  try {
    // 1. Busca a nutricionista pelo calendarToken único
    const nutritionist = await prisma.nutritionist.findUnique({
      where: { calendarToken: token },
      select: { id: true, name: true, email: true },
    });

    if (!nutritionist) {
      return new NextResponse("Calendário não encontrado.", { status: 404 });
    }

    // 2. Busca todas as consultas (não canceladas) dos últimos 30 dias + próximos 90 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const ninetyDaysAhead = new Date();
    ninetyDaysAhead.setDate(ninetyDaysAhead.getDate() + 90);

    const appointments = await prisma.appointment.findMany({
      where: {
        nutritionistId: nutritionist.id,
        status: { not: "CANCELED" },
        date: { gte: thirtyDaysAgo, lte: ninetyDaysAhead },
      },
      include: {
        patient: { select: { name: true, email: true } },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    // 3. Monta os eventos iCal
    const events: ics.EventAttributes[] = appointments.map((appt) => {
      const date = new Date(appt.date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();

      // Parse startTime "14:30" → hora e minuto (BUG-003: guard for empty string / NaN)
      let startHour = 9;
      let startMinute = 0;
      if (appt.startTime && /^\d{1,2}:\d{2}$/.test(appt.startTime.trim())) {
        const parts = appt.startTime.trim().split(":");
        const h = parseInt(parts[0]!, 10);
        const m = parseInt(parts[1]!, 10);
        if (!isNaN(h) && !isNaN(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59) {
          startHour = h;
          startMinute = m;
        }
      }

      // Parse endTime para duração (BUG-003: same guard)
      let durationMinutes = 60;
      if (appt.endTime && /^\d{1,2}:\d{2}$/.test(appt.endTime.trim())) {
        const endParts = appt.endTime.trim().split(":");
        const endHour = parseInt(endParts[0]!, 10);
        const endMinute = parseInt(endParts[1]!, 10);
        if (!isNaN(endHour) && !isNaN(endMinute)) {
          const totalEnd = endHour * 60 + endMinute;
          const totalStart = startHour * 60 + startMinute;
          if (totalEnd > totalStart) {
            durationMinutes = totalEnd - totalStart;
          }
        }
      }

      const modeLabel = appt.mode === "ONLINE" ? "Online (NutriOpus)" : "Presencial";
      const statusLabel = appt.status === "DONE" ? "CONFIRMED" : "TENTATIVE";

      return {
        title: `Consulta: ${appt.patient.name}`,
        description: [
          `Paciente: ${appt.patient.name}`,
          appt.patient.email ? `Email: ${appt.patient.email}` : "",
          `Modalidade: ${modeLabel}`,
          appt.notes ? `Observações: ${appt.notes}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        start: [year, month, day, startHour, startMinute],
        duration: { minutes: durationMinutes },
        status: statusLabel as ics.EventStatus,
        organizer: { name: nutritionist.name, email: nutritionist.email },
        productId: "NutriOpus/ical",
      };
    });

    // 4. Se não houver consultas, retorna calendário vazio com um evento placeholder
    if (events.length === 0) {
      const now = new Date();
      events.push({
        title: "Agenda NutriOpus — Sem consultas no período",
        description: "Nenhuma consulta agendada nos próximos 90 dias.",
        start: [now.getFullYear(), now.getMonth() + 1, now.getDate(), 9, 0],
        duration: { hours: 1 },
        productId: "NutriOpus/ical",
      });
    }

    // 5. Gera o conteúdo .ics
    const { error, value } = ics.createEvents(events);

    if (error || !value) {
      console.error("Erro ao gerar iCal:", error);
      return new NextResponse("Erro ao formatar calendário", { status: 500 });
    }

    // 6. Retorna o arquivo .ics com headers corretos
    return new NextResponse(value, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="nutriopus-agenda.ics"',
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (err) {
    console.error("Calendar Sync Error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
