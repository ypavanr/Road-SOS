import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from '../../locales/en/common.json';
import kn from '../../locales/kn/common.json';
import hi from '../../locales/hi/common.json';
import ta from '../../locales/ta/common.json';
import te from '../../locales/te/common.json';
import zh from '../../locales/zh/common.json';
import ja from '../../locales/ja/common.json';
import ar from '../../locales/ar/common.json';
import fr from '../../locales/fr/common.json';

const resources = {
  en: { translation: en },
  kn: { translation: kn },
  hi: { translation: hi },
  ta: { translation: ta },
  te: { translation: te },
  zh: { translation: zh },
  ja: { translation: ja },
  ar: { translation: ar },
  fr: { translation: fr },
};

const initI18n = async () => {
  let savedLanguage = await AsyncStorage.getItem('app_language');
  if (!savedLanguage) {
    savedLanguage = Localization.getLocales()[0]?.languageCode || 'en';
  }

  await i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: savedLanguage,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false,
      },
    });
};

export { initI18n };
export default i18n;
