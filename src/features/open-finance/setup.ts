import { Prisma, type Account, type OpenFinanceAccountLink } from "@prisma/client";
import { assertImportOwner, type ImportActor } from "@/features/finance/document-import";
import { CASH_ACCOUNT_TYPES } from "@/features/finance/own-transfers";
import { connectionInstitution } from "./institutions";
import { rememberHistoryAnchor } from "./history";
import { approveCreditBill, latestCreditBills } from "./credit-bills";
import { billingDay } from "./credit-normalize";
import { dayOf } from "./normalize";
import { ownerActor } from "./connections";
import { PluggyError } from "./pluggy-client";
import type { PluggyAccount } from "./pluggy-schemas";
import { revealItemId } from "./secret";
import { MIN_CRON_INTERVAL_MS, syncConnection, type SyncDeps } from "./sync";

const day = (date: Date) => date.toISOString().slice(0, 10);
const after = (value: string) => day(new Date(Date.parse(`${value}T00:00:00Z`) + 86400000));
const normal = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const amount = (value: number | null | undefined) => typeof value === "number" && Number.isSafeInteger(Math.round(value * 100)) && Math.abs(Math.round(value * 100)) <= 2147483647 ? Math.round(value * 100) : null;
const kind = (remote: PluggyAccount) => remote.type.toUpperCase() === "CREDIT" ? "CREDIT" : "BANK";
const accountType = (remote: PluggyAccount) => kind(remote) === "CREDIT" ? "CREDIT_CARD" : /SAVING/i.test(remote.subtype ?? "") ? "SAVINGS" : /PAYMENT|WALLET/i.test(remote.subtype ?? "") ? "DIGITAL_WALLET" : "CHECKING";
const compatible = (account: Account, remote: PluggyAccount) => kind(remote) === "CREDIT" ? account.type === "CREDIT_CARD" : (CASH_ACCOUNT_TYPES as readonly string[]).includes(account.type);

/** Only a unique product/name match reuses a legacy account. Several cards never collapse into one. */
export function existingAccountMatch(remote: PluggyAccount, peers: PluggyAccount[], accounts: Account[], institution: string | null) {
  const candidates = accounts.filter(account => compatible(account, remote) && (institution
    ? connectionInstitution([account.institution, account.name])?.id === institution
    : normal(account.name) === normal(remote.marketingName || remote.name || "")));
  const lastFour = remote.number?.replace(/\D/g, "").slice(-4);
  const named = candidates.filter(account => normal(account.name) === normal(remote.marketingName || remote.name || "") || lastFour && new RegExp(`(?:^|\\D)${lastFour}(?:\\D|$)`).test(account.name));
  if (named.length === 1) return { account: named[0], ambiguous: false };
  const familyPeers = peers.filter(value => kind(value) === kind(remote));
  const preferred = candidates.filter(account => account.type === accountType(remote));
  const preferredPeers = familyPeers.filter(value => accountType(value) === accountType(remote));
  if (preferred.length === 1 && preferredPeers.length === 1) return { account: preferred[0], ambiguous: false };
  if (candidates.length === 1 && familyPeers.length === 1) return { account: candidates[0], ambiguous: false };
  return { account: null, ambiguous: candidates.length > 0 };
}

export async function configureAllAccounts(deps: SyncDeps, actor: ImportActor, connectionId: string, forceAll = true) {
  await assertImportOwner(deps.prisma, actor);
  const connection = await deps.prisma.openFinanceConnection.findFirstOrThrow({ where: { id: connectionId, workspaceId: actor.workspaceId } });
  if (!["ACTIVE", "ERROR"].includes(connection.status)) return { configured: 0, created: 0, unresolved: 0 };
  const itemId = revealItemId(connection.itemIdCipher);
  const [item, listed, workspace] = await Promise.all([deps.client.getItem(itemId), deps.client.listAccounts(itemId), deps.prisma.workspace.findUniqueOrThrow({ where: { id: actor.workspaceId }, select: { timezone: true } })]);
  const now = deps.now?.() ?? new Date();
  if (item.consentExpiresAt && new Date(item.consentExpiresAt) < now) throw new PluggyError("CONSENT_EXPIRED");
  if (["LOGIN_ERROR", "WAITING_USER_ACTION", "WAITING_USER_INPUT"].includes(item.status ?? "")) throw new PluggyError("RECONNECT_REQUIRED");
  if (listed.invalid) throw new PluggyError("UNEXPECTED_RESPONSE");
  const products = listed.items.filter(remote => ["BANK", "CREDIT"].includes(remote.type.toUpperCase()) && remote.currencyCode === "BRL");
  const institution = connectionInstitution([connection.label, ...products.map(remote => remote.marketingName || remote.name)]);
  const asOf = item.lastUpdatedAt ? dayOf(item.lastUpdatedAt, workspace.timezone) : day(now);
  if (!asOf) throw new PluggyError("UNEXPECTED_RESPONSE");
  for (let attempt = 1; ; attempt++) {
    try { return await deps.prisma.$transaction(async db => {
      await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${actor.workspaceId}:open-finance-setup`}, 0))`;
      await assertImportOwner(db, actor);
      const current = await db.openFinanceConnection.findFirstOrThrow({ where: { id: connectionId, workspaceId: actor.workspaceId } });
      if (!["ACTIVE", "ERROR"].includes(current.status) || current.syncLeaseUntil && current.syncLeaseUntil > now) throw new PluggyError("BUSY");
      let configured = 0, created = 0, unresolved = 0;
      const links: OpenFinanceAccountLink[] = [];
      for (const remote of products) links.push(await db.openFinanceAccountLink.upsert({ where: { connectionId_externalAccountId: { connectionId, externalAccountId: remote.id } }, update: {}, create: { workspaceId: actor.workspaceId, connectionId, externalAccountId: remote.id, kind: kind(remote), subtype: remote.subtype, displayName: (remote.marketingName || remote.name || connection.label).slice(0, 120), maskedNumber: remote.number?.replace(/\D/g, "").slice(-4) || null, syncFromDate: null, isEnabled: false } }));
      const accounts = await db.account.findMany({ where: { workspaceId: actor.workspaceId, isArchived: false, currency: "BRL" } });
      const used = new Set((await db.openFinanceAccountLink.findMany({ where: { workspaceId: actor.workspaceId, accountId: { not: null }, isEnabled: true }, select: { accountId: true } })).flatMap(link => link.accountId ? [link.accountId] : []));
      for (const remote of products) {
        const link = links.find(value => value.externalAccountId === remote.id)!;
        if (!forceAll && link.accountId) { if (link.isEnabled) configured++; continue; }
        let account = link.accountId ? accounts.find(value => value.id === link.accountId) ?? null : null;
        if (account && !compatible(account, remote)) { unresolved++; continue; }
        if (!account) {
          const peers = products.filter(value => !links.find(row => row.externalAccountId === value.id)?.accountId);
          const match = existingAccountMatch(remote, peers, accounts.filter(value => !used.has(value.id)), institution?.id ?? null);
          if (match.ambiguous) { unresolved++; continue; }
          account = match.account;
          if (!account) {
            const name = `${institution?.name ?? connection.label} · ${remote.marketingName || remote.name || (kind(remote) === "CREDIT" ? "Cartão" : "Conta")}${link.maskedNumber ? ` · ${link.maskedNumber}` : ""}`.slice(0, 120);
            const opening = kind(remote) === "BANK" ? amount(remote.balance) : 0;
            if (opening === null) { unresolved++; continue; }
            account = await db.account.create({ data: { workspaceId: actor.workspaceId, name, institution: institution?.name ?? connection.label, type: accountType(remote), initialBalanceCents: opening, creditLimitCents: kind(remote) === "CREDIT" ? amount(remote.creditData?.creditLimit) : null, closingDay: billingDay(remote.creditData?.balanceCloseDate) ? Number(billingDay(remote.creditData?.balanceCloseDate)!.slice(8)) : null, dueDay: billingDay(remote.creditData?.balanceDueDate) ? Number(billingDay(remote.creditData?.balanceDueDate)!.slice(8)) : null } });
            created++;
            if (kind(remote) === "BANK") await rememberHistoryAnchor(db, actor.workspaceId, account.id, link.id, after(asOf));
          }
        }
        if (used.has(account.id) && link.accountId !== account.id) { unresolved++; continue; }
        await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${actor.workspaceId}:${account.id}:financial-import`}, 0))`;
        if (kind(remote) === "BANK") await rememberHistoryAnchor(db, actor.workspaceId, account.id, link.id, link.syncFromDate ? day(link.syncFromDate) : day(account.createdAt));
        await db.openFinanceAccountLink.update({ where: { id: link.id }, data: { accountId: account.id, syncFromDate: null, isEnabled: true, ...(forceAll || link.syncFromDate || link.accountId !== account.id ? { lastTransactionDate: null } : {}) } });
        link.accountId = account.id; used.add(account.id); configured++;
      }
      return { configured, created, unresolved };
    }, { isolationLevel: "Serializable", timeout: 60000, maxWait: 10000 }); }
    catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") || attempt >= 3) throw error;
    }
  }
}

/** Explicit "sync everything" uses bank values for unambiguous open bills; protected cases stay in review. */
export async function syncEverything(deps: SyncDeps, actor: ImportActor, connectionId: string, trigger: "MANUAL" | "CRON" = "MANUAL") {
  const setup = await configureAllAccounts(deps, actor, connectionId, trigger === "MANUAL");
  const first = await syncConnection(deps, actor, connectionId, trigger);
  if (!["SUCCESS", "PARTIAL"].includes(first.status)) return { ...first, ...setup };
  const links = await deps.prisma.openFinanceAccountLink.findMany({ where: { workspaceId: actor.workspaceId, connectionId, isEnabled: true, accountId: { not: null } }, select: { id: true, accountId: true } });
  const reviews = (await latestCreditBills(deps.prisma, actor.workspaceId)).filter(row => row.kind === "OPEN_FINANCE_BILL_REVIEW" && links.some(link => link.id === row.data.linkId));
  let approved = 0;
  for (const review of reviews) {
    if (!review.data.statementId || !["OPEN", "FUTURE_KNOWN"].includes(review.data.bill.status ?? "")) continue;
    const target = await deps.prisma.cardStatement.findFirst({ where: { id: review.data.statementId, workspaceId: actor.workspaceId, accountId: review.accountId } });
    if (!target || target.status === "PAID" || target.rolledIntoStatementId || target.reconciliation === "PENDING" || day(target.dueDate ?? new Date(0)) !== review.data.bill.dueDate || target.closingDate && review.data.bill.closingDate && day(target.closingDate) !== review.data.bill.closingDate) continue;
    try {
      await approveCreditBill(deps.prisma, actor, { snapshotId: review.id, statementId: target.id, statementVersion: review.data.statementVersion, status: review.data.bill.status as "OPEN" | "FUTURE_KNOWN", confirmed: true }); approved++;
    } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError) throw error; /* Domain guards keep uncertain bills in review. */ }
  }
  const last = approved ? await syncConnection(deps, actor, connectionId, trigger) : first;
  const [pending, latestBills] = await Promise.all([
    deps.prisma.financialEvidence.count({ where: { workspaceId: actor.workspaceId, decision: "NEEDS_REVIEW", source: { accountId: { in: links.flatMap(link => link.accountId ? [link.accountId] : []) }, fileName: { startsWith: "Open Finance ·" } } } }),
    latestCreditBills(deps.prisma, actor.workspaceId),
  ]);
  const pendingBills = latestBills.filter(row => row.kind === "OPEN_FINANCE_BILL_REVIEW" && links.some(link => link.id === row.data.linkId)).length;
  return { ...last, ...setup, needsReview: pending + pendingBills, autoCreated: first.autoCreated + (approved ? last.autoCreated : 0), staged: first.staged + (approved ? last.staged : 0) };
}

export async function syncEverythingDue(deps: SyncDeps) {
  const now = deps.now?.() ?? new Date();
  const connections = await deps.prisma.openFinanceConnection.findMany({ where: { status: { in: ["ACTIVE", "ERROR"] } }, select: { id: true, workspaceId: true, lastSyncedAt: true } });
  const results = [];
  for (const connection of connections) {
    if (connection.lastSyncedAt && now.getTime() - connection.lastSyncedAt.getTime() < MIN_CRON_INTERVAL_MS) continue;
    const actor = await ownerActor(deps.prisma, connection.workspaceId);
    if (!actor) continue;
    try { results.push(await syncEverything(deps, actor, connection.id, "CRON")); }
    catch (error) { results.push({ status: "ERROR" as const, errorCode: error instanceof PluggyError ? error.code : "SYNC_FAILED", autoCreated: 0, needsReview: 0 }); }
  }
  return results;
}
