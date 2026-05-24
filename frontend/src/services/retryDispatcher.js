import { getOfflineQueue, dequeueSOS } from './offlineQueueService';
import { API_GATEWAY_URL } from '../../config';
import { checkConnectivity } from './networkService';
import axios from 'axios';

export const dispatchPendingSOS = async () => {
  const isOnline = await checkConnectivity();
  if (!isOnline) return;

  const queue = await getOfflineQueue();
  const pending = queue.filter(q => q.status === 'pending');

  if (pending.length === 0) return;

  console.log(`Attempting to dispatch ${pending.length} pending SOS packets...`);

  for (const packet of pending) {
    try {
      // Logic to sync offline SOS with backend
      // Normally, you would hit an endpoint like /offline-sync or /classify
      // Here we assume a generic sync endpoint or just rely on backend handling the text
      const response = await axios.post(`${API_GATEWAY_URL}/classify`, {
        text: packet.text || "Offline emergency reported.",
        lat: packet.location?.lat,
        lon: packet.location?.lon,
        isOfflineSync: true,
        policeStationContacted: packet.cached_facility?.name
      });

      console.log(`Successfully dispatched SOS packet ${packet.id}`);
      await dequeueSOS(packet.id);
    } catch (e) {
      console.error(`Error dispatching SOS packet ${packet.id}:`, e);
      // It will stay in the queue to try again later
    }
  }
};
