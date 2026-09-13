interface Params {
  nutritionistName: string;
  patientName: string;
  patientPhone: string;
  dashboardUrl: string;
}

export function getNewAnamneseTemplate({ nutritionistName, patientName, patientPhone, dashboardUrl }: Params): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8F4EC;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F4EC;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr><td style="background:linear-gradient(135deg,#2563EB,#1D4ED8);padding:28px 32px;">
          <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">📋 Nova pré-consulta recebida</p>
          <p style="margin:6px 0 0;color:#BFDBFE;font-size:14px;">NutriOpus — Notificação automática</p>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <p style="margin:0 0 12px;color:#111827;font-size:15px;">Olá, <strong>${nutritionistName}</strong>!</p>
          <p style="margin:0 0 20px;color:#64748B;font-size:14px;line-height:1.6;">
            Uma nova pré-consulta foi enviada pelo portal e está aguardando sua revisão.
          </p>

          <div style="background:#F0F9FF;border:1px solid #BAE6FD;border-radius:10px;padding:16px;margin-bottom:24px;">
            <p style="margin:0 0 8px;color:#0369A1;font-size:13px;font-weight:600;">Dados do paciente:</p>
            <p style="margin:0 0 4px;color:#0C4A6E;font-size:14px;"><strong>Nome:</strong> ${patientName}</p>
            <p style="margin:0;color:#0C4A6E;font-size:14px;"><strong>Telefone:</strong> ${patientPhone}</p>
          </div>

          <a href="${dashboardUrl}" style="display:block;background:#2563EB;color:#ffffff;text-align:center;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:600;font-size:15px;margin-bottom:20px;">
            Ver anamnese no dashboard →
          </a>

          <p style="margin:0;color:#94A3B8;font-size:12px;text-align:center;">
            Acesse o NutriOpus para revisar os pontos de atenção identificados pela IA.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
