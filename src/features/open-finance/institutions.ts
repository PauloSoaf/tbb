/** Labels help the owner find a connection. They never authorize or enable an account mapping. */
export const INSTITUTIONS = [
  { id: "nubank", name: "Nubank", initials: "Nu" },
  { id: "itau", name: "Itaú", initials: "It" },
  { id: "picpay", name: "PicPay", initials: "Pi" },
] as const;
export type Institution = (typeof INSTITUTIONS)[number];

const patterns = { nubank: /\b(?:nubank|nu pagamentos)\b/, itau: /\bitau(?:card| unibanco)?\b/, picpay: /\bpic\s?pay\b/ };

export function connectionInstitution(labels: (string | null | undefined)[]): Institution | null {
  const text = labels.filter(Boolean).join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const matches = INSTITUTIONS.filter(institution => patterns[institution.id].test(text));
  return matches.length === 1 ? matches[0] : null;
}
