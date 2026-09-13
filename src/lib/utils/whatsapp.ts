export function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function buildScheduleWhatsAppUrl(
  phone: string,
  patientName?: string | null
): string {
  const message = patientName
    ? `Olá, sou ${patientName} e gostaria de marcar uma consulta pelo NutriOpus.`
    : `Olá, gostaria de marcar uma consulta pelo NutriOpus.`;
  return buildWhatsAppUrl(phone, message);
}
