import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';

export const useLanguageStore = create((set, get) => ({
  language: 'en',
  setLanguage: async (lang) => {
    set({ language: lang });
    await AsyncStorage.setItem('app_language', lang);
    
    // Always force LTR regardless of language
    if (I18nManager.isRTL) {
      I18nManager.allowRTL(false);
      I18nManager.forceRTL(false);
    }
  },
  initLanguage: async () => {
    const lang = await AsyncStorage.getItem('app_language');
    // Ensure LTR on startup
    if (I18nManager.isRTL) {
      I18nManager.allowRTL(false);
      I18nManager.forceRTL(false);
    }
    
    if (lang) {
      set({ language: lang });
      return lang;
    }
    return null;
  }
}));
