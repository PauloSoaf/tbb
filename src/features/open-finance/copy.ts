/** What the person reads. Provider error codes never reach the screen as they are, and never carry a response body. */
const errors: Record<string, string> = {
  BUSY: "Já existe uma sincronização em andamento. Aguarde a conclusão.",
  DB_P2028: "O lote demorou além do esperado. Tente novamente para continuar o histórico sem duplicar registros.",
  DETAIL_EXCEEDS_BILL: "Há compras que excedem o valor conciliado da fatura. Confira os detalhes em Importar e Faturas.",
  DUPLICATE_PROVIDER_ID: "O banco repetiu um identificador com informações diferentes. Esse lote precisa de conferência.",
  INVALID_CREDENTIALS: "A Pluggy recusou o Client ID e o Client Secret configurados no servidor. Gere um novo Client Secret no Dashboard e atualize o .env.",
  UNAUTHORIZED: "A Pluggy recusou o acesso. Confira as credenciais configuradas no servidor.",
  NOT_FOUND: "A Pluggy não encontrou este Item ID. Confira se ele foi criado com o conector MeuPluggy, na mesma aplicação das credenciais.",
  RATE_LIMITED: "A Pluggy limitou as consultas por alguns instantes. Tente de novo em um minuto.",
  PROVIDER_UNAVAILABLE: "A Pluggy está indisponível agora. A próxima sincronização tenta de novo.",
  NETWORK_ERROR: "Não foi possível falar com a Pluggy. Confira a conexão com a internet.",
  UNEXPECTED_RESPONSE: "A Pluggy respondeu em um formato inesperado. Nada foi importado.",
  TOO_MANY_PAGES: "A conta tem movimentos demais para uma única consulta. Escolha uma data de início mais recente.",
  RECONNECT_REQUIRED: "O banco pede que você se conecte de novo. Reconecte em meu.pluggy.ai e depois use Retomar.",
  CONSENT_EXPIRED: "O consentimento deste banco expirou. Renove em meu.pluggy.ai e depois use Retomar.",
  SYNC_FAILED: "A sincronização falhou. Nada foi importado pela metade; tente de novo.",
};
export const openFinanceError = (code: string | null | undefined) => code ? errors[code] ?? (code.startsWith("HTTP_") ? "A Pluggy recusou o pedido. Tente de novo mais tarde." : errors.SYNC_FAILED) : null;

export const connectionStatusLabel: Record<string, string> = { ACTIVE: "Ativa", PAUSED: "Pausada", ERROR: "Com erro", CONSENT_EXPIRED: "Consentimento expirado" };
export const runStatusLabel: Record<string, string> = { RUNNING: "Em andamento", SUCCESS: "Concluída", PARTIAL: "Parcial", ERROR: "Falhou", NEEDS_RECONNECT: "Reconectar", CONSENT_EXPIRED: "Consentimento expirado" };
export const accountKindLabel: Record<string, string> = { BANK: "Conta bancária", CREDIT: "Cartão de crédito" };

export function syncMessage(summary: { status: string; errorCode?: string; autoCreated: number; needsReview: number; alreadyKnown: number; staged: number }) {
  if (summary.status === "BUSY") return { error: "Já existe uma sincronização desta conexão em andamento." };
  if (summary.status === "PAUSED") return { error: "A conexão está pausada. Retome para sincronizar." };
  if (summary.status === "CONSENT_EXPIRED") return { error: openFinanceError("CONSENT_EXPIRED")! };
  if (summary.status === "ERROR" || summary.status === "NEEDS_RECONNECT") return { error: openFinanceError(summary.errorCode) ?? errors.SYNC_FAILED };
  const parts = [`${summary.autoCreated} lançamento(s) criado(s)`, `${summary.needsReview} para revisar`];
  if (summary.alreadyKnown) parts.push(`${summary.alreadyKnown} já conhecido(s)`);
  return { success: `Sincronizado: ${parts.join(", ")}.${summary.status === "PARTIAL" ? " Uma conta falhou; veja o histórico." : ""}` };
}
