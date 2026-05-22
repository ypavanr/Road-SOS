import { TELEGRAM_CONFIG, USER_INFO } from '../config/config';

const buildMessage = ({ latitude, longitude, accuracy, timestamp, batteryLevel, deviceModel }) => {
  const time = new Date(timestamp).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
  const osmLink  = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}&zoom=16`;

  return `🚨 *SOS EMERGENCY ALERT* 🚨

👤 *Person in Distress*
• Name: ${USER_INFO.name}
• Phone: ${USER_INFO.phone}
• Medical Notes: ${USER_INFO.medicalNotes}
• Home Address: ${USER_INFO.address}

📍 *Live Location*
• Latitude: \`${latitude.toFixed(6)}\`
• Longitude: \`${longitude.toFixed(6)}\`
• Accuracy: ±${Math.round(accuracy)} metres
• [Open in Google Maps](${mapsLink})
• [Open in OpenStreetMap](${osmLink})

🕐 *Time of Alert*
• ${time} (IST)

📱 *Device Info*
• Model: ${deviceModel}
• Battery: ${batteryLevel !== null ? batteryLevel + '%' : 'Unknown'}

⚠️ _This is an automated SOS. Please respond immediately._`;
};

export const sendSOSViaTelegram = async (locationData) => {
  const { BOT_TOKEN, AUTHORITY_CHAT_IDS } = TELEGRAM_CONFIG;

  if (!BOT_TOKEN || BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
    throw new Error('Telegram bot token not configured. Open src/config/config.js and add your BOT_TOKEN.');
  }

  const text = buildMessage(locationData);
  const errors = [];

  await Promise.all(
    AUTHORITY_CHAT_IDS.map(async (chatId) => {
      if (!chatId || chatId.startsWith('YOUR_CHAT_ID')) return;
      try {
        const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'Markdown',
            disable_web_page_preview: false,
          }),
        });
        const json = await res.json();
        if (!json.ok) errors.push(`Chat ${chatId}: ${json.description}`);
      } catch (err) {
        errors.push(`Chat ${chatId}: ${err.message}`);
      }
    })
  );

  return errors.length === 0
    ? { success: true }
    : { success: false, errors };
};

export const sendLocationPin = async ({ latitude, longitude }) => {
  const { BOT_TOKEN, AUTHORITY_CHAT_IDS } = TELEGRAM_CONFIG;
  if (!BOT_TOKEN || BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') return;

  await Promise.all(
    AUTHORITY_CHAT_IDS.map(async (chatId) => {
      if (!chatId || chatId.startsWith('YOUR_CHAT_ID')) return;
      try {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendLocation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, latitude, longitude }),
        });
      } catch (_) {}
    })
  );
};
