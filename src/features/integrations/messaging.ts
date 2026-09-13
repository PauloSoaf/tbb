import { parseMoney } from "@/features/finance/money";

export type Message = { id: string; text: string; sentAt: string; source: string };
export type MessageCandidate = { messageId: string; description: string; amountCents: number; source: string; requiresReview: true };
export interface MessagingProvider { id: string; available: boolean; authorizationRequired: true; readMessages: () => Promise<Message[]> }

const unavailable = async (): Promise<Message[]> => { throw new Error("Integração indisponível. Nenhuma conta foi conectada. WhatsApp exige autorização explícita antes de implementação e uso."); };
export const messagingProviders: MessagingProvider[] = [
  { id: "whatsapp-official", available: false, authorizationRequired: true, readMessages: unavailable },
  { id: "whatsapp-import", available: false, authorizationRequired: true, readMessages: unavailable },
  { id: "whatsapp-web", available: false, authorizationRequired: true, readMessages: unavailable },
];

/** Pure extraction only. No network, credentials, ingestion, or automatic transaction writes. */
export function extractMessageCandidate(message: Message): MessageCandidate | null {
  const match = /^(.+?)\s+(?:R\$\s*)?(\d+(?:[.,]\d{1,2})?)\s*$/.exec(message.text.trim());
  if (!match || !match[1].trim()) return null;
  const amountCents = parseMoney(match[2]);
  if (!amountCents) return null;
  return { messageId: message.id, description: match[1].trim(), amountCents, source: message.source, requiresReview: true };
}
