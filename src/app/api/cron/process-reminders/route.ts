import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage } from "@/services/whatsapp.service";
import { nextSendAtFromFrequency } from "@/services/goals.service";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("Authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const now = new Date();
    
    // Busca lembretes ativos que devem ser enviados AGORA ou que estão atrasados
    const dueReminders = await prisma.patientReminder.findMany({
      where: {
        isActive: true,
        nextSendAt: {
          lte: now,
        },
      },
      include: {
        patient: {
          select: { id: true, name: true, phone: true }
        }
      }
    });

    const results = [];

    for (const reminder of dueReminders) {
      if (!reminder.patient.phone) {
        results.push({ id: reminder.id, status: "skipped", reason: "No phone number" });
        continue;
      }

      const text = `*Lembrete NutriOpus*\n\nOlá, ${reminder.patient.name}!\n\nLembre-se de: *${reminder.title}*`;
      
      const sent = await sendWhatsAppMessage(reminder.patient.phone, text);

      if (sent.success) {
        // Atualiza a próxima data de envio baseado na frequência
        const nextDate = nextSendAtFromFrequency(reminder.frequency);
        
        await prisma.patientReminder.update({
          where: { id: reminder.id },
          data: {
            nextSendAt: nextDate,
          }
        });

        results.push({ id: reminder.id, status: "success", nextSendAt: nextDate });
      } else {
        results.push({ id: reminder.id, status: "failed", error: sent.error });
      }
    }

    return NextResponse.json({ 
      processed: dueReminders.length,
      successCount: results.filter(r => r.status === "success").length,
      results 
    });
  } catch (error) {
    console.error("Cron Process Reminders Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
