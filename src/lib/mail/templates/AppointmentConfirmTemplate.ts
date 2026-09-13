interface Params {
  patientName: string;
  nutritionistName: string;
  date: string;
  time?: string;
  mode: "ONLINE" | "PRESENTIAL";
  portalUrl: string;
}

export function getAppointmentConfirmTemplate({
  patientName,
  nutritionistName,
  date,
  time,
  mode,
  portalUrl,
}: Params): string {
  const modeLabel = mode === "ONLINE" ? "Online (videochamada)" : "Presencial";
  const timeStr = time ? ` às ${time}` : "";

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8F4EC;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F4EC;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr><td style="background:#2563EB;padding:28px 32px;">
          <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">NutriOpus</p>
          <p style="margin:4px 0 0;color:#BFDBFE;font-size:13px;">Acompanhamento nutricional inteligente</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 8px;color:#111827;font-size:18px;font-weight:700;">Consulta confirmada! ✅</p>
          <p style="margin:0 0 24px;color:#64748B;font-size:14px;">Olá, <strong>${patientName}</strong>! Sua consulta foi agendada com sucesso.</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F4EC;border-radius:12px;padding:16px;margin-bottom:24px;">
            <tr>
              <td style="padding:6px 0;">
                <span style="color:#64748B;font-size:13px;">Nutricionista</span><br>
                <strong style="color:#111827;font-size:15px;">${nutritionistName}</strong>
              </td>
            </tr>
            <tr>
              <td style="padding:6px 0;border-top:1px solid #E2E8F0;">
                <span style="color:#64748B;font-size:13px;">Data e horário</span><br>
                <strong style="color:#111827;font-size:15px;">${date}${timeStr}</strong>
              </td>
            </tr>
            <tr>
              <td style="padding:6px 0;border-top:1px solid #E2E8F0;">
                <span style="color:#64748B;font-size:13px;">Modalidade</span><br>
                <strong style="color:#111827;font-size:15px;">${modeLabel}</strong>
              </td>
            </tr>
          </table>

          <a href="${portalUrl}" style="display:block;background:#2563EB;color:#ffffff;text-align:center;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:600;font-size:15px;margin-bottom:24px;">
            Acessar meu portal
          </a>

          <p style="margin:0;color:#94A3B8;font-size:12px;text-align:center;">
            Este email foi enviado automaticamente pelo NutriOpus.<br>
            Em caso de dúvidas, entre em contato com sua nutricionista.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
