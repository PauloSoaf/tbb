export function getTeamInviteTemplate({
  clinicName,
  inviteUrl,
}: {
  clinicName: string;
  inviteUrl: string;
}) {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Convite para Equipe - NutriOpus</title>
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #FAFAFA;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
      color: #1F2937;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #FFFFFF;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
      border: 1px solid #E5E7EB;
    }
    .header {
      background-color: #2563EB;
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 {
      color: #FFFFFF;
      margin: 0;
      font-size: 24px;
      font-weight: 700;
    }
    .content {
      padding: 40px 32px;
      text-align: center;
    }
    .content p {
      font-size: 16px;
      line-height: 1.6;
      color: #4B5563;
      margin-bottom: 24px;
    }
    .btn {
      display: inline-block;
      background-color: #2563EB;
      color: #FFFFFF;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
      transition: background-color 0.2s ease;
    }
    .btn:hover {
      background-color: #1D4ED8;
    }
    .footer {
      background-color: #F9FAFB;
      padding: 24px;
      text-align: center;
      border-top: 1px solid #E5E7EB;
    }
    .footer p {
      margin: 0;
      color: #9CA3AF;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Bem-vindo(a) ao NutriOpus!</h1>
    </div>
    <div class="content">
      <h2 style="margin-top: 0; color: #111827;">Você foi convidado(a)</h2>
      <p>Você recebeu um convite para participar da equipe de <strong>${clinicName}</strong> no NutriOpus.</p>
      <p>Clique no botão abaixo para aceitar o convite, criar sua conta e acessar o painel de atendimento.</p>
      <a href="${inviteUrl}" class="btn" style="color: #ffffff;">Aceitar Convite</a>
      
      <p style="margin-top: 32px; font-size: 14px; color: #6B7280;">
        Se o botão não funcionar, copie e cole o seguinte link no seu navegador:<br>
        <a href="${inviteUrl}" style="color: #2563EB; word-break: break-all;">${inviteUrl}</a>
      </p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} NutriOpus. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>
  `;
}
