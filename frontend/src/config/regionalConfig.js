export const REGIONAL_CONFIG = {
  IN: {
    countryCode: 'IN',
    defaultLang: 'en',
    hotlines: {
      sos: { number: '112', subtitle: 'National Emer...', icon: 'warning', color: '#ef4444', type: 'sms' },
      ambulance: { number: '108', subtitle: 'Ambulance', icon: 'medkit', color: '#f97316', type: 'call' },
      highway: { number: '1033', subtitle: 'NHAI Highway', icon: 'git-network', color: '#3b82f6', type: 'call' },
      police: { number: '100', subtitle: 'Police', icon: 'shield-checkmark', color: '#14b8a6', type: 'call' }
    }
  },
  US: {
    countryCode: 'US',
    defaultLang: 'en',
    hotlines: {
      sos: { number: '911', subtitle: 'National Emer...', icon: 'warning', color: '#ef4444', type: 'sms' },
      ambulance: { number: '911', subtitle: 'Ambulance', icon: 'medkit', color: '#f97316', type: 'call' },
      highway: { number: '311', subtitle: 'Highway Help', icon: 'git-network', color: '#3b82f6', type: 'call' },
      police: { number: '911', subtitle: 'Police', icon: 'shield-checkmark', color: '#14b8a6', type: 'call' }
    }
  },
  GB: {
    countryCode: 'GB',
    defaultLang: 'en',
    hotlines: {
      sos: { number: '999', subtitle: 'National Emer...', icon: 'warning', color: '#ef4444', type: 'sms' },
      ambulance: { number: '999', subtitle: 'Ambulance', icon: 'medkit', color: '#f97316', type: 'call' },
      highway: { number: '111', subtitle: 'Highway Help', icon: 'git-network', color: '#3b82f6', type: 'call' },
      police: { number: '999', subtitle: 'Police', icon: 'shield-checkmark', color: '#14b8a6', type: 'call' }
    }
  },
  AU: {
    countryCode: 'AU',
    defaultLang: 'en',
    hotlines: {
      sos: { number: '000', subtitle: 'National Emer...', icon: 'warning', color: '#ef4444', type: 'sms' },
      ambulance: { number: '000', subtitle: 'Ambulance', icon: 'medkit', color: '#f97316', type: 'call' },
      highway: { number: '131444', subtitle: 'Highway Help', icon: 'git-network', color: '#3b82f6', type: 'call' },
      police: { number: '000', subtitle: 'Police', icon: 'shield-checkmark', color: '#14b8a6', type: 'call' }
    }
  },
  FR: {
    countryCode: 'FR',
    defaultLang: 'fr',
    hotlines: {
      sos: { number: '112', subtitle: 'National Emer...', icon: 'warning', color: '#ef4444', type: 'sms' },
      ambulance: { number: '15', subtitle: 'Ambulance', icon: 'medkit', color: '#f97316', type: 'call' },
      highway: { number: '112', subtitle: 'Highway Help', icon: 'git-network', color: '#3b82f6', type: 'call' },
      police: { number: '17', subtitle: 'Police', icon: 'shield-checkmark', color: '#14b8a6', type: 'call' }
    }
  },
  JP: {
    countryCode: 'JP',
    defaultLang: 'ja',
    hotlines: {
      sos: { number: '110', subtitle: 'National Emer...', icon: 'warning', color: '#ef4444', type: 'sms' },
      ambulance: { number: '119', subtitle: 'Ambulance', icon: 'medkit', color: '#f97316', type: 'call' },
      highway: { number: '#9910', subtitle: 'Highway Help', icon: 'git-network', color: '#3b82f6', type: 'call' },
      police: { number: '110', subtitle: 'Police', icon: 'shield-checkmark', color: '#14b8a6', type: 'call' }
    }
  },
  CN: {
    countryCode: 'CN',
    defaultLang: 'zh',
    hotlines: {
      sos: { number: '110', subtitle: 'National Emer...', icon: 'warning', color: '#ef4444', type: 'sms' },
      ambulance: { number: '120', subtitle: 'Ambulance', icon: 'medkit', color: '#f97316', type: 'call' },
      highway: { number: '122', subtitle: 'Highway Help', icon: 'git-network', color: '#3b82f6', type: 'call' },
      police: { number: '110', subtitle: 'Police', icon: 'shield-checkmark', color: '#14b8a6', type: 'call' }
    }
  },
  // Default fallback
  DEFAULT: {
    countryCode: 'DEFAULT',
    defaultLang: 'en',
    hotlines: {
      sos: { number: '112', subtitle: 'National Emer...', icon: 'warning', color: '#ef4444', type: 'sms' },
      ambulance: { number: '112', subtitle: 'Ambulance', icon: 'medkit', color: '#f97316', type: 'call' },
      highway: { number: '112', subtitle: 'Highway Help', icon: 'git-network', color: '#3b82f6', type: 'call' },
      police: { number: '112', subtitle: 'Police', icon: 'shield-checkmark', color: '#14b8a6', type: 'call' }
    }
  }
};

export const getRegionalConfig = (isoCountryCode) => {
  if (!isoCountryCode) return REGIONAL_CONFIG.DEFAULT;
  const config = REGIONAL_CONFIG[isoCountryCode.toUpperCase()];
  return config || REGIONAL_CONFIG.DEFAULT;
};
