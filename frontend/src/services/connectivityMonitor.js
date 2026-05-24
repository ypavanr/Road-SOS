import React, { useEffect } from 'react';
import { useEmergency } from '../context/EmergencyContext';
import { subscribeToNetwork } from './networkService';
import { dispatchPendingSOS } from './retryDispatcher';

export default function ConnectivityMonitor() {
  const { setIsOffline } = useEmergency();

  useEffect(() => {
    const unsubscribe = subscribeToNetwork((isConnected) => {
      const offline = !isConnected;
      setIsOffline(offline);
      
      if (isConnected) {
        // Automatically dispatch queued SOS when back online
        dispatchPendingSOS();
      }
    });

    return () => unsubscribe();
  }, [setIsOffline]);

  return null; // This component does not render anything
}
