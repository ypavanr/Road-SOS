import { API_GATEWAY_URL } from '../../config';

export const sendSOSViaTelegram = async (locationData, attachmentUri = null) => {
  try {
    const payload = { ...locationData };

    // If attachment provided, upload it first
    if (attachmentUri) {
      try {
        const photoUrl = await uploadAttachment(attachmentUri);
        payload.photoUrl = photoUrl;
      } catch (e) {
        console.error("Failed to upload attachment to backend:", e);
        // Continue sending without photo if upload fails
      }
    }

    const res = await fetch(`${API_GATEWAY_URL}/sos/telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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

const uploadAttachment = async (uri) => {
  const filename = uri.split('/').pop() || 'photo.jpg';
  let mimeType = 'image/jpeg';
  if (filename.toLowerCase().endsWith('.png')) {
    mimeType = 'image/png';
  } else if (filename.toLowerCase().endsWith('.gif')) {
    mimeType = 'image/gif';
  }

  // 1. Try Catbox.moe (primary reliable public host)
  try {
    const formData = new FormData();
    formData.append("reqtype", "fileupload");
    formData.append("fileToUpload", {
      uri: uri,
      name: filename,
      type: mimeType,
    });

    const response = await fetch("https://catbox.moe/user/api.php", {
      method: "POST",
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.ok) {
      const url = await response.text();
      if (url.startsWith('http')) {
        return url.trim();
      }
    }
  } catch (e) {
    console.warn("Catbox upload failed, trying fallback...", e);
  }

  // 2. Try 0x0.st (secondary public host)
  try {
    const formData = new FormData();
    formData.append('file', {
      uri: uri,
      name: filename,
      type: mimeType,
    });

    const response = await fetch('https://0x0.st', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.ok) {
      const url = await response.text();
      if (url.startsWith('http')) {
        return url.trim();
      }
    }
  } catch (e) {
    console.warn("0x0.st upload failed, trying local upload fallback...", e);
  }

  // 3. Try Local server (LAN backup)
  try {
    const formData = new FormData();
    formData.append('file', {
      uri: uri,
      name: filename,
      type: mimeType,
    });

    const response = await fetch(`${API_GATEWAY_URL}/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        return data.url || data.file_url;
      }
    }
  } catch (e) {
    console.error("All upload channels failed:", e);
  }

  throw new Error("Unable to upload image to any hosting service");
};

export const sendLocationPin = async (locationData) => {
  // Now handled by the single /sos/telegram endpoint which sends both text and pin
  return;
};
