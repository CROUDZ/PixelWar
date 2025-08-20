"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

interface PixelAction {
  id: string;
  x: number;
  y: number;
  color: string;
  userId: string;
  createdAt: string;
}

interface UserStats {
  userId: string;
  userName?: string;
  pixelCount: number;
  lastActive: string;
  averagePerMinute: number;
}

interface Achievement {
  userId: string;
  type: "crown" | "milestone" | "creativity" | "speed";
  title: string;
  description: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

interface ContributionsData {
  achievements: Achievement[];
  recentContributors: Array<{ userId: string; count: number }>;
}

const PixelInfo: React.FC = () => {
  const { data: session } = useSession();
  const [pixels, setPixels] = useState<PixelAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<"1h" | "6h" | "24h" | "7d">("24h");
  const [viewMode, setViewMode] = useState<"chart" | "leaderboard" | "heatmap">(
    "chart",
  );
  const [searchTerm, setSearchTerm] = useState("");

  const timeRangeMs = useMemo(() => {
    const now = Date.now();
    switch (timeRange) {
      case "1h":
        return now - 60 * 60 * 1000;
      case "6h":
        return now - 6 * 60 * 60 * 1000;
      case "24h":
        return now - 24 * 60 * 60 * 1000;
      case "7d":
        return now - 7 * 24 * 60 * 60 * 1000;
      default:
        return now - 24 * 60 * 60 * 1000;
    }
  }, [timeRange]);

  const fetchPixels = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("/api/prisma/pixelAction");
      if (!response.ok) throw new Error("Erreur de chargement");
      const data = await response.json();
      setPixels(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching pixels:", error);
      setError("Impossible de charger les données");
      setPixels([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPixels();
    const interval = setInterval(() => {
      setRefreshing(true);
      fetchPixels();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchPixels]);

  const filteredPixels = useMemo(() => {
    return pixels.filter(
      (pixel) => new Date(pixel.createdAt).getTime() >= timeRangeMs,
    );
  }, [pixels, timeRangeMs]);

  const chartData = useMemo(() => {
    if (filteredPixels.length === 0) return [];

    const now = Date.now();
    const intervals =
      timeRange === "1h"
        ? 12
        : timeRange === "6h"
          ? 24
          : timeRange === "24h"
            ? 24
            : 28;
    const intervalMs = (now - timeRangeMs) / intervals;

    const buckets = Array.from({ length: intervals }, (_, i) => {
      const bucketStart = timeRangeMs + i * intervalMs;
      const bucketEnd = bucketStart + intervalMs;

      const count = filteredPixels.filter((pixel) => {
        const time = new Date(pixel.createdAt).getTime();
        return time >= bucketStart && time < bucketEnd;
      }).length;

      const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        if (timeRange === "1h" || timeRange === "6h") {
          return date.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          });
        } else if (timeRange === "24h") {
          return date.toLocaleTimeString("fr-FR", { hour: "2-digit" });
        } else {
          return date.toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
          });
        }
      };

      return {
        time: bucketStart,
        count,
        label: formatTime(bucketStart),
      };
    });

    return buckets;
  }, [filteredPixels, timeRange, timeRangeMs]);

  // --- New Recharts-based chart component ---
  const PixelChart: React.FC = () => {
    // Map data to recharts-friendly shape
    const data = useMemo(
      () =>
        chartData.map((d) => ({
          ...d,
          count: typeof d.count === "number" ? d.count : 0,
        })),
      [],
    );

    const maxCount = Math.max(...data.map((d) => d.count), 1);

    // Determine tick interval to avoid overcrowding on small screens
    const tickInterval = Math.max(0, Math.floor(data.length / 6));

    const tickFormatter = (value: string) => {
      // If labels are time strings already, shorten for compact screens
      if (timeRange === "1h" || timeRange === "6h") return value; // HH:MM
      if (timeRange === "24h") return value; // HH
      // For 7d, show day/month
      return value;
    };

    interface CustomTooltipProps {
      active?: boolean;
      payload?: { payload: { count: number; label: string } }[];
    }

    const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
      if (!active || !payload || payload.length === 0) return null;
      const point = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-2 sm:p-3 rounded-lg shadow text-xs border max-w-[150px]">
          <div className="font-semibold text-xs sm:text-sm">
            {point.count} pixels
          </div>
          <div className="text-gray-500 text-[10px] sm:text-[11px] truncate">
            {point.label}
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h3 className="font-semibold text-sm sm:text-base lg:text-lg text-gray-900 dark:text-white">
            Activité Temporelle
          </h3>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Max: {maxCount} px
          </div>
        </div>

        <div className="w-full h-[180px] sm:h-[240px] lg:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{
                top: 10,
                right: 8,
                left: 0,
                bottom: 6,
              }}
            >
              <defs>
                <linearGradient id="gradCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.15} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" opacity={0.06} />

              <XAxis
                dataKey="label"
                tickFormatter={tickFormatter}
                interval={tickInterval}
                axisLine={false}
                tickLine={false}
                minTickGap={4}
                height={24}
                tick={{ fontSize: 10 }}
              />

              <YAxis
                allowDecimals={false}
                tickCount={4}
                axisLine={false}
                tickLine={false}
                width={32}
                domain={[0, Math.max(maxCount, 5)]}
                tick={{ fontSize: 10 }}
              />

              <Tooltip content={<CustomTooltip />} />

              <Area
                type="monotone"
                dataKey="count"
                stroke="#06b6d4"
                fillOpacity={1}
                fill="url(#gradCount)"
                isAnimationActive={true}
                animationDuration={600}
                strokeWidth={2}
                activeDot={{ r: 4 }}
              />

              {/* Reference line at max to highlight peak */}
              <ReferenceLine
                y={maxCount}
                stroke="#f59e0b"
                strokeDasharray="3 3"
                ifOverflow="extendDomain"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
          Affichage optimisé pour mobile — faites défiler les labels si
          nécessaire.
        </div>

        {/* Live region for screen readers */}
        <div aria-live="polite" className="sr-only">
          Activité mise à jour — {data.reduce((s, p) => s + p.count, 0)} pixels
          sur la période sélectionnée.
        </div>
      </div>
    );
  };

  // The rest of the component (leaderboard, heatmap, achievements, export etc.) is unchanged
  // For brevity we reuse your original logic for leaderboard/heatmap/achievements below.

  // Generate leaderboard data
  const leaderboardData = useMemo(() => {
    const userStats = new Map<string, UserStats>();

    filteredPixels.forEach((pixel) => {
      if (!pixel.userId) {
        // optional: log for debug
        // console.warn("Pixel without userId skipped:", pixel);
        return;
      }

      const existing = userStats.get(pixel.userId) || {
        userId: pixel.userId,
        pixelCount: 0,
        lastActive: pixel.createdAt,
        averagePerMinute: 0,
      };

      existing.pixelCount++;
      if (new Date(pixel.createdAt) > new Date(existing.lastActive)) {
        existing.lastActive = pixel.createdAt;
      }

      userStats.set(pixel.userId, existing);
    });

    const now = Date.now();
    userStats.forEach((stats) => {
      const timeSpan = now - timeRangeMs;
      const minutes = timeSpan / (1000 * 60);
      stats.averagePerMinute = stats.pixelCount / minutes;
    });

    return Array.from(userStats.values())
      .filter((stats) => {
        if (!searchTerm) return true;
        return (
          stats.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          stats.userName?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      })
      .sort((a, b) => b.pixelCount - a.pixelCount)
      .slice(0, 50);
  }, [filteredPixels, searchTerm, timeRangeMs]);

  const heatmapData = useMemo(() => {
    if (filteredPixels.length === 0)
      return { data: [], maxIntensity: 0, hotspots: [] };

    const gridSize = 10;
    const cellSize = 100 / gridSize;
    const heatGrid = Array(gridSize)
      .fill(null)
      .map(() => Array(gridSize).fill(0));

    filteredPixels.forEach((pixel) => {
      const gridX = Math.min(Math.floor(pixel.x / cellSize), gridSize - 1);
      const gridY = Math.min(Math.floor(pixel.y / cellSize), gridSize - 1);
      heatGrid[gridY][gridX]++;
    });

    const maxIntensity = Math.max(...heatGrid.flat());

    const data = heatGrid
      .flatMap((row, y) =>
        row.map((count, x) => ({
          x,
          y,
          count,
          intensity: maxIntensity > 0 ? count / maxIntensity : 0,
          coordinates: {
            startX: x * cellSize,
            endX: (x + 1) * cellSize,
            startY: y * cellSize,
            endY: (y + 1) * cellSize,
          },
        })),
      )
      .filter((cell) => cell.count > 0);

    const hotspots = data
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((spot, index) => ({
        ...spot,
        rank: index + 1,
        percentage:
          maxIntensity > 0 ? (spot.count / filteredPixels.length) * 100 : 0,
      }));

    return { data, maxIntensity, hotspots };
  }, [filteredPixels]);

  const contributionsData = useMemo((): ContributionsData => {
    const achievements: Achievement[] = [];
    const colorDiversity = new Map<string, Set<string>>();
    const recentContributors: Array<{ userId: string; count: number }> = [];

    filteredPixels.forEach((pixel) => {
      if (!colorDiversity.has(pixel.userId)) {
        colorDiversity.set(pixel.userId, new Set());
      }
      colorDiversity.get(pixel.userId)!.add(pixel.color);
    });

    leaderboardData.forEach((user, index) => {
      const colors = colorDiversity.get(user.userId)?.size || 0;

      if (index === 0) {
        achievements.push({
          userId: user.userId,
          type: "crown",
          title: "👑 Maître Pixel",
          description: `Leader avec ${user.pixelCount} pixels`,
          rarity: "legendary",
        });
      }

      if (user.pixelCount >= 100) {
        achievements.push({
          userId: user.userId,
          type: "milestone",
          title: "🎯 Centurion",
          description: "100+ pixels placés",
          rarity: "epic",
        });
      }

      if (colors >= 10) {
        achievements.push({
          userId: user.userId,
          type: "creativity",
          title: "🌈 Artiste Coloré",
          description: `${colors} couleurs utilisées`,
          rarity: "rare",
        });
      }

      if (user.averagePerMinute > 5) {
        achievements.push({
          userId: user.userId,
          type: "speed",
          title: "⚡ Pixel Flash",
          description: `${user.averagePerMinute.toFixed(1)} px/min`,
          rarity: "epic",
        });
      }
    });

    const recentTime = Date.now() - 60 * 60 * 1000;
    const recentUsers = new Map<string, number>();

    filteredPixels
      .filter((p) => new Date(p.createdAt).getTime() >= recentTime)
      .forEach((pixel) => {
        recentUsers.set(pixel.userId, (recentUsers.get(pixel.userId) || 0) + 1);
      });

    recentContributors.push(
      ...Array.from(recentUsers.entries())
        .map(([userId, count]) => ({ userId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    );

    return { achievements, recentContributors };
  }, [filteredPixels, leaderboardData]);

  const exportStatsAsJson = () => {
    const exportData = {
      timeRange,
      totalPixels: filteredPixels.length,
      uniqueUsers: new Set(filteredPixels.map((p) => p.userId)).size,
      uniqueColors: new Set(filteredPixels.map((p) => p.color)).size,
      pixelsPerMinute:
        filteredPixels.length > 0
          ? filteredPixels.length / ((Date.now() - timeRangeMs) / (1000 * 60))
          : 0,
      leaderboard: leaderboardData,
      heatmap: heatmapData,
      achievements: contributionsData.achievements,
      recentContributors: contributionsData.recentContributors,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `pixel-stats-${timeRange}.json`;
    a.click();

    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6 p-2 sm:p-0">
        <div className="loading-shimmer h-4 sm:h-6 rounded w-3/4"></div>
        <div className="loading-shimmer h-32 sm:h-48 rounded-lg sm:rounded-xl"></div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="loading-shimmer h-8 sm:h-12 rounded-lg"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6 sm:py-8 px-4">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
          <svg
            className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="text-red-600 dark:text-red-400 mb-3 sm:mb-4 text-sm sm:text-base">
          {error}
        </p>
        <button
          onClick={fetchPixels}
          className="glass-button px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium"
        >
          🔄 Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 lg:p-0 max-w-full overflow-hidden">
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-lg sm:text-xl lg:text-2xl text-gray-900 dark:text-white">
            Statistiques
          </h2>
          {refreshing && (
            <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          )}
        </div>

        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-full sm:w-auto">
          {(["1h", "6h", "24h", "7d"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`flex-1 sm:flex-none px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                timeRange === range
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row bg-gray-100 dark:bg-gray-800 rounded-lg p-1 gap-1 sm:gap-0">
        <button
          onClick={() => setViewMode("chart")}
          className={`flex-1 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1 sm:gap-2 ${
            viewMode === "chart"
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <span className="hidden sm:inline">📈</span>
          <span className="truncate">Graphique</span>
        </button>
        <button
          onClick={() => setViewMode("leaderboard")}
          className={`flex-1 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1 sm:gap-2 ${
            viewMode === "leaderboard"
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <span className="hidden sm:inline">🏆</span>
          <span className="truncate">Classement</span>
        </button>
        <button
          onClick={() => setViewMode("heatmap")}
          className={`flex-1 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1 sm:gap-2 ${
            viewMode === "heatmap"
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <span className="hidden sm:inline">🔥</span>
          <span className="truncate">Heatmap</span>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4 lg:flex lg:flex-row lg:justify-between">
        <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-sm border border-white/20 rounded-lg sm:rounded-xl p-2 sm:p-4 text-center flex-1">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-cyan-400">
            {filteredPixels.length}
          </div>
          <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 leading-tight">
            Pixels Total
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-sm border border-white/20 rounded-lg sm:rounded-xl p-2 sm:p-4 text-center flex-1">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-400">
            {new Set(filteredPixels.map((p) => p.userId)).size}
          </div>
          <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 leading-tight">
            Utilisateurs
          </div>
        </div>
        <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 backdrop-blur-sm border border-white/20 rounded-lg sm:rounded-xl p-2 sm:p-4 text-center flex-1">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-400">
            {filteredPixels.length > 0
              ? (
                  filteredPixels.length /
                  ((Date.now() - timeRangeMs) / (1000 * 60))
                ).toFixed(1)
              : "0.0"}
          </div>
          <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 leading-tight">
            px/min
          </div>
        </div>
      </div>

      <div className="glass-panel p-3 sm:p-4 lg:p-6">
        {viewMode === "chart" && <PixelChart />}

        {/* Leaderboard & Heatmap markup unchanged (omitted here for brevity) */}
        {viewMode === "leaderboard" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h3 className="font-semibold text-sm sm:text-base lg:text-lg text-gray-900 dark:text-white">
                Classement
              </h3>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Top {leaderboardData.length}
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher un utilisateur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 sm:pl-10 pr-4 py-2 sm:py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-cyan-500 text-sm"
              />
              <svg
                className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            <div className="space-y-2 max-h-64 sm:max-h-80 lg:max-h-96 overflow-y-auto">
              {leaderboardData.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  {searchTerm
                    ? "Aucun utilisateur trouvé"
                    : "Aucune donnée disponible"}
                </div>
              ) : (
                leaderboardData.map((user, index) => (
                  <div
                    key={user.userId}
                    className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg transition-colors ${user.userId === session?.user?.id ? "bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800" : "bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                  >
                    <div
                      className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold ${index === 0 ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-white" : index === 1 ? "bg-gradient-to-r from-gray-400 to-gray-500 text-white" : index === 2 ? "bg-gradient-to-r from-orange-400 to-red-500 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"}`}
                    >
                      {index + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm sm:text-base text-gray-900 dark:text-white truncate">
                        {user.userName ||
                          (user.userId
                            ? `User ${user.userId.slice(-8)}`
                            : "User inconnu")}
                        {user.userId === session?.user?.id && (
                          <span className="ml-1 sm:ml-2 text-[10px] sm:text-xs bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200 px-1 sm:px-2 py-0.5 rounded-full">
                            Vous
                          </span>
                        )}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        {user.averagePerMinute.toFixed(1)} px/min
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-sm sm:text-base text-gray-900 dark:text-white">
                        {user.pixelCount}
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                        pixels
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="glass-panel p-3 sm:p-4 lg:p-6">
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-3 sm:mb-4">
                🎯 Zones les Plus Actives
              </h3>
              <div className="space-y-2 sm:space-y-3">
                {heatmapData.hotspots.map((hotspot, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 sm:p-3 bg-white/5 rounded-lg"
                  >
                    <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                      <span className="text-lg sm:text-2xl font-bold text-yellow-400 flex-shrink-0">
                        #{hotspot.rank}
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm sm:text-base truncate">
                          Zone ({Math.floor(hotspot.coordinates.startX)},{" "}
                          {Math.floor(hotspot.coordinates.startY)})
                        </div>
                        <div className="text-xs sm:text-sm text-gray-400">
                          {hotspot.count} pixels •{" "}
                          {hotspot.percentage.toFixed(1)}% du total
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm sm:text-lg font-bold">
                        {hotspot.count}
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-400">
                        pixels
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="glass-panel p-3 sm:p-4 lg:p-6">
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-3 sm:mb-4">
                  🏆 Exploits Récents
                </h3>
                <div className="space-y-2 sm:space-y-3 max-h-60 overflow-y-auto">
                  {contributionsData.achievements
                    .slice(0, 8)
                    .map((achievement, index) => (
                      <div
                        key={index}
                        className={`p-2 sm:p-3 rounded-lg border-l-4 ${achievement.rarity === "legendary" ? "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-400" : achievement.rarity === "epic" ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-400" : achievement.rarity === "rare" ? "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-400" : "bg-gradient-to-r from-gray-500/20 to-gray-600/20 border-gray-400"}`}
                      >
                        <div className="font-semibold text-sm sm:text-base">
                          {achievement.title}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-400">
                          {achievement.description}
                        </div>
                        <div className="text-[10px] sm:text-xs text-gray-500 mt-1 truncate">
                          👤 {achievement.userId}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="glass-panel p-3 sm:p-4 lg:p-6">
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-3 sm:mb-4">
                  ⚡ Contributeurs Actifs
                </h3>
                <div className="text-xs sm:text-sm text-gray-400 mb-3">
                  Dernière heure
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {contributionsData.recentContributors.map(
                    (contributor, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-white/5 rounded"
                      >
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <span className="text-base sm:text-lg flex-shrink-0">
                            {index === 0
                              ? "🥇"
                              : index === 1
                                ? "🥈"
                                : index === 2
                                  ? "🥉"
                                  : "💫"}
                          </span>
                          <span className="font-medium text-sm sm:text-base truncate">
                            {contributor.userId}
                          </span>
                        </div>
                        <span className="text-yellow-400 font-bold text-sm sm:text-base flex-shrink-0">
                          {contributor.count} px
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>

            <div className="glass-panel p-3 sm:p-4 lg:p-6">
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-3 sm:mb-4">
                📊 Analyse d'Engagement
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                <div className="text-center p-2 sm:p-4 bg-white/5 rounded-lg">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-400">
                    {heatmapData.data.length}
                  </div>
                  <div className="text-[10px] sm:text-sm text-gray-400 leading-tight">
                    Zones Actives
                  </div>
                </div>
                <div className="text-center p-2 sm:p-4 bg-white/5 rounded-lg">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-400">
                    {heatmapData.maxIntensity}
                  </div>
                  <div className="text-[10px] sm:text-sm text-gray-400 leading-tight">
                    Max par Zone
                  </div>
                </div>
                <div className="text-center p-2 sm:p-4 bg-white/5 rounded-lg">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-400">
                    {contributionsData.achievements.length}
                  </div>
                  <div className="text-[10px] sm:text-sm text-gray-400 leading-tight">
                    Exploits Débloqués
                  </div>
                </div>
                <div className="text-center p-2 sm:p-4 bg-white/5 rounded-lg">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-400">
                    {contributionsData.recentContributors.length}
                  </div>
                  <div className="text-[10px] sm:text-sm text-gray-400 leading-tight">
                    Actifs (1h)
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {viewMode === "heatmap" && (
          <div className="space-y-4 sm:space-y-6">
            <div className="glass-panel p-3 sm:p-4 lg:p-6">
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-3 sm:mb-4 text-center">
                🔥 Carte Thermique
              </h3>
              <div
                className="relative bg-gray-900 rounded-lg sm:rounded-xl overflow-hidden mx-auto max-w-md sm:max-w-lg lg:max-w-xl"
                style={{ aspectRatio: "1" }}
              >
                <svg
                  width="100%"
                  height="100%"
                  viewBox="0 0 100 100"
                  className="w-full h-full"
                >
                  {heatmapData.data.map((cell, index) => (
                    <rect
                      key={index}
                      x={cell.coordinates.startX}
                      y={cell.coordinates.startY}
                      width={cell.coordinates.endX - cell.coordinates.startX}
                      height={cell.coordinates.endY - cell.coordinates.startY}
                      fill={`rgba(255, ${Math.floor(255 - cell.intensity * 200)}, ${Math.floor(255 - cell.intensity * 255)}, ${0.3 + cell.intensity * 0.7})`}
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="0.2"
                    />
                  ))}

                  {heatmapData.hotspots.slice(0, 3).map((hotspot, index) => (
                    <g key={`hotspot-${index}`}>
                      <circle
                        cx={
                          hotspot.coordinates.startX +
                          (hotspot.coordinates.endX -
                            hotspot.coordinates.startX) /
                            2
                        }
                        cy={
                          hotspot.coordinates.startY +
                          (hotspot.coordinates.endY -
                            hotspot.coordinates.startY) /
                            2
                        }
                        r="2"
                        fill="yellow"
                        stroke="orange"
                        strokeWidth="0.5"
                        className="animate-pulse"
                      />
                      <text
                        x={
                          hotspot.coordinates.startX +
                          (hotspot.coordinates.endX -
                            hotspot.coordinates.startX) /
                            2
                        }
                        y={
                          hotspot.coordinates.startY +
                          (hotspot.coordinates.endY -
                            hotspot.coordinates.startY) /
                            2 -
                          3
                        }
                        textAnchor="middle"
                        fill="white"
                        fontSize="3"
                        fontWeight="bold"
                      >
                        #{hotspot.rank}
                      </text>
                    </g>
                  ))}
                </svg>

                <div className="absolute bottom-1 sm:bottom-2 left-1 sm:left-2 glass-panel p-1 sm:p-2 text-[10px] sm:text-xs">
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <span className="hidden sm:inline">Faible</span>
                    <span className="sm:hidden">F</span>
                    <div className="w-8 sm:w-12 h-2 sm:h-3 bg-gradient-to-r from-blue-400 to-red-500 rounded"></div>
                    <span className="hidden sm:inline">Intense</span>
                    <span className="sm:hidden">I</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
        <button
          onClick={exportStatsAsJson}
          className="glass-button px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-xs sm:text-sm font-medium flex-1 sm:flex-none"
        >
          📊 Exporter JSON
        </button>

        <button
          onClick={fetchPixels}
          className="glass-button px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-xs sm:text-sm font-medium flex-1 sm:flex-none"
        >
          🔄 Actualiser
        </button>
      </div>
    </div>
  );
};

export default PixelInfo;
