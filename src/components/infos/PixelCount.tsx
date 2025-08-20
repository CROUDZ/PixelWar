"use client";
import React, { useEffect, useRef, useState } from "react";
import { m } from "framer-motion";
import {
  Activity,
  Wifi,
  WifiOff,
  TrendingUp,
  Users,
  Zap,
  Clock,
} from "lucide-react";
import { subscribeWS, getWS, isWSConnected } from "@/lib/ws";

export default function PixelInformations() {
  const [count, setCount] = useState<number>(0);
  const [connected, setConnected] = useState<boolean>(false);
  const [rate, setRate] = useState<number>(0);
  const timestampsRef = useRef<number[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const rateTimerRef = useRef<number | null>(null);
  const connCheckerRef = useRef<number | null>(null);

  useEffect(() => {
    wsRef.current = getWS();
    setConnected(Boolean(isWSConnected()));

    connCheckerRef.current = window.setInterval(() => {
      setConnected(Boolean(isWSConnected()));
    }, 1000);

    const unsubscribe = subscribeWS((data: unknown) => {
      if (typeof data !== "object" || data === null) return;

      const wsData = data as { type?: string; totalPixels?: number };

      if (
        wsData.type === "pixelCount" &&
        typeof wsData.totalPixels === "number"
      ) {
        setCount(wsData.totalPixels);
      } else if (
        wsData.type === "init" &&
        typeof wsData.totalPixels === "number"
      ) {
        setCount(wsData.totalPixels);
      } else if (wsData.type === "updatePixel") {
        setCount((c) => c + 1);
        timestampsRef.current.push(Date.now());
      } else if (wsData.type === "canvasClear") {
        setCount(0);
        timestampsRef.current = []; // Reset rate calculation
        setRate(0);
        console.log("[PixelCount] Canvas cleared, reset pixel count");
      }
    });

    const computeRate = () => {
      const now = Date.now();
      const cutoff = now - 60 * 1000;
      timestampsRef.current = timestampsRef.current.filter((t) => t >= cutoff);
      setRate(timestampsRef.current.length);
    };
    rateTimerRef.current = window.setInterval(computeRate, 3000);
    computeRate();

    return () => {
      unsubscribe();
      if (rateTimerRef.current) window.clearInterval(rateTimerRef.current);
      if (connCheckerRef.current) window.clearInterval(connCheckerRef.current);
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Status de connexion */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          État du serveur
        </h4>
        <div className="flex items-center gap-2">
          {connected ? (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <Wifi size={14} className="text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                En ligne
              </span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <WifiOff size={14} className="text-red-600 dark:text-red-400" />
              <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                Hors ligne
              </span>
            </>
          )}
        </div>
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 gap-4">
        {/* Total pixels */}
        <m.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 
                     rounded-xl p-4 border border-blue-200/50 dark:border-blue-700/50"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-blue-600 dark:text-blue-400" />
              <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Total Pixels
              </h5>
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded-full">
              Live
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
            {count.toLocaleString()}
          </div>
          <div className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">
            pixels placés au total
          </div>
        </m.div>

        {/* Taux d'activité */}
        <m.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 
                     rounded-xl p-4 border border-green-200/50 dark:border-green-700/50"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp
                size={16}
                className="text-green-600 dark:text-green-400"
              />
              <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Activité
              </h5>
            </div>
            <div className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50 px-2 py-1 rounded-full">
              {rate > 0 ? "Actif" : "Calme"}
            </div>
          </div>
          <div className="text-2xl font-bold text-green-700 dark:text-green-300">
            {rate}
          </div>
          <div className="text-xs text-green-600/70 dark:text-green-400/70 mt-1">
            pixels par minute
          </div>
        </m.div>
      </div>

      {/* Activité récente */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Activity
            size={16}
            className="text-purple-600 dark:text-purple-400"
          />
          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Activité récente
          </h5>
        </div>

        {timestampsRef.current.length > 0 ? (
          <div
            className="bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 
                          rounded-xl p-4 border border-purple-200/50 dark:border-purple-700/50"
          >
            <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
              {timestampsRef.current
                .slice(-5)
                .reverse()
                .map((timestamp, i) => (
                  <m.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center justify-between text-sm bg-white/50 dark:bg-gray-800/50 
                             rounded-lg p-2 border border-purple-200/30 dark:border-purple-700/30"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                      <span className="text-gray-700 dark:text-gray-300">
                        Pixel placé
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                      <Clock size={12} />
                      <span className="font-mono text-xs">
                        {new Date(timestamp).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </div>
                  </m.div>
                ))}
            </div>
          </div>
        ) : (
          <div
            className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/30 dark:to-gray-900/30 
                          rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50 text-center"
          >
            <Zap
              size={24}
              className="text-gray-400 dark:text-gray-500 mx-auto mb-2 opacity-50"
            />
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Aucune activité récente
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              En attente de nouveaux pixels...
            </div>
          </div>
        )}
      </div>

      {/* Performance indicator */}
      <div
        className="bg-gradient-to-br from-orange-50 to-yellow-100 dark:from-orange-900/30 dark:to-yellow-900/30 
                      rounded-xl p-4 border border-orange-200/50 dark:border-orange-700/50"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-orange-600 dark:text-orange-400" />
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Performance
            </h5>
          </div>
          <div
            className={`text-xs px-2 py-1 rounded-full font-medium ${
              connected
                ? "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300"
                : "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300"
            }`}
          >
            {connected ? "Optimal" : "Dégradé"}
          </div>
        </div>
        <div className="mt-2">
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
            <span>Connexion WebSocket</span>
            <span>{connected ? "100%" : "0%"}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                connected
                  ? "bg-gradient-to-r from-green-400 to-green-600"
                  : "bg-gradient-to-r from-red-400 to-red-600"
              }`}
              style={{ width: connected ? "100%" : "0%" }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
