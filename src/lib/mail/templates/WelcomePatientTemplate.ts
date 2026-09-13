interface Params {
  patientName: string;
  nutritionistName: string;
  portalUrl: string;
  activationUrl?: string;
}

export function getWelcomePatientTemplate({ patientName, nutritionistName, portalUrl, activationUrl }: Params): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8F4EC;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F4EC;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr><td style="background:linear-gradient(135deg,#2563EB,#1D4ED8);padding:32px;">
          <p style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Bem-vinda ao NutriOpus! 🎉</p>
          <p style="margin:6px 0 0;color:#BFDBFE;font-size:14px;">Seu portal de acompanhamento nutricional</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;color:#111827;font-size:16px;">Olá, <strong>${patientName}</strong>!</p>
          <p style="margin:0 0 24px;color:#64748B;font-size:14px;line-height:1.6;">
            Sua conta no portal NutriOpus foi criada por <strong>${nutritionistName}</strong>.
            Agora você tem acesso ao seu cardápio, histórico de evolução, diário alimentar e muito mais — tudo em um só lugar.
          </p>

          <div style="background:#EFF6FF;border-left:4px solid #2563EB;border-radius:8px;padding:16px;margin-bottom:24px;">
            <p style="margin:0;color:#1E40AF;font-size:14px;font-weight:600;">O que você pode fazer no portal:</p>
            <ul style="margin:8px 0 0;padding-left:20px;color:#1D4ED8;font-size:13px;line-height:2;">
              <li>Ver e baixar seu cardápio alimentar</li>
              <li>Registrar refeições no diário alimentar</li>
              <li>Acompanhar sua evolução em gráficos</li>
              <li>Verificar suas metas e lembretes</li>
              <li>Participar de consultas online</li>
            </ul>
          </div>

          <a href="${activationUrl || portalUrl}" style="display:block;background:#2563EB;color:#ffffff;text-align:center;text-decoration:none;padding:16px 24px;border-radius:10px;font-weight:600;font-size:16px;margin-bottom:24px;">
            ${activationUrl ? "Ativar minha conta →" : "Acessar meu portal →"}
          </a>
          ${activationUrl ? `<p style="margin:0 0 16px;color:#64748B;font-size:12px;text-align:center;">Este link de ativação é válido por 48 horas.</p>` : ""}

          <p style="margin:0;color:#94A3B8;font-size:12px;text-align:center;">
            Em caso de dúvidas, entre em contato com ${nutritionistName}.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
