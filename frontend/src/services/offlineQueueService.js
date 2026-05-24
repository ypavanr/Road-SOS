import { setItem, getItem } from './emergencyStorage';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

const QUEUE_KEY = 'offline_sos_queue';

export const getOfflineQueue = async () => {
  const data = await getItem(QUEUE_KEY);
  return data || [];
};

export const enqueueSOS = async (packet) => {
  const queue = await getOfflineQueue();
  const newPacket = {
    ...packet,
    id: uuidv4(),
    timestamp: Date.now(),
    status: 'pending',
  };
  queue.push(newPacket);
  await setItem(QUEUE_KEY, queue);
  return newPacket;
};

export const dequeueSOS = async (id) => {
  const queue = await getOfflineQueue();
  const updatedQueue = queue.filter((item) => item.id !== id);
  await setItem(QUEUE_KEY, updatedQueue);
};

export const markSOSCompleted = async (id) => {
  const queue = await getOfflineQueue();
  const updatedQueue = queue.map((item) =>
    item.id === id ? { ...item, status: 'completed' } : item
  );
  // Keep completed packets for history or delete them? Usually delete or keep 10 latest
  await setItem(QUEUE_KEY, updatedQueue);
};
