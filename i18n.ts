import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // Load translations from public/locales/{lng}.json
    backend: {
      loadPath: '/locales/{{lng}}.json',
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'es', 'fr', 'ar'],
    preload: ['en', 'es', 'fr', 'ar'],
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
      caches: ['localStorage'],
      lookupLocalStorage: 'hivespell_language',
      // Only detect from HTML lang attribute
      htmlTag: document.documentElement,
    },
    interpolation: {
      escapeValue: false, // React already does escaping
    },
    react: {
      useSuspense: false, // We'll handle loading states manually
    },
    // Return keys as fallback if translation missing
    returnNull: false,
    returnEmptyString: false,
  });

// Helper to change language and update document direction
export const changeLanguage = async (lng: string) => {
  await i18n.changeLanguage(lng);

  // Update document direction for RTL languages
  const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
  document.documentElement.dir = rtlLanguages.includes(lng) ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;

  // Also save to localStorage for persistence
  localStorage.setItem('hivespell_language', lng);
};

// Initialize direction on load
const initDirection = () => {
  const savedLng = localStorage.getItem('hivespell_language') || i18n.language || 'en';
  const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
  document.documentElement.dir = rtlLanguages.includes(savedLng) ? 'rtl' : 'ltr';
  document.documentElement.lang = savedLng;
};

// Run on module load
if (typeof window !== 'undefined') {
  initDirection();
  // Also run when i18n is ready
  i18n.on('initialized', initDirection);
  i18n.on('languageChanged', initDirection);
}

// Expose i18n on window for debugging
if (typeof window !== 'undefined') {
  (window as any).i18n = i18n;
}

export default i18n;