// ============================================================
//  SOS APP CONFIGURATION
//  Replace all placeholder values before deploying
// ============================================================

export const TELEGRAM_CONFIG = {
  // Create a bot via @BotFather on Telegram → copy the token here
  BOT_TOKEN: '8876983039:AAGFvptijgQ0XcqWSl2slX3KcFoPmfm_tPU',

  // Telegram Chat IDs to receive the alert
  // To find a Chat ID: message @userinfobot on Telegram
  AUTHORITY_CHAT_IDS: [
    ' 6698486618',  // e.g. Your personal contact
  ],
};

// Phone numbers that will receive the SMS alert
// Format: international format e.g. '+919876543210'
export const SMS_NUMBERS = [
  '+918722273804',
  '+917892978757',   // Authority / Police  // Personal emergency contact — add yours here
];

// Person who will be sending the SOS
export const USER_INFO = {
  name:         'tanish',
  phone:        '+918722273804',
  medicalNotes: 'None',        // allergies, conditions — leave 'None' if none
  address:      'HAL C & D QUARTERS, HAL, Bangalore, Karnataka 560037',
};

// Countdown before SOS fires (seconds)
export const COUNTDOWN_SECONDS = 5;
