import { useTranslation } from 'react-i18next';
import { useLanguageStore } from '../../../store/languageStore';
import i18n from '../index';

export const useLanguage = () => {
  const { t } = useTranslation();
  const { language, setLanguage: setStoreLang } = useLanguageStore();

  const changeLanguage = async (lang) => {
    const isRTL = lang === 'ar';
    await i18n.changeLanguage(lang);
    await setStoreLang(lang, isRTL);
  };

  return { t, language, changeLanguage };
};
