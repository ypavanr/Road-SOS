import NetInfo from '@react-native-community/netinfo';

export const checkConnectivity = async () => {
  const state = await NetInfo.fetch();
  return state.isConnected && state.isInternetReachable !== false;
};

export const subscribeToNetwork = (callback) => {
  return NetInfo.addEventListener((state) => {
    callback(state.isConnected && state.isInternetReachable !== false);
  });
};

export const verifyOnlineStatusViaWebSocket = (timeoutMs = 8000) => {
  return new Promise((resolve) => {
    try {
      const { API_GATEWAY_URL } = require('../../config');
      // Convert http:// to ws://
      const wsUrl = API_GATEWAY_URL.replace(/^http/, 'ws') + '/ws/ping';
      const ws = new WebSocket(wsUrl);

      let isResolved = false;

      const timeoutId = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          ws.close();
          console.log(`WebSocket health check timed out after ${timeoutMs}ms`);
          resolve(false);
        }
      }, timeoutMs);

      ws.onopen = () => {
        ws.send('ping');
      };

      ws.onmessage = (e) => {
        if (e.data === 'pong' && !isResolved) {
          isResolved = true;
          clearTimeout(timeoutId);
          ws.close();
          console.log('WebSocket health check succeeded!');
          resolve(true);
        }
      };

      ws.onerror = (e) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeoutId);
          ws.close();
          console.error('WebSocket health check failed:', e.message);
          resolve(false);
        }
      };

    } catch (err) {
      console.error('WebSocket setup error:', err);
      resolve(false);
    }
  });
};
