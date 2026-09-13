import { ptBR, enUS, es } from "date-fns/locale";
import { format, formatDistanceToNow } from "date-fns";

type Locale = "pt" | "en" | "es";

const dateFnsLocales = { pt: ptBR, en: enUS, es };

export function getDateFnsLocale(locale: Locale) {
  return dateFnsLocales[locale] ?? ptBR;
}

export function formatDateByLocale(date: Date | string, locale: Locale, pattern = "dd MMM") {
  return format(new Date(date), pattern, { locale: getDateFnsLocale(locale) });
}

export function formatDistanceByLocale(date: Date | string, locale: Locale) {
  return formatDistanceToNow(new Date(date), { locale: getDateFnsLocale(locale), addSuffix: true });
}
