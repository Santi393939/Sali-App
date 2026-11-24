/**
 * Languages: English (source), Arabic and French.
 *
 * Strings are written in English in the code and wrapped in t('…'); the
 * Arabic and French tables (content/i18n) map each English string to its
 * translation, so a missing one simply shows in English. Variables use
 * {name} placeholders: t('{n} day streak', { n: 12 }).
 *
 * The root layout sets the active language before rendering and rebuilds
 * the screens when it changes (like the theme). Numbers keep English
 * digits in every language, as the brief asks.
 */
import { AR } from '@/content/i18n/ar';
import { FR } from '@/content/i18n/fr';

export type Lang = 'en' | 'ar' | 'fr';

const TABLES: Record<Exclude<Lang, 'en'>, Record<string, string>> = { ar: AR, fr: FR };

let active: Lang = 'en';
export function setLanguage(l: Lang) {
  active = l;
}
export const getLanguage = () => active;
export const isRTL = () => active === 'ar';

export function t(text: string, vars?: Record<string, string | number>): string {
  let out = active === 'en' ? text : (TABLES[active][text] ?? text);
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  return out;
}

/** Locale for dates (Arabic keeps Latin digits). */
export function dateLocale(): string {
  return active === 'ar' ? 'ar-u-nu-latn' : active === 'fr' ? 'fr-FR' : 'en-US';
}

/** Best guess from the phone's settings. */
export function deviceLanguage(): Lang {
  try {
    const loc = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();
    if (loc.startsWith('ar')) return 'ar';
    if (loc.startsWith('fr')) return 'fr';
  } catch {}
  return 'en';
}

/** Wrap a content object so the listed text fields translate when read. */
export function localized<T extends object>(item: T, fields: (keyof T)[]): T {
  return new Proxy(item, {
    get(target, key, receiver) {
      const value = Reflect.get(target, key, receiver);
      return typeof value === 'string' && fields.includes(key as keyof T) ? t(value) : value;
    },
  });
}

export const LANGUAGES: { id: Lang; name: string }[] = [
  { id: 'en', name: 'English' },
  { id: 'ar', name: 'العربية' },
  { id: 'fr', name: 'Français' },
];

/** localized() for every entry of a keyed table (only `name` is translated). */
export function localizeAll<T extends Record<string, { name: string }>>(table: T): T {
  const out = {} as T;
  for (const k of Object.keys(table) as (keyof T)[]) out[k] = localized(table[k], ['name']);
  return out;
}
