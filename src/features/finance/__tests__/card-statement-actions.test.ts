import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  preview: vi.fn(),
  apply: vi.fn(),
  transaction: vi.fn(),
  updateMany: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/tenancy/requirePermission", () => ({ requirePermission: mocks.requirePermission, AuthorizationError: class AuthorizationError extends Error {} }));
vi.mock("@/features/finance/card-statement-import", () => ({ previewCardStatementImport: mocks.preview, applyCardStatementImport: mocks.apply }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: mocks.transaction, cardStatement: { updateMany: mocks.updateMany } } }));

import { confirmCardStatements, previewCardStatements, resolveCardStatementOverlap } from "../actions";

const session = (role: string) => ({ workspaceId: "w1", userId: "u1", role, workspace: { timezone: "America/Manaus" } });
function form(entries: Record<string, string | File>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) fd.set(key, value);
  return fd;
}
const json = (name = "faturas.json") => new File([JSON.stringify({ schemaVersion: "1.0", records: [] })], name, { type: "application/json" });

describe("card statement actions — session-bound and owner-only", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn({ cardStatement: { updateMany: mocks.updateMany }, activityEvent: { create: vi.fn() } }));
  });

  it("refuses members who are not the workspace owner", async () => {
    mocks.requirePermission.mockResolvedValue(session("MEMBER"));
    expect(await previewCardStatements(form({ file: json() }))).toEqual({ error: "Somente o titular deste espaço pode gerenciar faturas de cartão." });
    expect(await confirmCardStatements(form({ file: json(), fingerprint: "x" }))).toEqual({ error: "Somente o titular deste espaço pode gerenciar faturas de cartão." });
    expect(mocks.preview).not.toHaveBeenCalled();
    expect(mocks.apply).not.toHaveBeenCalled();
  });

  it("uses only the session workspace, ignoring any workspace sent by the client", async () => {
    mocks.requirePermission.mockResolvedValue(session("OWNER"));
    mocks.preview.mockResolvedValue({ ok: true });
    mocks.apply.mockResolvedValue({ counts: { create: 27, update: 0, keep: 0, conflict: 0 }, accountsCreated: 3, persisted: 27 });
    await previewCardStatements(form({ file: json(), workspaceId: "w2", userId: "u2" }));
    expect(mocks.preview).toHaveBeenCalledWith(expect.anything(), "w1", { schemaVersion: "1.0", records: [] }, expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
    const result = await confirmCardStatements(form({ file: json(), fingerprint: "abc", workspaceId: "w2" }));
    expect(mocks.apply).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ workspaceId: "w1", userId: "u1" }), expect.anything(), expect.objectContaining({ fingerprint: "abc", acceptConflicts: false }));
    expect(result).toMatchObject({ success: "27 criada(s), 0 atualizada(s), 0 mantida(s)." });
  });

  it("accepts only JSON files up to 1 MB", async () => {
    mocks.requirePermission.mockResolvedValue(session("OWNER"));
    expect(await previewCardStatements(form({ file: json("faturas.csv") }))).toEqual({ error: "Formato aceito: JSON." });
    expect(await previewCardStatements(form({ file: new File(["{"], "faturas.json") }))).toEqual({ error: "O arquivo não contém um JSON válido." });
    expect(await previewCardStatements(form({ file: new File(["x".repeat(1_000_001)], "big.json") }))).toEqual({ error: "Selecione um arquivo JSON de até 1 MB." });
  });

  it("reconciles a forecast only inside the session workspace", async () => {
    mocks.requirePermission.mockResolvedValue(session("OWNER"));
    mocks.updateMany.mockResolvedValue({ count: 0 });
    expect(await resolveCardStatementOverlap(form({ id: "other-tenant-statement", resolution: "SEPARATE_CHARGE" }))).toEqual({ error: "Previsão não encontrada ou já conciliada." });
    expect(mocks.updateMany).toHaveBeenCalledWith({ where: { id: "other-tenant-statement", workspaceId: "w1", reconciliation: "PENDING" }, data: { reconciliation: "SEPARATE_CHARGE" } });
  });
});
