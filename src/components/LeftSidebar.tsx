// components/ui/LeftSidebar.tsx
"use client";
import React from "react";
import { m, AnimatePresence } from "framer-motion";
import {
  X,
  Settings,
  BarChart,
  MousePointer,
  BarChart2,
  Shield,
} from "lucide-react";

export type LeftSidebarProps = {
  showOverlayControls: boolean;
  showPixelInfos: boolean;
  showNavInfo: boolean;
  showPixelCount: boolean;
  showAdminPanel: boolean;

  onToggleOverlayControls: () => void;
  onTogglePixelInfos: () => void;
  onToggleNavInfo: () => void;
  onTogglePixelCount: () => void;
  onToggleAdminPanel: () => void;

  isAdmin?: boolean;
  className?: string;
};

const btnVariants = {
  idle: { scale: 1, rotate: 0 },
  hover: { scale: 1.06, rotate: 0 },
  active: { scale: 1.08, rotate: -6 },
};

function Tooltip({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-gray-900/90 text-white text-xs py-1 px-2 shadow-lg opacity-0 scale-95 transform transition-all duration-150 group-hover:opacity-100 group-hover:scale-100">
      {children}
    </span>
  );
}

export default function LeftSidebar({
  showOverlayControls,
  showPixelInfos,
  showNavInfo,
  showPixelCount,
  showAdminPanel,
  onToggleOverlayControls,
  onTogglePixelInfos,
  onToggleNavInfo,
  onTogglePixelCount,
  onToggleAdminPanel,
  isAdmin = false,
  className = "",
}: LeftSidebarProps) {
  const buttons = [
    {
      key: "overlay",
      active: showOverlayControls,
      onClick: onToggleOverlayControls,
      icon: Settings,
      label: showOverlayControls
        ? "Fermer les contrôles"
        : "Contrôles superposition",
    },
    {
      key: "pixelsInfo",
      active: showPixelInfos,
      onClick: onTogglePixelInfos,
      icon: BarChart,
      label: showPixelInfos ? "Masquer infos pixels" : "Infos pixels",
    },
    {
      key: "navInfo",
      active: showNavInfo,
      onClick: onToggleNavInfo,
      icon: MousePointer,
      label: showNavInfo ? "Masquer infos navigation" : "Infos navigation",
    },
    {
      key: "count",
      active: showPixelCount,
      onClick: onTogglePixelCount,
      icon: BarChart2,
      label: showPixelCount ? "Masquer compteur" : "Compteur pixels",
    },
  ];

  return (
    <m.aside
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 25 }}
      className={`z-40 ${className} 
        fixed md:relative md:translate-x-0 md:bottom-auto md:left-auto
        bottom-4 left-1/2 -translate-x-1/2
        flex md:flex-col flex-row items-center md:items-stretch gap-2
        md:p-3 p-2 rounded-2xl md:rounded-lg bg-white/5 backdrop-blur-md shadow-lg`}
      aria-label="Barre d'outils"
    >
      <div className="md:gap-3 flex md:flex-col flex-row items-center gap-2">
        <AnimatePresence initial={false}>
          {buttons.map((b, i) => {
            const Icon = b.icon;
            return (
              <m.button
                key={b.key}
                className={`group relative flex items-center justify-center md:w-12 md:h-12 w-14 h-12 rounded-xl
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-400 text-text-primary
                  ${b.active ? "bg-blue-500/95 text-white shadow-lg" : "bg-white/6 text-white/90 hover:bg-white/10"}
                  transition-colors`}
                onClick={b.onClick}
                aria-pressed={b.active}
                title={b.label}
                initial="idle"
                whileHover="hover"
                whileTap="active"
                variants={btnVariants}
                custom={i}
                aria-label={b.label}
              >
                <m.span
                  className="flex items-center justify-center"
                  initial={{ rotate: 0 }}
                  animate={b.active ? { rotate: -10 } : { rotate: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  {b.active ? (
                    <X className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </m.span>

                {/* Tooltip visible on md+ to avoid overlapping on very small screens */}
                <div className="hidden md:block">
                  <Tooltip>{b.label}</Tooltip>
                </div>
              </m.button>
            );
          })}

          {isAdmin && (
            <m.button
              key="admin"
              className={`group relative flex items-center justify-center md:w-12 md:h-12 w-14 h-12 rounded-xl
                focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-rose-400
                ${showAdminPanel ? "bg-rose-500/95 text-white shadow-lg" : "bg-white/6 text-white/90 hover:bg-white/10"}
                transition-colors`}
              onClick={onToggleAdminPanel}
              aria-pressed={showAdminPanel}
              title={showAdminPanel ? "Masquer panneau admin" : "Panneau admin"}
              initial="idle"
              whileHover="hover"
              whileTap="active"
              variants={btnVariants}
            >
              <m.span
                animate={
                  showAdminPanel ? { scale: 1.06, rotate: -8 } : { scale: 1 }
                }
              >
                {showAdminPanel ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Shield className="w-5 h-5 text-rose-500" />
                )}
              </m.span>
              <div className="hidden md:block">
                <Tooltip>
                  {showAdminPanel ? "Masquer panneau admin" : "Panneau admin"}
                </Tooltip>
              </div>
            </m.button>
          )}
        </AnimatePresence>
      </div>
    </m.aside>
  );
}
