import { institutionBrand } from "./institution-brand";

export function BankBadge({ institution, name, size = 36 }: { institution: string | null | undefined; name: string; size?: number }) {
  const brand = institutionBrand(institution, name);
  return <span className="bank-badge" style={{ background: brand.background, color: brand.foreground, width: size, height: size, fontSize: Math.round(size * 0.36) }} title={brand.label} aria-hidden="true">{brand.monogram}</span>;
}
