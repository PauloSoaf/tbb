import { investmentSections } from "@/features/investments/investment-sections";
import { adminItem, navGroups } from "./navigation";

/** Translation key of every menu route. The single source for sidebar labels and breadcrumbs. */
const NAV_KEYS: Record<string, string> = {
  "/today": "today", "/habits": "habits", "/tasks": "tasks", "/goals": "goals", "/projects": "projects", "/calendar": "calendar",
  "/finance": "overview", "/finance/transactions": "transactions", "/finance/calendar": "spending_calendar", "/finance/accounts": "accounts", "/finance/budgets": "budgets",
  "/finance/subscriptions": "subscriptions", "/finance/debts": "debts", "/finance/statements": "statements", "/finance/savings": "savings", "/finance/assets": "personal_assets",
  "/finance/investments": "investments", "/finance/reports": "reports", "/career": "overview", "/career/applications": "applications",
  "/career/companies": "companies", "/career/interviews": "interviews", "/career/contacts": "contacts", "/career/documents": "documents",
  "/insights": "insights", "/integrations": "integrations", "/settings": "settings", "/admin": "admin",
};
export const navLabelKey = (href: string, fallback: string) => `nav.${NAV_KEYS[href] || fallback.toLowerCase()}`;

/** A crumb label is a translation key, an investment-section key, or the page's own title (with a
 * translated fallback until the page provides it). Never an id taken from the URL. */
export type CrumbLabel = { kind: "i18n"; key: string } | { kind: "text"; text: string } | { kind: "investment"; key: string } | { kind: "page"; fallbackKey: string };
export type Crumb = { href: string | null; label: CrumbLabel };
export type RouteTrail = { crumbs: Crumb[]; parentHref: string | null; keepParams: string[] };

const GROUP_HUB: Record<string, string | null> = { Life: null, Money: "/finance", Career: "/career" };
const menu = [...navGroups.flatMap((group) => group.items.map((item) => ({ href: item.href, label: item.label, group: group.name }))), { ...adminItem, group: "" }];
const root: Crumb = { href: "/today", label: { kind: "text", text: "TBB" } };
const i18n = (key: string, href: string | null = null): Crumb => ({ href, label: { kind: "i18n", key } });

function menuTrail(href: string): Crumb[] {
  const item = menu.find((entry) => entry.href === href);
  if (!item) return [root];
  const group = item.group ? [i18n(`group.${item.group.toLowerCase()}`, GROUP_HUB[item.group] ?? null)] : [];
  return [root, ...group, i18n(navLabelKey(item.href, item.label), item.href)];
}
function menuParent(href: string): string | null {
  if (href === "/today") return null;
  if (href.startsWith("/finance/")) return "/finance";
  if (href.startsWith("/career/")) return "/career";
  return "/today";
}

const DYNAMIC: { pattern: RegExp; trail: (match: RegExpMatchArray) => RouteTrail | null }[] = [
  { pattern: /^\/finance\/imports$/, trail: () => ({ crumbs: [...menuTrail("/finance"), i18n("crumb.investment_import")], parentHref: "/finance", keepParams: [] }) },
  { pattern: /^\/habits\/[^/]+$/, trail: () => ({ crumbs: [...menuTrail("/habits"), { href: null, label: { kind: "page", fallbackKey: "crumb.habit" } }], parentHref: "/habits", keepParams: [] }) },
  { pattern: /^\/career\/applications\/[^/]+$/, trail: () => ({ crumbs: [...menuTrail("/career/applications"), { href: null, label: { kind: "page", fallbackKey: "crumb.application" } }], parentHref: "/career/applications", keepParams: [] }) },
  { pattern: /^\/finance\/investments\/import$/, trail: () => ({ crumbs: [...menuTrail("/finance/investments"), i18n("crumb.investment_import")], parentHref: "/finance/investments", keepParams: ["scope"] }) },
  { pattern: /^\/finance\/investments\/([^/]+)$/, trail: (match) => {
    const section = investmentSections.find((item) => item.id === match[1]);
    return section ? { crumbs: [...menuTrail("/finance/investments"), { href: null, label: { kind: "investment", key: section.key } }], parentHref: "/finance/investments", keepParams: ["scope"] } : null;
  } },
  { pattern: /^\/partner\/accept\/[^/]+$/, trail: () => ({ crumbs: [...menuTrail("/settings"), i18n("crumb.partner_invite")], parentHref: "/settings", keepParams: [] }) },
  { pattern: /^\/finance\/debts\/simulator$/, trail: () => ({ crumbs: [...menuTrail("/finance/debts"), i18n("crumb.simulator")], parentHref: "/finance/debts", keepParams: [] }) },
  { pattern: /^\/weekly-review$/, trail: () => ({ crumbs: [...menuTrail("/today"), i18n("crumb.weekly_review")], parentHref: "/today", keepParams: [] }) },
];

/** Breadcrumb and back fallback for an authenticated path. Menu routes come from `navGroups`;
 * dynamic ones from the table above; anything else falls back to its closest menu ancestor. */
export function resolveRouteTrail(pathname: string): RouteTrail {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (menu.some((entry) => entry.href === path)) {
    return { crumbs: menuTrail(path), parentHref: menuParent(path), keepParams: path === "/finance/investments" ? ["scope"] : [] };
  }
  for (const route of DYNAMIC) {
    const match = path.match(route.pattern);
    const trail = match && route.trail(match);
    if (trail) return trail;
  }
  const ancestor = menu.filter((entry) => path.startsWith(`${entry.href}/`)).sort((a, b) => b.href.length - a.href.length)[0];
  return ancestor ? { crumbs: menuTrail(ancestor.href), parentHref: ancestor.href, keepParams: [] } : { crumbs: [root], parentHref: "/today", keepParams: [] };
}

/** Carries only the listed query parameters to an ancestor link (e.g. the investments scope). */
export function withKeptParams(href: string, search: URLSearchParams, keep: string[]) {
  const target = new URL(href, "https://tbb.invalid");
  for (const key of keep) { const value = search.get(key); if (value !== null) target.searchParams.set(key, value); }
  return `${target.pathname}${target.search}${target.hash}`;
}
