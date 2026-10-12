import { dateOnly, normalizeDate, parseMoney } from "./money";

export const personalAssetKinds = ["VEHICLE", "ELECTRONIC", "PROPERTY", "OTHER"] as const;
export type PersonalAssetKind = typeof personalAssetKinds[number];
export type PersonalAssetRow = {
  id: string; name: string; kind: PersonalAssetKind; valueCents: number; valuationDate: string;
  purchaseValueCents: number | null; purchaseDate: string | null; notes: string | null;
  debtId: string | null; debt: { name: string; remainingBalanceCents: number; status: string } | null;
  archivedAt: string | null; version: number;
};

/** A valuation is a balance-sheet estimate, never a ledger transaction. */
export function parsePersonalAsset(fd: FormData, today: string) {
  const text = (key: string) => String(fd.get(key) || "").trim();
  const name = text("name"), kind = text("kind") as PersonalAssetKind;
  if (!name || name.length > 200) throw new Error("Informe um nome com até 200 caracteres.");
  if (!personalAssetKinds.includes(kind)) throw new Error("Selecione um tipo de bem válido.");
  if (!text("value")) throw new Error("Informe o valor atual estimado.");
  const valueCents = parseMoney(text("value"));
  const valuationDate = normalizeDate(text("valuationDate"));
  const purchaseDate = text("purchaseDate") ? normalizeDate(text("purchaseDate")) : null;
  if (valuationDate > today || purchaseDate && purchaseDate > today) throw new Error("Use uma data até hoje.");
  if (purchaseDate && purchaseDate > valuationDate) throw new Error("A avaliação deve ser na data da compra ou depois dela.");
  if (text("notes").length > 1000) throw new Error("Use até 1000 caracteres nas observações.");
  return {
    name, kind, valueCents, valuationDate: dateOnly(valuationDate),
    purchaseValueCents: text("purchaseValue") ? parseMoney(text("purchaseValue")) : null,
    purchaseDate: purchaseDate ? dateOnly(purchaseDate) : null,
    notes: text("notes") || null, debtId: text("debtId") || null,
  };
}

export function personalAssetsValue(assets: { valueCents: number; archivedAt: unknown }[]) {
  return assets.reduce((sum, asset) => sum + (asset.archivedAt ? 0 : asset.valueCents), 0);
}

/** All existing liabilities have already been deducted from financial net worth. */
export function netWorthWithPersonalAssets(financialCents: number, assets: { valueCents: number; archivedAt: unknown }[]) {
  const personalAssetsCents = personalAssetsValue(assets);
  return { financialNetWorthCents: financialCents, personalAssetsCents, netWorthCents: financialCents + personalAssetsCents };
}
