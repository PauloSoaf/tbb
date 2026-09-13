import { resend } from "@/lib/mail/resend";
import { getTeamInviteTemplate } from "@/lib/mail/templates/TeamInviteTemplate";
import { getAppointmentConfirmTemplate } from "@/lib/mail/templates/AppointmentConfirmTemplate";
import { getWelcomePatientTemplate } from "@/lib/mail/templates/WelcomePatientTemplate";
import { getNewAnamneseTemplate } from "@/lib/mail/templates/NewAnamneseTemplate";

const SENDER_EMAIL = "no-reply@nutriopus.com";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[EMAIL SIMULADO] Para: ${to} | Assunto: ${subject}`);
    return { success: true, simulated: true };
  }

  try {
    const data = await resend.emails.send({
      from: SENDER_EMAIL,
      to,
      subject,
      html,
    });
    return { success: true, data };
  } catch (error) {
    console.error("Erro ao enviar email via Resend:", error);
    return { success: false, error };
  }
}

export async function sendTeamInviteEmail(email: string, inviteUrl: string, clinicName: string) {
  const html = getTeamInviteTemplate({ clinicName, inviteUrl });
  return sendEmail({
    to: email,
    subject: `Convite para participar da clínica ${clinicName} no NutriOpus`,
    html,
  });
}

export async function sendWelcomePatientEmail(params: {
  patientEmail: string;
  patientName: string;
  nutritionistName: string;
  tenantSlug: string;
  activationUrl?: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nutriopus.com.br";
  const portalUrl = `${appUrl}/portal/${params.tenantSlug}`;
  const html = getWelcomePatientTemplate({
    patientName: params.patientName,
    nutritionistName: params.nutritionistName,
    portalUrl,
    activationUrl: params.activationUrl,
  });
  return sendEmail({
    to: params.patientEmail,
    subject: `Bem-vinda ao NutriOpus, ${params.patientName}!`,
    html,
  });
}

export async function sendNewAnamneseNotificationEmail(params: {
  nutritionistEmail: string;
  nutritionistName: string;
  patientName: string;
  patientPhone: string;
  tenantSlug: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nutriopus.com.br";
  const dashboardUrl = `${appUrl}/dashboard/${params.tenantSlug}`;
  const html = getNewAnamneseTemplate({
    nutritionistName: params.nutritionistName,
    patientName: params.patientName,
    patientPhone: params.patientPhone,
    dashboardUrl,
  });
  return sendEmail({
    to: params.nutritionistEmail,
    subject: `📋 Nova pré-consulta recebida de ${params.patientName}`,
    html,
  });
}

export async function sendAppointmentConfirmEmail(params: {
  patientEmail: string;
  patientName: string;
  nutritionistName: string;
  date: string;
  time?: string;
  mode: "ONLINE" | "PRESENTIAL";
  tenantSlug: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nutriopus.com.br";
  const portalUrl = `${appUrl}/portal/${params.tenantSlug}`;
  const html = getAppointmentConfirmTemplate({
    patientName: params.patientName,
    nutritionistName: params.nutritionistName,
    date: params.date,
    time: params.time,
    mode: params.mode,
    portalUrl,
  });
  return sendEmail({
    to: params.patientEmail,
    subject: `Sua consulta foi confirmada — ${params.date}`,
    html,
  });
}
