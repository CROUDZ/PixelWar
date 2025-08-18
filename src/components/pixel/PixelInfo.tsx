import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";

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
    }, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchPixels]);

  // Filter pixels by time range
  const filteredPixels = useMemo(() => {
    return pixels.filter(
      (pixel) => new Date(pixel.createdAt).getTime() >= timeRangeMs,
    );
  }, [pixels, timeRangeMs]);

  // Generate chart data
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

  // Generate leaderboard data
  const leaderboardData = useMemo(() => {
    const userStats = new Map<string, UserStats>();

    filteredPixels.forEach((pixel) => {
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

    // Calculate average per minute
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
      .slice(0, 50); // Top 50
  }, [filteredPixels, searchTerm, timeRangeMs]);

  // Generate heatmap data
  const heatmapData = useMemo(() => {
    if (filteredPixels.length === 0)
      return { data: [], maxIntensity: 0, hotspots: [] };

    // Create a grid to count pixels per zone (10x10 grid for 100x100 canvas)
    const gridSize = 10;
    const cellSize = 100 / gridSize; // Canvas is 100x100
    const heatGrid = Array(gridSize)
      .fill(null)
      .map(() => Array(gridSize).fill(0));

    // Count pixels in each grid cell
    filteredPixels.forEach((pixel) => {
      const gridX = Math.min(Math.floor(pixel.x / cellSize), gridSize - 1);
      const gridY = Math.min(Math.floor(pixel.y / cellSize), gridSize - 1);
      heatGrid[gridY][gridX]++;
    });

    // Find max intensity for normalization
    const maxIntensity = Math.max(...heatGrid.flat());

    // Convert to data format with coordinates
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

    // Find hotspots (top 5 most active zones)
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

  // Generate achievements and contributions
  const contributionsData = useMemo((): ContributionsData => {
    const achievements: Achievement[] = [];
    const colorDiversity = new Map<string, Set<string>>();
    const recentContributors = [];

    // Analyze user contributions
    filteredPixels.forEach((pixel) => {
      // Track color diversity per user
      if (!colorDiversity.has(pixel.userId)) {
        colorDiversity.set(pixel.userId, new Set());
      }
      colorDiversity.get(pixel.userId)!.add(pixel.color);
    });

    // Generate achievements
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

    // Recent active contributors (last hour)
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

  // Chart component
  const PixelChart = () => {
    const maxCount = Math.max(...chartData.map((d) => d.count), 1);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Activité Temporelle
          </h3>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {chartData.length > 0 && `Max: ${maxCount} pixels`}
          </div>
        </div>

        <div className="h-48 flex items-end gap-1 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl overflow-x-auto">
          {chartData.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
              Aucune donnée disponible
            </div>
          ) : (
            chartData.map((point) => (
              <div
                key={point.time}
                className="flex flex-col items-center group min-w-[24px]"
              >
                <div className="relative flex-1 flex items-end w-6">
                  <div
                    className="w-full bg-gradient-to-t from-cyan-500 to-blue-500 rounded-t-sm transition-all duration-300 hover:from-cyan-400 hover:to-blue-400"
                    style={{
                      height: `${Math.max((point.count / maxCount) * 100, 2)}%`,
                    }}
                  />

                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg py-1 px-2 whitespace-nowrap">
                      {point.count} pixels
                      <br />
                      {point.label}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 rotate-45 origin-left">
                  {point.label}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="loading-shimmer h-6 rounded w-3/4"></div>
        <div className="loading-shimmer h-48 rounded-xl"></div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="loading-shimmer h-12 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-6 h-6 text-red-600 dark:text-red-400"
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
        <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
        <button
          onClick={fetchPixels}
          className="glass-button px-4 py-2 rounded-lg text-sm font-medium"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-lg text-gray-900 dark:text-white">
            Statistiques
          </h2>
          {refreshing && (
            <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          )}
        </div>

        {/* Time range selector */}
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {(["1h", "6h", "24h", "7d"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
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

      {/* View mode toggle */}
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => setViewMode("chart")}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2 ${
            viewMode === "chart"
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          Graphique
        </button>
        <button
          onClick={() => setViewMode("leaderboard")}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2 ${
            viewMode === "leaderboard"
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
            />
          </svg>
          Classement
        </button>
        <button
          onClick={() => setViewMode("heatmap")}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2 ${
            viewMode === "heatmap"
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
            />
          </svg>
          Heatmap
        </button>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-cyan-400">
            {filteredPixels.length}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Pixels Total
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400">
            {new Set(filteredPixels.map((p) => p.userId)).size}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Utilisateurs
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">
            {new Set(filteredPixels.map((p) => p.color)).size}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Couleurs
          </div>
        </div>
        <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">
            {filteredPixels.length > 0
              ? (
                  filteredPixels.length /
                  ((Date.now() - timeRangeMs) / (1000 * 60))
                ).toFixed(1)
              : "0.0"}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">px/min</div>
        </div>
      </div>

      {/* Content based on view mode */}
      <div className="glass-panel p-6">
        {/* Chart view */}
        {viewMode === "chart" && <PixelChart />}

        {/* Leaderboard view */}
        {viewMode === "leaderboard" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Classement
              </h3>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Top {leaderboardData.length}
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Rechercher un utilisateur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-cyan-500 text-sm"
              />
            </div>

            {/* List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
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
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      user.userId === session?.user?.id
                        ? "bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800"
                        : "bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    {/* Rank */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0
                          ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-white"
                          : index === 1
                            ? "bg-gradient-to-r from-gray-400 to-gray-500 text-white"
                            : index === 2
                              ? "bg-gradient-to-r from-orange-400 to-red-500 text-white"
                              : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {index + 1}
                    </div>

                    {/* User info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white truncate">
                        {user.userName || `User ${user.userId.slice(-8)}`}
                        {user.userId === session?.user?.id && (
                          <span className="ml-2 text-xs bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200 px-2 py-0.5 rounded-full">
                            Vous
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {user.averagePerMinute.toFixed(1)} px/min
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="text-right">
                      <div className="font-bold text-gray-900 dark:text-white">
                        {user.pixelCount}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        pixels
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Heatmap view */}
        {viewMode === "heatmap" && (
          <div className="space-y-6">
            {/* Heatmap Canvas */}
            <div className="glass-panel p-6">
              <h3 className="text-xl font-bold mb-4 text-center">
                🔥 Carte Thermique
              </h3>
              <div
                className="relative bg-gray-900 rounded-xl overflow-hidden"
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

                  {/* Hotspot markers */}
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

                {/* Legend */}
                <div className="absolute bottom-2 left-2 glass-panel p-2 text-xs">
                  <div className="flex items-center space-x-2">
                    <span>Faible</span>
                    <div className="w-12 h-3 bg-gradient-to-r from-blue-400 to-red-500 rounded"></div>
                    <span>Intense</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Hotspots List */}
            <div className="glass-panel p-6">
              <h3 className="text-xl font-bold mb-4">
                🎯 Zones les Plus Actives
              </h3>
              <div className="space-y-3">
                {heatmapData.hotspots.map((hotspot, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl font-bold text-yellow-400">
                        #{hotspot.rank}
                      </span>
                      <div>
                        <div className="font-semibold">
                          Zone ({Math.floor(hotspot.coordinates.startX)},{" "}
                          {Math.floor(hotspot.coordinates.startY)})
                        </div>
                        <div className="text-sm text-gray-400">
                          {hotspot.count} pixels •{" "}
                          {hotspot.percentage.toFixed(1)}% du total
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{hotspot.count}</div>
                      <div className="text-xs text-gray-400">pixels</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Achievements & Contributions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Achievements */}
              <div className="glass-panel p-6">
                <h3 className="text-xl font-bold mb-4">🏆 Exploits Récents</h3>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {contributionsData.achievements
                    .slice(0, 8)
                    .map((achievement, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border-l-4 ${
                          achievement.rarity === "legendary"
                            ? "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-400"
                            : achievement.rarity === "epic"
                              ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-400"
                              : achievement.rarity === "rare"
                                ? "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-400"
                                : "bg-gradient-to-r from-gray-500/20 to-gray-600/20 border-gray-400"
                        }`}
                      >
                        <div className="font-semibold">{achievement.title}</div>
                        <div className="text-sm text-gray-400">
                          {achievement.description}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          👤 {achievement.userId}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Recent Contributors */}
              <div className="glass-panel p-6">
                <h3 className="text-xl font-bold mb-4">
                  ⚡ Contributeurs Actifs
                </h3>
                <div className="text-sm text-gray-400 mb-3">Dernière heure</div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {contributionsData.recentContributors.map(
                    (contributor, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-white/5 rounded"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">
                            {index === 0
                              ? "🥇"
                              : index === 1
                                ? "🥈"
                                : index === 2
                                  ? "🥉"
                                  : "💫"}
                          </span>
                          <span className="font-medium">
                            {contributor.userId}
                          </span>
                        </div>
                        <span className="text-yellow-400 font-bold">
                          {contributor.count} px
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>

            {/* Statistics Overview */}
            <div className="glass-panel p-6">
              <h3 className="text-xl font-bold mb-4">
                📊 Analyse d'Engagement
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <div className="text-2xl font-bold text-blue-400">
                    {heatmapData.data.length}
                  </div>
                  <div className="text-sm text-gray-400">Zones Actives</div>
                </div>
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <div className="text-2xl font-bold text-green-400">
                    {heatmapData.maxIntensity}
                  </div>
                  <div className="text-sm text-gray-400">Max par Zone</div>
                </div>
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <div className="text-2xl font-bold text-purple-400">
                    {contributionsData.achievements.length}
                  </div>
                  <div className="text-sm text-gray-400">
                    Exploits Débloqués
                  </div>
                </div>
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-400">
                    {contributionsData.recentContributors.length}
                  </div>
                  <div className="text-sm text-gray-400">Actifs (1h)</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <button
        onClick={exportStatsAsJson}
        className="glass-button px-4 py-2 rounded-lg text-sm font-medium"
      >
        Exporter JSON
      </button>
    </div>
  );
};

export default PixelInfo;
