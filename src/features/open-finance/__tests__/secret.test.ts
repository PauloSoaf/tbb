import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { itemIdHash, ITEM_ID_PATTERN, protectItemId, revealItemId } from "../secret";

const ITEM = "0b1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c4d";
const saved = { jwt: process.env.JWT_SECRET, key: process.env.OPEN_FINANCE_DATA_KEY };
beforeEach(() => { process.env.JWT_SECRET = "j".repeat(40); delete process.env.OPEN_FINANCE_DATA_KEY; });
afterEach(() => { process.env.JWT_SECRET = saved.jwt; if (saved.key === undefined) delete process.env.OPEN_FINANCE_DATA_KEY; else process.env.OPEN_FINANCE_DATA_KEY = saved.key; });

describe("item id protection", () => {
  it("round-trips and never stores the id in the clear", () => {
    const sealed = protectItemId(ITEM);
    expect(sealed).not.toContain(ITEM);
    expect(sealed.startsWith("v1.")).toBe(true);
    expect(revealItemId(sealed)).toBe(ITEM);
  });

  it("uses a fresh nonce each time, so equal ids do not look equal", () => {
    expect(protectItemId(ITEM)).not.toBe(protectItemId(ITEM));
  });

  it("detects tampering and malformed values", () => {
    const [version, nonce, tag, bytes] = protectItemId(ITEM).split(".");
    expect(() => revealItemId([version, nonce, tag, `${bytes.slice(0, -2)}AA`].join("."))).toThrow();
    expect(() => revealItemId("v2.a.b.c")).toThrow("inválido");
    expect(() => revealItemId("nonsense")).toThrow("inválido");
  });

  it("depends on the key: another secret cannot open it", () => {
    const sealed = protectItemId(ITEM);
    process.env.JWT_SECRET = "k".repeat(40);
    expect(() => revealItemId(sealed)).toThrow();
  });

  it("prefers the dedicated data key, so rotating the session secret does not lock the connections", () => {
    process.env.OPEN_FINANCE_DATA_KEY = "d".repeat(40);
    const sealed = protectItemId(ITEM);
    process.env.JWT_SECRET = "z".repeat(40);
    expect(revealItemId(sealed)).toBe(ITEM);
  });

  it("refuses to run without a strong enough key", () => {
    process.env.JWT_SECRET = "short";
    expect(() => protectItemId(ITEM)).toThrow("chave de proteção");
  });
});

describe("item id hash", () => {
  it("is stable, case-insensitive and scoped to the workspace", () => {
    expect(itemIdHash("ws-1", ITEM)).toBe(itemIdHash("ws-1", ITEM.toUpperCase()));
    expect(itemIdHash("ws-1", ITEM)).not.toBe(itemIdHash("ws-2", ITEM));
    expect(itemIdHash("ws-1", ITEM)).toMatch(/^[0-9a-f]{64}$/);
    expect(itemIdHash("ws-1", ITEM)).not.toContain(ITEM.slice(0, 8));
  });
  it("accepts only the UUID format the dashboard shows", () => {
    expect(ITEM_ID_PATTERN.test(ITEM)).toBe(true);
    for (const bad of ["", "abc", `${ITEM} `, `${ITEM}0`, "0b1c2d3e4f504a6b8c7d9e0f1a2b3c4d"]) expect(ITEM_ID_PATTERN.test(bad)).toBe(false);
  });
});
