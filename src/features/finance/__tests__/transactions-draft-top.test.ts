import { describe, expect, it } from "vitest";
import { mergeServerRows, newDraftId, orderGridRows, validateGridRow, type GridSort } from "../grid-order";
import { clipboardDrafts } from "../clipboard-parser";

type Row = { id: string; draft?: boolean; date: string; description: string; amount: string; categoryId?: string };
const saved = (id: string, date: string, description: string, amount: string, categoryId = ""): Row => ({ id, date, description, amount, categoryId });
const draft = (id: string, description = ""): Row => ({ id, draft: true, date: "2031-05-10", description, amount: "" });
const ids = (rows: Row[]) => rows.map((row) => row.id);

describe("F01 · drafts sit at the top of every view", () => {
  const server = [saved("a", "2031-05-09", "Padaria", "10,00"), saved("b", "2031-05-08", "Mercado", "250,00"), saved("c", "2031-05-07", "Cinema", "35,00")];

  it("shows the newest draft above older drafts, then the saved rows in server order", () => {
    const rows = [draft("d2"), draft("d1"), ...server];
    expect(ids(orderGridRows(rows, []))).toEqual(["d2", "d1", "a", "b", "c"]);
  });

  it("keeps drafts pinned on top whichever column is sorted, ascending or descending", () => {
    const rows = [draft("d1"), ...server];
    const byAmount: GridSort = [{ id: "amount", desc: false }];
    expect(ids(orderGridRows(rows, byAmount))).toEqual(["d1", "a", "c", "b"]);
    expect(ids(orderGridRows(rows, [{ id: "amount", desc: true }]))).toEqual(["d1", "b", "c", "a"]);
    expect(ids(orderGridRows(rows, [{ id: "description", desc: false }]))).toEqual(["d1", "c", "b", "a"]);
  });

  it("sorts amounts as numbers, not as text, and categories by their name", () => {
    const rows = [saved("x", "2031-01-01", "x", "1.000,00", "c2"), saved("y", "2031-01-01", "y", "99,00", "c1")];
    expect(ids(orderGridRows(rows, [{ id: "amount", desc: false }]))).toEqual(["y", "x"]);
    const labels = { categoryId: (id: string) => ({ c1: "Zeta", c2: "Alfa" })[id] ?? id };
    expect(ids(orderGridRows(rows, [{ id: "categoryId", desc: false }], labels))).toEqual(["x", "y"]);
  });

  it("does not change the order of the saved rows when only a draft is added", () => {
    const before = ids(orderGridRows(server, []));
    expect(ids(orderGridRows([draft("d1"), ...server], [])).slice(1)).toEqual(before);
  });

  it("pasting a block puts it above older drafts and keeps the file's own sequence", () => {
    const pasted = clipboardDrafts("10/05/2031;Um;1,00\n10/05/2031;Dois;2,00\n10/05/2031;Três;3,00", "2031-05-10", "acc").map((row) => ({ ...row, draft: true as const }));
    const rows = [...pasted, draft("older"), ...server];
    const ordered = orderGridRows(rows, [{ id: "description", desc: true }]);
    expect(ordered.slice(0, 3).map((row) => (row as Row).description)).toEqual(["Um", "Dois", "Três"]);
    expect(ordered[3].id).toBe("older");
  });

  it("never reuses a draft id, even for rows created in the same millisecond", () => {
    const generated = Array.from({ length: 500 }, () => newDraftId());
    expect(new Set(generated).size).toBe(500);
    const pasted = [...clipboardDrafts("a;1\nb;2", "2031-05-10", "acc"), ...clipboardDrafts("c;3\nd;4", "2031-05-10", "acc")];
    expect(new Set(pasted.map((row) => row.id)).size).toBe(4);
    expect(generated.every((id) => id.startsWith("draft-"))).toBe(true);
  });
});

describe("F01 · a server refresh never duplicates or loses unsaved work", () => {
  const server = [saved("a", "2031-05-09", "Padaria", "10,00"), saved("b", "2031-05-08", "Mercado", "250,00")];

  it("replaces a saved draft by its persisted row", () => {
    const local = [draft("d1", "Almoço"), ...server];
    const refreshed = [saved("n1", "2031-05-10", "Almoço", "35,00"), ...server];
    const merged = mergeServerRows(local, refreshed, new Set());
    expect(ids(merged.rows)).toEqual(["n1", "a", "b"]);
    expect(merged.rows.some((row) => row.draft)).toBe(false);
  });

  it("keeps unsaved drafts on top, once, and the unsaved edit of a saved row", () => {
    const edited = { ...server[0], description: "Padaria nova" };
    const local = [draft("d2", "B"), draft("d1", "A"), edited, server[1]];
    const merged = mergeServerRows(local, server, new Set(["d1", "d2", "a"]));
    expect(ids(merged.rows)).toEqual(["d2", "d1", "a", "b"]);
    expect(merged.rows.find((row) => row.id === "a")?.description).toBe("Padaria nova");
    expect([...merged.dirty].sort()).toEqual(["a", "d1", "d2"]);
    expect(ids(mergeServerRows(merged.rows, server, merged.dirty).rows)).toEqual(["d2", "d1", "a", "b"]);
  });

  it("drops the dirty mark of rows that no longer exist after the refresh", () => {
    const merged = mergeServerRows([saved("gone", "2031-05-01", "x", "1,00")], server, new Set(["gone"]));
    expect([...merged.dirty]).toEqual([]);
    expect(ids(merged.rows)).toEqual(["a", "b"]);
  });
});

describe("F01 · incomplete drafts cannot be saved", () => {
  const ok = { date: "2031-05-10", description: "Almoço", amount: "35,00", type: "EXPENSE" };
  it("accepts a complete row", () => expect(validateGridRow(ok)).toBeNull());
  it("explains what is missing", () => {
    expect(validateGridRow({ ...ok, description: "   " })).toBe("Informe a descrição.");
    expect(validateGridRow({ ...ok, amount: "" })).toBe("Informe o valor.");
    expect(validateGridRow({ ...ok, amount: "abc" })).toMatch(/inválido/i);
    expect(validateGridRow({ ...ok, amount: "0,00" })).toBe("O valor deve ser diferente de zero.");
    expect(validateGridRow({ ...ok, date: "2031-02-30" })).toMatch(/data/i);
  });
  it("lets an adjustment be negative but never zero", () => {
    expect(validateGridRow({ ...ok, type: "ADJUSTMENT", amount: "-12,50" })).toBeNull();
    expect(validateGridRow({ ...ok, type: "EXPENSE", amount: "-12,50" })).not.toBeNull();
  });
});
