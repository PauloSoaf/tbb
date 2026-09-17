import type { InvestmentCopyKey } from "./investment-copy";

export type InvestmentSection = { id: string; href: string; key: InvestmentCopyKey; overflow?: boolean };

export const investmentSections = [
  { id: "overview", href: "/finance/investments", key: "overview", overflow: false },
  { id: "portfolio", href: "/finance/investments/portfolio", key: "portfolio", overflow: false },
  { id: "fixed-income", href: "/finance/investments/fixed-income", key: "fixedIncome", overflow: false },
  { id: "stocks", href: "/finance/investments/stocks", key: "stocks", overflow: false },
  { id: "crypto", href: "/finance/investments/crypto", key: "crypto", overflow: false },
  { id: "income", href: "/finance/investments/income", key: "income", overflow: false },
  { id: "goals", href: "/finance/investments/goals", key: "goals", overflow: false },
  { id: "research", href: "/finance/investments/research", key: "research", overflow: false },
  { id: "etfs", href: "/finance/investments/etfs", key: "etfs", overflow: true },
  { id: "fiis", href: "/finance/investments/fiis", key: "fiis", overflow: true },
  { id: "funds", href: "/finance/investments/funds", key: "funds", overflow: true },
  { id: "real-estate", href: "/finance/investments/real-estate", key: "realEstate", overflow: true },
  { id: "trading", href: "/finance/investments/trading", key: "trading", overflow: true },
  { id: "watchlist", href: "/finance/investments/watchlist", key: "watchlist", overflow: true },
  { id: "simulator", href: "/finance/investments/simulator", key: "simulator", overflow: true },
] as const satisfies readonly InvestmentSection[];

export type InvestmentSectionId = Exclude<(typeof investmentSections)[number]["id"], "overview">;

export function isInvestmentSectionId(value: string): value is InvestmentSectionId {
  return investmentSections.some((section) => section.id === value && section.id !== "overview");
}
