import { API_GATEWAY_URL } from '../../config';

export const sendSOSViaTelegram = async (locationData) => {
  try {
    const res = await fetch(`${API_GATEWAY_URL}/sos/telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(locationData),
    });
    const json = await res.json();
    if (!json.success) {
      return { success: false, errors: json.errors };
    }
    return { success: true };
  } catch (err) {
    return { success: false, errors: [err.message] };
  }
};

export const sendLocationPin = async (locationData) => {
  // Now handled by the single /sos/telegram endpoint which sends both text and pin
  return;
};
