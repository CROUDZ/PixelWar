import React, { useState, useEffect } from "react";
import {
  subscribeConnectionState,
  getConnectionState,
  forceReconnect,
  type ConnectionState,
} from "@/lib/ws";

interface ConnectionStatusProps {
  showDebugInfo?: boolean;
  className?: string;
}

export default function ConnectionStatus({
  showDebugInfo = false,
  className = "",
}: ConnectionStatusProps) {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>(getConnectionState());
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeConnectionState((state) => {
      setConnectionState(state);
    });

    return unsubscribe;
  }, []);

  const getStatusColor = () => {
    if (connectionState.isConnecting) return "bg-yellow-500";
    if (connectionState.isConnected) return "bg-green-500";
    return "bg-red-500";
  };

  const getStatusText = () => {
    if (connectionState.isConnecting) return "Connexion...";
    if (connectionState.isConnected) return "Connecté";
    return "Déconnecté";
  };

  const formatLastConnected = () => {
    if (!connectionState.lastConnected) return "Jamais";
    const date = new Date(connectionState.lastConnected);
    return date.toLocaleTimeString();
  };

  if (!showDebugInfo) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
        <span className="text-sm text-gray-600">{getStatusText()}</span>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center space-x-3">
          <div className={`w-4 h-4 rounded-full ${getStatusColor()}`} />
          <h3 className="font-semibold text-gray-800">État de la connexion</h3>
          <span className="text-sm text-gray-600">{getStatusText()}</span>
        </div>
        <button className="text-gray-400 hover:text-gray-600">
          {expanded ? "▼" : "▶"}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-medium text-gray-700">Statut:</span>
              <span className="ml-2 text-gray-600">{getStatusText()}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Tentatives:</span>
              <span className="ml-2 text-gray-600">
                {connectionState.reconnectAttempts}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">
                Dernière connexion:
              </span>
              <span className="ml-2 text-gray-600">
                {formatLastConnected()}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t">
            <button
              onClick={forceReconnect}
              disabled={connectionState.isConnecting}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {connectionState.isConnecting
                ? "Connexion..."
                : "Forcer la reconnexion"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
