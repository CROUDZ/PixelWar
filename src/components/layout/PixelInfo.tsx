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
import {
  User,
  TrendingUp,
  Users,
  Activity,
  Download,
  Search,
  Flame
} from "lucide-react";
import Image from "next/image";

interface PixelAction {
  id: string;
  x: number;
  y: number;
  color: string;
  userId: string;
  name?: string | null;
  avatar?: string | null;
  createdAt: string;
}

interface UserStats {
  userId: string;
  name?: string;
  pixelCount: number;
  lastActive: string;
  avatar?: string;
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

  // Chart component with theme colors
  const PixelChart: React.FC = () => {
    const data = useMemo(
      () =>
        chartData.map((d) => ({
          ...d,
          count: typeof d.count === "number" ? d.count : 0,
        })),
      [],
    );

    const maxCount = Math.max(...data.map((d) => d.count), 1);
    const tickInterval = Math.max(0, Math.floor(data.length / 6));

    const tickFormatter = (value: string) => {
      if (timeRange === "1h" || timeRange === "6h") return value;
      if (timeRange === "24h") return value;
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
        <div
          className="bg-surface-primary text-text-primary text-xs py-2 px-3 rounded border border-border-primary shadow-lg"
          role="tooltip"
          aria-live="polite"
        >
          <div className="font-semibold text-sm">
            {point.count} pixels
          </div>
          <div className="text-text-secondary text-xs">
            {point.label}
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h3 className="font-semibold text-sm sm:text-base lg:text-lg text-text-primary">
            Activité Temporelle
          </h3>
          <div className="text-xs text-text-secondary">
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
              aria-describedby="chart-description"
            >
              <defs>
                <linearGradient id="gradCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.15} />
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
                stroke="var(--accent)"
                fillOpacity={1}
                fill="url(#gradCount)"
                isAnimationActive={true}
                animationDuration={600}
                strokeWidth={2}
                activeDot={{ r: 4 }}
              />

              <ReferenceLine
                y={maxCount}
                stroke="var(--accent-600)"
                strokeDasharray="3 3"
                ifOverflow="extendDomain"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="text-xs text-text-secondary">
          Affichage optimisé pour mobile — faites défiler les labels si nécessaire.
        </div>

        <div aria-live="polite" className="sr-only">
          Activité mise à jour — {data.reduce((s, p) => s + p.count, 0)} pixels sur la période sélectionnée.
        </div>

        <div id="chart-description" className="sr-only">
          Graphique en aires montrant l'activité des pixels au fil du temps. L'axe X représente le temps et l'axe Y le nombre de pixels placés. La ligne de référence indique le maximum atteint.
        </div>
      </div>
    );
  };

  // Generate leaderboard data
  const leaderboardData = useMemo(() => {
    const userStats = new Map<string, UserStats>();

    filteredPixels.forEach((pixel) => {
      if (!pixel.userId) return;

      const existing = userStats.get(pixel.userId) || {
        userId: pixel.userId,
        pixelCount: 0,
        lastActive: pixel.createdAt,
        name: pixel.name || undefined,
        avatar: pixel.avatar || undefined,
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
          stats.name?.toLowerCase().includes(searchTerm.toLowerCase())
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
          title: "Maître Pixel",
          description: `Leader avec ${user.pixelCount} pixels`,
          rarity: "legendary",
        });
      }

      if (user.pixelCount >= 100) {
        achievements.push({
          userId: user.userId,
          type: "milestone",
          title: "Centurion",
          description: "100+ pixels placés",
          rarity: "epic",
        });
      }

      if (colors >= 10) {
        achievements.push({
          userId: user.userId,
          type: "creativity",
          title: "Artiste Coloré",
          description: `${colors} couleurs utilisées`,
          rarity: "rare",
        });
      }

      if (user.averagePerMinute > 5) {
        achievements.push({
          userId: user.userId,
          type: "speed",
          title: "Pixel Flash",
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
        <div className="bg-surface-secondary h-4 sm:h-6 rounded w-3/4 animate-pulse"></div>
        <div className="bg-surface-secondary h-32 sm:h-48 rounded-lg sm:rounded-xl animate-pulse"></div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="bg-surface-secondary h-8 sm:h-12 rounded animate-pulse"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6 sm:py-8 px-4">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
          <svg
            className="w-5 h-5 sm:w-6 sm:h-6 text-red-500"
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
          className="bg-accent-700 hover:bg-accent-800 text-white px-3 sm:px-4 py-2 rounded transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-accent-600"
          aria-label="Réessayer de charger les données statistiques"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 lg:p-0 max-w-full overflow-hidden">
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-lg sm:text-xl lg:text-2xl text-text-primary">
            Statistiques
          </h2>
          {refreshing && (
            <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
          )}
        </div>

        <div className="flex bg-surface-secondary rounded-lg p-1 w-full sm:w-auto">
          {(["1h", "6h", "24h", "7d"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`flex-1 sm:flex-none px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-accent/20 ${
                timeRange === range
                  ? "bg-accent-800 text-white"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
              }`}
              aria-label={`Afficher les statistiques sur ${range}`}
              aria-pressed={timeRange === range}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row bg-surface-secondary rounded-lg p-1 gap-1 sm:gap-0">
        <button
          onClick={() => setViewMode("chart")}
          className={`flex-1 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1 sm:gap-2 focus:outline-none focus:ring-2 focus:ring-accent/20 ${
            viewMode === "chart"
              ? "bg-accent-800 text-white"
              : "text-text-secondary hover:text-text-primary"
          }`}
          aria-label="Afficher le graphique d'activité"
          aria-pressed={viewMode === "chart"}
        >
          <TrendingUp size={14} />
          <span className="truncate">Graphique</span>
        </button>
        <button
          onClick={() => setViewMode("leaderboard")}
          className={`flex-1 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1 sm:gap-2 focus:outline-none focus:ring-2 focus:ring-accent/20 ${
            viewMode === "leaderboard"
              ? "bg-accent-800 text-white"
              : "text-text-secondary hover:text-text-primary"
          }`}
          aria-label="Afficher le classement des utilisateurs"
          aria-pressed={viewMode === "leaderboard"}
        >
          <Users size={14} />
          <span className="truncate">Classement</span>
        </button>
        <button
          onClick={() => setViewMode("heatmap")}
          className={`flex-1 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1 sm:gap-2 focus:outline-none focus:ring-2 focus:ring-accent/20 ${
            viewMode === "heatmap"
              ? "bg-accent-800 text-white"
              : "text-text-secondary hover:text-text-primary"
          }`}
          aria-label="Afficher la carte thermique d'activité"
          aria-pressed={viewMode === "heatmap"}
        >
          <Activity size={14} />
          <span className="truncate">Heatmap</span>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4 lg:flex lg:flex-row lg:justify-between">
        <div className="bg-accent-400 dark:bg-accent-900 rounded-lg sm:rounded-xl p-2 sm:p-4 text-center flex-1 border border-accent-600 dark:border-accent-800">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-accent-200">
            {filteredPixels.length}
          </div>
          <div className="text-xs text-gray-700 dark:text-accent-400 leading-tight">
            Pixels Total
          </div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg sm:rounded-xl p-2 sm:p-4 text-center flex-1 border border-green-200 dark:border-green-800">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-green-200">
            {new Set(filteredPixels.map((p) => p.userId)).size}
          </div>
          <div className="text-xs text-gray-700 dark:text-green-400 leading-tight">
            Utilisateurs
          </div>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg sm:rounded-xl p-2 sm:p-4 text-center flex-1 border border-orange-200 dark:border-orange-800">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-orange-200">
            {filteredPixels.length > 0
              ? (
                  filteredPixels.length /
                  ((Date.now() - timeRangeMs) / (1000 * 60))
                ).toFixed(1)
              : "0.0"}
          </div>
          <div className="text-xs text-gray-700 dark:text-orange-400 leading-tight">
            px/min
          </div>
        </div>
      </div>

      <div className="bg-surface-primary p-3 sm:p-4 lg:p-6 rounded-lg border border-border-primary">
        {viewMode === "chart" && <PixelChart />}

        {viewMode === "leaderboard" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h3 className="font-semibold text-sm sm:text-base lg:text-lg text-text-primary">
                Classement
              </h3>
              <div className="text-xs text-text-secondary">
                Top {leaderboardData.length}
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher un utilisateur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 sm:pl-10 pr-4 py-2 sm:py-3 bg-surface-secondary border border-border-primary rounded-lg focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 text-text-primary placeholder-text-secondary transition-colors"
                aria-label="Rechercher dans le classement des utilisateurs"
              />
              <Search
                className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary"
                aria-hidden="true"
              />
            </div>

            <div className="space-y-2 max-h-64 sm:max-h-80 lg:max-h-96 overflow-y-auto">
              {leaderboardData.length === 0 ? (
                <div className="text-center py-8 text-text-secondary">
                  {searchTerm
                    ? "Aucun utilisateur trouvé"
                    : "Aucune donnée disponible"}
                </div>
              ) : (
                leaderboardData.map((user, index) => (
                  <div
                    key={user.userId}
                    className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-accent/20 ${
                      user.userId === session?.user?.id
                        ? "bg-accent-800 dark:bg-accent-100/10 border border-accent-300 dark:border-accent-700"
                        : "bg-surface-secondary hover:bg-surface-hover"
                    }`}
                  >
                    <p className="text-xs sm:text-sm font-semibold text-white flex-shrink-0">
                      {index + 1}
                    </p>
                    <div
                      className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold ${
                        index === 0
                          ? "bg-slate-800 text-white"
                          : index === 1
                            ? "bg-slate-600 text-white"
                            : index === 2
                              ? "bg-slate-500 text-white"
                              : "bg-surface-secondary text-text-secondary"
                      }`}
                    >
                      {user.avatar ? (
                        <Image
                          src={user.avatar}
                          alt={user.name || "Avatar"}
                          width={32}
                          height={32}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-4 h-4 sm:w-5 sm:h-5" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm sm:text-base text-white truncate">
                        {user.name || "Utilisateur inconnu"}
                        {user.userId === session?.user?.id && (
                          <span className="ml-1 sm:ml-2 text-xs bg-slate-800 text-white px-1 sm:px-2 py-0.5 rounded-full">
                            Vous
                          </span>
                        )}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-200">
                        {user.averagePerMinute.toFixed(1)} px/min
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-sm sm:text-base text-white">
                        {user.pixelCount}
                      </div>
                      <div className="text-xs text-gray-200">
                        pixels
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {viewMode === "heatmap" && (
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-surface-primary p-3 sm:p-4 lg:p-6 rounded-lg border border-border-primary">
              <div className="flex flex-row items-center justify-center gap-2 mb-3 sm:mb-4 ">
                <Flame className="w-6 h-6 text-accent" aria-hidden="true" />
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-center text-text-primary">
                  Carte Thermique
                </h3>
              </div>
              <div
                className="relative bg-surface-secondary rounded-lg sm:rounded-xl overflow-hidden mx-auto max-w-md sm:max-w-lg lg:max-w-xl"
                style={{ aspectRatio: "1" }}
                role="img"
                aria-label={`Carte thermique montrant l'activité des pixels. ${heatmapData.hotspots.length} zones d'activité principales identifiées.`}
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
                      fill={`rgba(175, 250, 245, ${0.3 + cell.intensity * 0.7})`}
                      stroke="var(--border-primary)"
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
                        fill="#2563eb"
                        stroke="#1e40af"
                        strokeWidth="0.5"
                        className="animate-pulse"
                        aria-label={`Zone d'activité ${hotspot.rank} avec ${hotspot.count} pixels`}
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
                        fill="var(--text-primary)"
                        fontSize="3"
                        fontWeight="bold"
                        aria-hidden="true"
                      >
                        #{hotspot.rank}
                      </text>
                    </g>
                  ))}
                </svg>

                <div className="absolute bottom-1 sm:bottom-2 left-1 sm:left-2 bg-surface-primary p-1 sm:p-2 text-xs border border-border-primary rounded">
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <span className="hidden sm:inline text-text-secondary">Faible</span>
                    <span className="sm:hidden text-text-secondary">F</span>
                    <div className="w-8 sm:w-12 h-2 sm:h-3 bg-gradient-to-r from-accent-200 to-accent-600 rounded"></div>
                    <span className="hidden sm:inline text-text-secondary">Intense</span>
                    <span className="sm:hidden text-text-secondary">I</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 m-1">
        <button
          onClick={exportStatsAsJson}
          className="bg-accent-800 hover:bg-accent-900 text-white px-3 sm:px-4 py-2 sm:py-3 rounded transition-colors text-sm font-medium flex-1 sm:flex-none flex items-center justify-center gap-2 focus:outline-none outline-none"
          aria-label="Exporter les statistiques au format JSON"
        >
          <Download size={16} />
          Exporter JSON
        </button>
      </div>
    </div>
  );
};

export default PixelInfo;
