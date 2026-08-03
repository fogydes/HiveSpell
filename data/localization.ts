import { wordBank as englishWordBank, MODE_ORDER } from "./words";

export type LocaleId = "en" | "es" | "fr" | "ar";
export type TextDirection = "ltr" | "rtl";

export interface LocaleConfig {
  id: LocaleId;
  label: string;
  nativeLabel: string;
  speechLang: string;
  dictionaryLang: string | null;
  direction: TextDirection;
}

export const DEFAULT_LOCALE: LocaleId = "en";

export const LOCALES: Record<LocaleId, LocaleConfig> = {
  en: {
    id: "en",
    label: "English",
    nativeLabel: "English",
    speechLang: "en-US",
    dictionaryLang: "en",
    direction: "ltr",
  },
  es: {
    id: "es",
    label: "Spanish",
    nativeLabel: "Español",
    speechLang: "es-ES",
    dictionaryLang: null,
    direction: "ltr",
  },
  fr: {
    id: "fr",
    label: "French",
    nativeLabel: "Français",
    speechLang: "fr-FR",
    dictionaryLang: null,
    direction: "ltr",
  },
  ar: {
    id: "ar",
    label: "Arabic",
    nativeLabel: "العربية",
    speechLang: "ar-SA",
    dictionaryLang: null,
    direction: "rtl",
  },
};

// All locales use the English word bank - only UI text is localized
export const localizedWordBanks: Record<LocaleId, Record<string, string[]>> = {
  en: englishWordBank,
  es: englishWordBank,
  fr: englishWordBank,
  ar: englishWordBank,
};

export const resolveLocale = (locale: string | null | undefined): LocaleId => {
  return locale && locale in LOCALES ? (locale as LocaleId) : DEFAULT_LOCALE;
};

export const getLocaleConfig = (locale: string | null | undefined): LocaleConfig => {
  return LOCALES[resolveLocale(locale)];
};

export const getWordBankForLocale = (
  locale: string | null | undefined,
): Record<string, string[]> => {
  return localizedWordBanks[resolveLocale(locale)];
};
