import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";

/**
 * Open Finance data keys. OPEN_FINANCE_DATA_KEY is preferred so that rotating the session secret does not lock the
 * stored connections; JWT_SECRET is the fallback, exactly like the other protected fields of the app.
 */
function material(purpose: "cipher" | "hash") {
  const secret = process.env.OPEN_FINANCE_DATA_KEY?.trim() || process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("A chave de proteção de dados não está configurada.");
  return createHash("sha256").update(`tbb:open-finance:${purpose}:v1:${secret}`).digest();
}

/** The Meu Pluggy item id is the handle to a bank connection: it never rests in plain text. */
export function protectItemId(value: string) {
  const nonce = randomBytes(12), cipher = createCipheriv("aes-256-gcm", material("cipher"), nonce);
  const encrypted = Buffer.concat([cipher.update(value.trim(), "utf8"), cipher.final()]);
  return ["v1", nonce.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function revealItemId(value: string) {
  const [version, nonce, tag, bytes] = value.split(".");
  if (version !== "v1" || !nonce || !tag || !bytes) throw new Error("Dado protegido inválido.");
  const decipher = createDecipheriv("aes-256-gcm", material("cipher"), Buffer.from(nonce, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(bytes, "base64url")), decipher.final()]).toString("utf8");
}

/** Stable, keyed fingerprint so the same item cannot be connected twice in a workspace, without storing it in the clear. */
export function itemIdHash(workspaceId: string, itemId: string) {
  return createHmac("sha256", material("hash")).update(`${workspaceId}:${itemId.trim().toLowerCase()}`).digest("hex");
}

export const ITEM_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
