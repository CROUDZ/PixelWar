import { useEffect, useState } from "react";
import { subscribeWS, getWS, isWSConnected } from "@/lib/ws";

const PixelInformations: React.FC = () => {
  const [count, setCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // S'assurer que la connexion est créée
    const ws = getWS();
    
    // Vérifier périodiquement l'état de la connexion
    const checkConnection = () => {
      setIsConnected(isWSConnected() ?? false);
    };
    
    const connectionInterval = setInterval(checkConnection, 1000);
    checkConnection(); // Vérification initiale

    // Abonnement aux messages
    console.log(ws);
    const unsubscribe = subscribeWS((data) => {
      console.log("WebSocket message received in PixelInformations:", data);
      
      if (typeof data === "object" && data !== null) {
        // Gérer différents types de messages
        if (data.type === "pixelCount" && typeof data.totalPixels === "number") {
          setCount(data.totalPixels);
        } else if (data.type === "init" && typeof data.totalPixels === "number") {
          // Au cas où le serveur envoie le count dans le message init
          setCount(data.totalPixels);
        } else if (data.type === "updatePixel") {
          // Incrémenter le compteur quand un nouveau pixel est placé
          setCount(prev => prev + 1);
        }
      }
    });

    return () => {
      unsubscribe();
      clearInterval(connectionInterval);
    };
  }, []);

  return (
    <div className="fixed bottom-0 right-0 p-4 bg-gray-800 text-white rounded-lg shadow-lg">
      <h3>Total Pixels Placed:</h3>
      <p>{count}</p>
      <div className="text-xs mt-2">
        Status: <span className={isConnected ? "text-green-400" : "text-red-400"}>
          {isConnected ? "Connected" : "Disconnected"}
        </span>
      </div>
    </div>
  );
};

export default PixelInformations;