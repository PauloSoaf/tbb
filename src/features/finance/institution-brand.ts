import { issuerKey } from "./card-statements";

/** Visual identity of a bank: a monogram on its brand color, never a third-party logo asset. */
export type InstitutionBrand = { label: string; monogram: string; background: string; foreground: string };

const BRANDS: (InstitutionBrand & { keys: string[] })[] = [
  { keys: ["nubank", "nu pagamentos"], label: "Nubank", monogram: "Nu", background: "#820ad1", foreground: "#ffffff" },
  { keys: ["itau", "itau unibanco", "personnalite"], label: "Itaú", monogram: "It", background: "#ec7000", foreground: "#0a1f5c" },
  { keys: ["picpay"], label: "PicPay", monogram: "Pi", background: "#21c25e", foreground: "#062b16" },
  { keys: ["inter", "banco inter"], label: "Inter", monogram: "In", background: "#ff7a00", foreground: "#ffffff" },
  { keys: ["c6", "c6 bank"], label: "C6 Bank", monogram: "C6", background: "#242424", foreground: "#ffffff" },
  { keys: ["santander"], label: "Santander", monogram: "Sa", background: "#ec0000", foreground: "#ffffff" },
  { keys: ["bradesco"], label: "Bradesco", monogram: "Br", background: "#cc092f", foreground: "#ffffff" },
  { keys: ["caixa", "caixa economica"], label: "Caixa", monogram: "Cx", background: "#005ca9", foreground: "#ffffff" },
  { keys: ["banco do brasil", "bb"], label: "Banco do Brasil", monogram: "BB", background: "#fcfc30", foreground: "#0038a8" },
  { keys: ["mercado pago"], label: "Mercado Pago", monogram: "MP", background: "#00b1ea", foreground: "#ffffff" },
  { keys: ["xp", "xp investimentos"], label: "XP", monogram: "XP", background: "#111111", foreground: "#f5c518" },
  { keys: ["btg", "btg pactual"], label: "BTG Pactual", monogram: "BT", background: "#001e62", foreground: "#ffffff" },
];

/** Matches the institution first, then the account name, by whole words and ignoring accents. */
export function institutionBrand(institution: string | null | undefined, name: string): InstitutionBrand {
  for (const value of [institution, name]) {
    const words = ` ${issuerKey(value || "")} `;
    const brand = BRANDS.find((item) => item.keys.some((key) => words.includes(` ${key} `)));
    if (brand) return { label: brand.label, monogram: brand.monogram, background: brand.background, foreground: brand.foreground };
  }
  const label = (institution || name).trim() || "Cartão";
  const monogram = label.split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase() || "?";
  let hash = 0;
  for (const char of issuerKey(label)) hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return { label, monogram, background: `hsl(${hash} 42% 42%)`, foreground: "#ffffff" };
}
