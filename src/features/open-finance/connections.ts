import { Prisma, type PrismaClient } from "@prisma/client";
import { assertImportOwner, type ImportActor } from "@/features/finance/document-import";
import { CASH_ACCOUNT_TYPES } from "@/features/finance/own-transfers";
import { ITEM_ID_PATTERN, itemIdHash, protectItemId } from "./secret";
import { rememberHistoryAnchor } from "./history";

type DB = PrismaClient | Prisma.TransactionClient;
/** The free Meu Pluggy plan allows five connections. */
export const MAX_CONNECTIONS = 5;
const day = (value: string | null | undefined) => {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) throw new Error("Data de início inválida.");
  return new Date(`${value}T00:00:00.000Z`);
};

export async function addConnection(db: PrismaClient, actor: ImportActor, input: { itemId: string; label: string }) {
  await assertImportOwner(db, actor);
  const itemId = input.itemId.trim(), label = input.label.trim();
  if (!ITEM_ID_PATTERN.test(itemId)) throw new Error("O Item ID é um código no formato 00000000-0000-0000-0000-000000000000, copiado do Dashboard da Pluggy.");
  if (!label || label.length > 80) throw new Error("Dê um nome de até 80 caracteres para a conexão.");
  if (await db.openFinanceConnection.count({ where: { workspaceId: actor.workspaceId } }) >= MAX_CONNECTIONS) throw new Error(`O Meu Pluggy gratuito aceita até ${MAX_CONNECTIONS} conexões.`);
  try {
    const created = await db.openFinanceConnection.create({ data: { workspaceId: actor.workspaceId, label, itemIdCipher: protectItemId(itemId), itemIdHash: itemIdHash(actor.workspaceId, itemId) }, select: { id: true } });
    await db.activityEvent.create({ data: { workspaceId: actor.workspaceId, actorUserId: actor.userId, type: "open_finance.connection_added", entityType: "OpenFinanceConnection", entityId: created.id, metadata: {} } });
    return created.id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new Error("Este Item ID já está conectado.");
    throw error;
  }
}

export async function setConnectionPaused(db: PrismaClient, actor: ImportActor, connectionId: string, paused: boolean) {
  await assertImportOwner(db, actor);
  const changed = await db.openFinanceConnection.updateMany({ where: { id: connectionId, workspaceId: actor.workspaceId, ...(paused ? { status: { notIn: ["PAUSED"] } } : { status: { in: ["PAUSED", "CONSENT_EXPIRED"] } }) }, data: { status: paused ? "PAUSED" : "ACTIVE", ...(paused ? {} : { lastErrorCode: null }) } });
  if (!changed.count) throw new Error("Conexão não encontrada ou já está neste estado.");
}

/** Removing a connection stops future syncs. Transactions already imported stay: they are part of the person's history. */
export async function removeConnection(db: PrismaClient, actor: ImportActor, connectionId: string) {
  await assertImportOwner(db, actor);
  const removed = await db.openFinanceConnection.deleteMany({ where: { id: connectionId, workspaceId: actor.workspaceId } });
  if (!removed.count) throw new Error("Conexão não encontrada.");
  await db.activityEvent.create({ data: { workspaceId: actor.workspaceId, actorUserId: actor.userId, type: "open_finance.connection_removed", entityType: "OpenFinanceConnection", entityId: connectionId, metadata: {} } });
}

/**
 * Links a bank account to a TBB account, with the first day to import. Movements before that day are never imported, so
 * the balance already tracked in TBB is not shifted by history the person has recorded another way.
 */
export async function mapAccountLink(db: PrismaClient, actor: ImportActor, linkId: string, input: { accountId: string | null; syncFromDate: string | null; enabled: boolean }) {
  await assertImportOwner(db, actor);
  const link = await db.openFinanceAccountLink.findFirst({ where: { id: linkId, workspaceId: actor.workspaceId } });
  if (!link) throw new Error("Conta do banco não encontrada.");
  if (input.enabled && !input.accountId) throw new Error("Escolha a conta do TBB que receberá os lançamentos.");
  if (!["BANK", "CREDIT"].includes(link.kind)) throw new Error("Tipo de conta não suportado.");
  if (input.accountId) {
    const account = await db.account.findFirst({ where: { id: input.accountId, workspaceId: actor.workspaceId, isArchived: false, currency: "BRL", type: link.kind === "CREDIT" ? "CREDIT_CARD" : { in: [...CASH_ACCOUNT_TYPES] } } });
    if (!account) throw new Error(link.kind === "CREDIT" ? "Vincule cartões apenas a uma conta de cartão de crédito deste espaço." : "Escolha uma conta corrente, carteira, dinheiro ou reserva deste espaço.");
    const taken = await db.openFinanceAccountLink.findFirst({ where: { workspaceId: actor.workspaceId, accountId: input.accountId, isEnabled: true, id: { not: link.id } }, select: { displayName: true } });
    if (input.enabled && taken) throw new Error(`Esta conta do TBB já recebe lançamentos de “${taken.displayName}”. Duas fontes na mesma conta duplicariam valores.`);
  }
  const from = day(input.syncFromDate);
  const widened = Boolean(link.syncFromDate && (!from || from < link.syncFromDate));
  await db.$transaction(async tx => {
    if (input.accountId) await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${actor.workspaceId}:${input.accountId}:financial-import`}, 0))`;
    if (link.kind === "BANK" && input.accountId && widened) await rememberHistoryAnchor(tx, actor.workspaceId, input.accountId, link.id, link.syncFromDate!.toISOString().slice(0, 10));
    await tx.openFinanceAccountLink.update({ where: { id: link.id }, data: { accountId: input.accountId, syncFromDate: from, isEnabled: input.enabled, ...(widened || input.accountId !== link.accountId ? { lastTransactionDate: null } : {}) } });
  });
}

export async function ownerActor(db: DB, workspaceId: string): Promise<ImportActor | null> {
  const membership = await db.membership.findFirst({ where: { workspaceId, role: "OWNER", isActive: true, user: { isActive: true }, workspace: { isActive: true } }, select: { userId: true } });
  return membership ? { workspaceId, userId: membership.userId, role: "OWNER" } : null;
}
