"use client";
import React, { useEffect, useState } from "react";
import { subscribeWS } from "@/lib/ws";
import { AlertTriangle, CheckCircle, X } from "lucide-react";

interface Notification {
  id: string;
  type: "success" | "warning" | "error";
  title: string;
  message: string;
  timestamp: number;
}

const NotificationContainer: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeWS((data: unknown) => {
      if (typeof data !== "object" || data === null) return;

      const wsData = data as { type?: string; timestamp?: number; clearedBy?: string };

      if (wsData.type === "canvasClear") {
        const notification: Notification = {
          id: `canvas-clear-${Date.now()}`,
          type: "warning",
          title: "🧽 Toile Nettoyée",
          message: `La toile a été complètement remise à zéro par un administrateur.`,
          timestamp: wsData.timestamp || Date.now(),
        };

        setNotifications(prev => [...prev, notification]);

        // Auto-remove after 10 seconds
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== notification.id));
        }, 10000);
      }
    });

    return unsubscribe;
  }, []);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 space-y-3 pointer-events-none">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="animate-toast-slide-in pointer-events-auto"
        >
          <div className={`
            glass-panel rounded-xl p-4 min-w-80 max-w-md shadow-lg border-l-4
            ${notification.type === "success" 
              ? "border-green-400 bg-green-50/90 dark:bg-green-900/20" 
              : notification.type === "warning"
              ? "border-amber-400 bg-amber-50/90 dark:bg-amber-900/20"
              : "border-red-400 bg-red-50/90 dark:bg-red-900/20"
            }
          `}>
            <div className="flex items-start gap-3">
              <div className={`
                flex-shrink-0 w-6 h-6 mt-0.5
                ${notification.type === "success" 
                  ? "text-green-500" 
                  : notification.type === "warning"
                  ? "text-amber-500"
                  : "text-red-500"
                }
              `}>
                {notification.type === "success" && <CheckCircle size={24} />}
                {notification.type === "warning" && <AlertTriangle size={24} />}
                {notification.type === "error" && <AlertTriangle size={24} />}
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className={`
                  font-semibold text-sm
                  ${notification.type === "success" 
                    ? "text-green-800 dark:text-green-200" 
                    : notification.type === "warning"
                    ? "text-amber-800 dark:text-amber-200"
                    : "text-red-800 dark:text-red-200"
                  }
                `}>
                  {notification.title}
                </h4>
                <p className={`
                  text-sm mt-1
                  ${notification.type === "success" 
                    ? "text-green-700 dark:text-green-300" 
                    : notification.type === "warning"
                    ? "text-amber-700 dark:text-amber-300"
                    : "text-red-700 dark:text-red-300"
                  }
                `}>
                  {notification.message}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {new Date(notification.timestamp).toLocaleTimeString()}
                </p>
              </div>
              
              <button
                onClick={() => removeNotification(notification.id)}
                className={`
                  flex-shrink-0 w-5 h-5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 
                  flex items-center justify-center transition-colors
                  ${notification.type === "success" 
                    ? "text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200" 
                    : notification.type === "warning"
                    ? "text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200"
                    : "text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                  }
                `}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationContainer;
