// components/layout/LeftSidebar.tsx

"use client";
import React from "react";
import { m, AnimatePresence } from "framer-motion";
import {
  X,
  Image,
  BarChart,
  MousePointer,
  BarChart2,
  Shield,
} from "lucide-react";
import Link from "next/link";

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
  A2F: boolean;
  className?: string;
};

const btnVariants = {
  idle: { scale: 1, rotate: 0 },
  hover: { scale: 1.05, rotate: 0 },
  active: { scale: 0.95, rotate: -2 },
};

function Tooltip({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-surface-primary text-text-primary text-xs py-1 px-2 border border-border-primary shadow-lg opacity-0 scale-95 transform transition-all duration-150 group-hover:opacity-100 group-hover:scale-100">
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
  A2F,
  className = "",
}: LeftSidebarProps) {
  const buttons = [
    {
      key: "overlay",
      active: showOverlayControls,
      onClick: onToggleOverlayControls,
      icon: Image,
      label: showOverlayControls
        ? "Fermer la superposition d'images"
        : "Superposition d'images",
      color: "blue",
    },
    {
      key: "pixelsInfo",
      active: showPixelInfos,
      onClick: onTogglePixelInfos,
      icon: BarChart,
      label: showPixelInfos ? "Masquer infos pixels" : "Infos pixels",
      color: "green",
    },
    {
      key: "navInfo",
      active: showNavInfo,
      onClick: onToggleNavInfo,
      icon: MousePointer,
      label: showNavInfo ? "Masquer infos navigation" : "Infos navigation",
      color: "purple",
    },
    {
      key: "count",
      active: showPixelCount,
      onClick: onTogglePixelCount,
      icon: BarChart2,
      label: showPixelCount ? "Masquer compteur" : "Compteur pixels",
      color: "orange",
    },
  ];

  return (
    <m.aside
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 25 }}
      className={`z-40 ${className}
        fixed md:relative md:translate-x-0 md:bottom-auto md:left-auto
        bottom-4 left-1/2 -translate-x-1/2
        flex md:flex-col flex-row items-center md:items-stretch gap-2
        md:p-3 p-2 rounded-xl md:rounded-lg bg-surface-secondary/80 backdrop-blur-md border border-border-primary shadow-lg`}
      aria-label="Barre d'outils"
    >
      <div className="md:gap-2 flex md:flex-col flex-row items-center gap-2">
        <AnimatePresence initial={false}>
          {buttons.map((b, i) => {
            const Icon = b.icon;
            const colorClasses = {
              blue: b.active
                ? "bg-blue-500 text-white"
                : "bg-surface-hover text-text-primary hover:bg-surface-primary",
              green: b.active
                ? "bg-green-500 text-white"
                : "bg-surface-hover text-text-primary hover:bg-surface-primary",
              purple: b.active
                ? "bg-purple-500 text-white"
                : "bg-surface-hover text-text-primary hover:bg-surface-primary",
              orange: b.active
                ? "bg-orange-500 text-white"
                : "bg-surface-hover text-text-primary hover:bg-surface-primary",
            };

            return (
              <m.button
                key={b.key}
                className={`group relative flex items-center justify-center md:w-12 md:h-12 w-10 h-10 rounded-lg outline-none
                  focus:outline-none
                  ${colorClasses[b.color as keyof typeof colorClasses]}
                  transition-all duration-200 ${b.active ? "shadow-md" : ""}`}
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
                    <X className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </m.span>

                <div className="hidden md:block">
                  <Tooltip>{b.label}</Tooltip>
                </div>
              </m.button>
            );
          })}

          {isAdmin && (
            <m.div
              key="admin"
              initial="idle"
              whileHover="hover"
              whileTap="active"
              variants={btnVariants}
            >
              {A2F ? (
                <m.button
                  className={`group relative flex items-center justify-center md:w-12 md:h-12 w-10 h-10 rounded-lg
                    focus:outline-none outline-none 
                    ${
                      showAdminPanel
                        ? "bg-red-500 text-white shadow-md"
                        : "bg-surface-hover text-text-primary hover:bg-surface-primary"
                    }
                    transition-all duration-200`}
                  onClick={onToggleAdminPanel}
                  aria-pressed={showAdminPanel}
                  title={
                    showAdminPanel ? "Masquer panneau admin" : "Panneau admin"
                  }
                  aria-label={
                    showAdminPanel ? "Masquer panneau admin" : "Panneau admin"
                  }
                >
                  <m.span
                    animate={
                      showAdminPanel
                        ? { scale: 1.05, rotate: -8 }
                        : { scale: 1 }
                    }
                  >
                    {showAdminPanel ? (
                      <X className="w-4 h-4" />
                    ) : (
                      <Shield className="w-4 h-4 text-red-700" />
                    )}
                  </m.span>
                  <div className="hidden md:block">
                    <Tooltip>
                      {showAdminPanel
                        ? "Masquer panneau admin"
                        : "Panneau admin"}
                    </Tooltip>
                  </div>
                </m.button>
              ) : (
                <Link
                  href="/admin"
                  className={`group relative flex items-center justify-center md:w-12 md:h-12 w-10 h-10 rounded-lg
                    focus:outline-none outline-none 
                    bg-surface-hover text-text-primary hover:bg-surface-primary
                    transition-all duration-200`}
                  title="Panneau admin"
                  aria-label="Panneau admin"
                >
                  <Shield className="w-4 h-4 text-red-700" />
                  <div className="hidden md:block">
                    <Tooltip>Panneau admin</Tooltip>
                  </div>
                </Link>
              )}
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </m.aside>
  );
}
