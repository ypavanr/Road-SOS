import React, { useEffect, useRef } from 'react';
import { useEmergency } from '../context/EmergencyContext';
import { subscribeToNetwork, verifyOnlineStatusViaWebSocket } from './networkService';
import { dispatchPendingSOS } from './retryDispatcher';
import { updateCacheIfNeeded } from './cacheService';
import { getLocationData } from './locationService';

export default function ConnectivityMonitor() {
  const { setIsOffline } = useEmergency();
  const checkingRef = useRef(false);

  useEffect(() => {
    const unsubscribe = subscribeToNetwork(async (isConnected) => {
      if (!isConnected) {
        setIsOffline(true);
        return;
      }

      // If NetInfo says we are connected (e.g. cellular), verify if we can actually reach our backend
      // This is crucial because local dev servers (192.168.x.x) are unreachable on cellular
      if (checkingRef.current) return;
      checkingRef.current = true;

      const serverReachable = await verifyOnlineStatusViaWebSocket(4000);
      checkingRef.current = false;
      
      const offline = !serverReachable;
      setIsOffline(offline);
      
      if (serverReachable) {
        // Automatically dispatch queued SOS when back online
        dispatchPendingSOS();
        
        // Attempt to gracefully preload data if conditions are met
        try {
          const loc = await getLocationData();
          if (loc) {
            updateCacheIfNeeded(loc.latitude, loc.longitude);
          }
        } catch (e) {
          console.log("Failed to get location for reconnect preload:", e);
        }
      }
    });

    // Also do an initial check on mount
    verifyOnlineStatusViaWebSocket(4000).then(serverReachable => {
      setIsOffline(!serverReachable);
    });

    return () => unsubscribe();
  }, [setIsOffline]);

  return null; // This component does not render anything
}
