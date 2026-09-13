import { cookies } from "next/headers";
import pt from "./pt.json";
import en from "./en.json";
import es from "./es.json";

type Locale = "pt" | "en" | "es";
const dictionaries = { pt, en, es };

export async function getServerTranslations() {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("NEXT_LOCALE")?.value;
  const locale: Locale = (localeCookie && ["pt", "en", "es"].includes(localeCookie)) 
    ? (localeCookie as Locale) 
    : "pt";
  
  const t = (path: string, params?: Record<string, string | number>): string => {
    const keys = path.split(".");
    let current: Record<string, unknown> | string = dictionaries[locale] as Record<string, unknown>;
    
    for (const key of keys) {
      if (typeof current === "object" && current !== null && current[key] === undefined) {
        // Fallback to portuguese
        let fallbackCurrent: Record<string, unknown> | string = dictionaries["pt"] as Record<string, unknown>;
        for (const fbKey of keys) {
          if (typeof fallbackCurrent === "object" && fallbackCurrent !== null && fallbackCurrent[fbKey] === undefined) return path;
          fallbackCurrent = (fallbackCurrent as Record<string, unknown>)[fbKey] as Record<string, unknown> | string;
        }
        return fallbackCurrent as string;
      }
      current = (current as Record<string, unknown>)[key] as Record<string, unknown> | string;
    }
    
    const rawResult = typeof current === "string" ? current : path;
    
    if (params && typeof rawResult === "string") {
      return Object.keys(params).reduce((str, key) => {
        return str.replace(new RegExp(`{{${key}}}`, 'g'), String(params[key]));
      }, rawResult);
    }
    
    return rawResult;
  };

  return { t, locale };
}
