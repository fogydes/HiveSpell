import React, { useEffect, useState } from "react";
import { registerSW } from "virtual:pwa-register";

/**
 * PWA Update Handler Component
 * Handles service worker registration and update notifications
 */
export function PWAUpdateHandler() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);

  useEffect(() => {
    const updateSW = registerSW({
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onOfflineReady() {
        setOfflineReady(true);
      },
    });

    // Check for updates periodically
    const interval = setInterval(() => {
      updateSW();
    }, 60 * 60 * 1000); // Every hour

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {needRefresh && (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
          <div className="bg-panel border border-primary/30 rounded-xl p-4 shadow-xl max-w-sm">
            <div className="flex items-start gap-3">
              <div className="text-2xl">🔄</div>
              <div className="flex-1">
                <p className="font-semibold text-text-main">Update Available</p>
                <p className="text-sm text-text-muted mt-1">
                  A new version of HiveSpell is ready. Refresh to update.
                </p>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => {
                    setNeedRefresh(false);
                    window.location.reload();
                  }}
                  className="px-4 py-2 bg-primary text-primary-content rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors"
                >
                  Refresh
                </button>
                <button
                  onClick={() => setNeedRefresh(false)}
                  className="px-4 py-2 bg-surface text-text-main rounded-lg font-medium text-sm hover:bg-surface/80 transition-colors"
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {offlineReady && (
        <div className="fixed bottom-4 left-4 z-50 animate-slide-up">
          <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-xl p-3 shadow-xl max-w-sm">
            <div className="flex items-center gap-2 text-emerald-400">
              <span className="text-xl">📱</span>
              <span className="font-medium text-sm">
                HiveSpell is ready for offline use!
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Hook to check online/offline status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * Hook to manage offline queue for solo practice
 */
interface QueuedAction {
  id: string;
  type: "solo_practice" | "challenge_complete" | "stats_update";
  payload: any;
  timestamp: number;
  retries: number;
}

export function useOfflineQueue() {
  const isOnline = useOnlineStatus();
  const [queue, setQueue] = useState<QueuedAction[]>([]);

  // Load queue from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("hivespell_offline_queue");
    if (stored) {
      try {
        setQueue(JSON.parse(stored));
      } catch {
        localStorage.removeItem("hivespell_offline_queue");
      }
    }
  }, []);

  // Save queue to localStorage
  useEffect(() => {
    localStorage.setItem("hivespell_offline_queue", JSON.stringify(queue));
  }, [queue]);

  // Process queue when online
  useEffect(() => {
    if (!isOnline || queue.length === 0) return;

    const processQueue = async () => {
      const toProcess = [...queue];
      const processed: QueuedAction[] = [];

      for (const action of toProcess) {
        try {
          // Here you would dispatch to your actual services
          // For now, we'll just mark as processed
          processed.push(action);
          // Example: await submitAction(action);
        } catch (error) {
          // Increment retries
          if (action.retries < 3) {
            setQueue((prev) =>
              prev.map((a) =>
                a.id === action.id ? { ...a, retries: a.retries + 1 } : a
              )
            );
          }
        }
      }

      // Remove processed actions
      if (processed.length > 0) {
        setQueue((prev) => prev.filter((a) => !processed.includes(a)));
      }
    };

    processQueue();
  }, [isOnline, queue]);

  const addToQueue = React.useCallback(
    (type: QueuedAction["type"], payload: any) => {
      const action: QueuedAction = {
        id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
        type,
        payload,
        timestamp: Date.now(),
        retries: 0,
      };
      setQueue((prev) => [...prev, action]);
    },
    []
  );

  const clearQueue = React.useCallback(() => {
    setQueue([]);
  }, []);

  return { queue, addToQueue, clearQueue, isOnline, queueLength: queue.length };
}