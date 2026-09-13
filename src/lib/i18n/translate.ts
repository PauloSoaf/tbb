export type TranslationParams = Record<string, string | number | boolean | null | undefined>;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function interpolateMessage(message: string, params?: TranslationParams): string {
  if (!params) return message;

  return Object.entries(params).reduce((current, [key, value]) => {
    if (key === "defaultValue" || value === null || value === undefined) return current;

    const escapedKey = escapeRegExp(key);
    return current
      .replace(new RegExp(`{{\\s*${escapedKey}\\s*}}`, "g"), String(value))
      .replace(new RegExp(`{\\s*${escapedKey}\\s*}`, "g"), String(value));
  }, message);
}

export function getDefaultTranslation(params?: TranslationParams): string | null {
  const defaultValue = params?.defaultValue;
  if (typeof defaultValue === "string" || typeof defaultValue === "number" || typeof defaultValue === "boolean") {
    return String(defaultValue);
  }
  return null;
}
