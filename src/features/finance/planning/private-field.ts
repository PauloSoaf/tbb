import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function key() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("A chave de proteção de dados não está configurada.");
  return createHash("sha256").update(`tbb:planning:pix:v1:${secret}`).digest();
}
export function encryptPlanningSecret(value: string) {
  const nonce = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key(), nonce);
  const encrypted = Buffer.concat([cipher.update(value.trim(), "utf8"), cipher.final()]);
  return ["v1", nonce.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}
export function decryptPlanningSecret(value: string) {
  const [version, nonce, tag, bytes] = value.split(".");
  if (version !== "v1" || !nonce || !tag || !bytes) throw new Error("Dado protegido inválido.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(nonce, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(bytes, "base64url")), decipher.final()]).toString("utf8");
}
