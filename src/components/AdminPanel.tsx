import React, { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

interface PixelUpdate {
  x: number;
  y: number;
  color: number;
  username?: string;
}

interface AdminStats {
  connectedUsers: number;
  totalPixels: number;
  gridSize: { width: number; height: number };
  recentActions: Array<{
    x: number;
    y: number;
    color: number;
    username?: string;
    timestamp: number;
  }>;
}

interface AdminPanelProps {
  serverUrl?: string;
}

const AdminPanel: React.FC<AdminPanelProps> = ({
  serverUrl = "http://localhost:3001",
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [stats, setStats] = useState<AdminStats>({
    connectedUsers: 0,
    totalPixels: 0,
    gridSize: { width: 0, height: 0 },
    recentActions: [],
  });
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketConnection = io(serverUrl);
    setSocket(socketConnection);

    socketConnection.on("connect", () => {
      setIsConnected(true);
      // Demander les statistiques d'administration
      socketConnection.emit("requestAdminStats");
    });

    socketConnection.on("disconnect", () => {
      setIsConnected(false);
    });

    socketConnection.on("adminStats", (data: AdminStats) => {
      setStats(data);
    });

    socketConnection.on("pixelUpdates", (updates: PixelUpdate[]) => {
      // Mettre à jour les actions récentes
      setStats((prev) => ({
        ...prev,
        recentActions: [
          ...updates.map((update) => ({
            ...update,
            timestamp: Date.now(),
          })),
          ...prev.recentActions,
        ].slice(0, 10), // Garder seulement les 10 dernières
      }));
    });

    return () => {
      socketConnection.disconnect();
    };
  }, [serverUrl]);

  const clearGrid = () => {
    if (
      socket &&
      window.confirm("Êtes-vous sûr de vouloir effacer toute la grille ?")
    ) {
      socket.emit("clearGrid");
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Panneau d'Administration
        </h2>
        <div
          className={`flex items-center gap-2 ${isConnected ? "text-green-600" : "text-red-600"}`}
        >
          <div
            className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
          />
          {isConnected ? "Connecté" : "Déconnecté"}
        </div>
      </div>

      {/* Statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">
            Utilisateurs Connectés
          </h3>
          <p className="text-3xl font-bold text-blue-600">
            {stats.connectedUsers}
          </p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            Total Pixels
          </h3>
          <p className="text-3xl font-bold text-green-600">
            {stats.totalPixels.toLocaleString()}
          </p>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-purple-800 mb-2">
            Taille Grille
          </h3>
          <p className="text-xl font-bold text-purple-600">
            {stats.gridSize.width} × {stats.gridSize.height}
          </p>
        </div>
      </div>

      {/* Actions récentes */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Actions Récentes
        </h3>
        <div className="bg-gray-50 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Heure
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Utilisateur
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Position
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Couleur
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stats.recentActions.map((action, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {formatTime(action.timestamp)}
                    </td>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">
                      {action.username || "Anonyme"}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      ({action.x}, {action.y})
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <span
                        className="inline-block w-4 h-4 rounded border border-gray-300"
                        style={{
                          backgroundColor: `hsl(${action.color * 22.5}, 70%, 50%)`,
                        }}
                      />
                      <span className="ml-2 text-gray-600">
                        #{action.color}
                      </span>
                    </td>
                  </tr>
                ))}
                {stats.recentActions.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      Aucune action récente
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Actions d'administration */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Actions d'Administration
        </h3>
        <div className="flex gap-4">
          <button
            onClick={clearGrid}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            disabled={!isConnected}
          >
            Effacer la Grille
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Recharger la Page
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
