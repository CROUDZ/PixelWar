"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useSession } from "next-auth/react";
import { useEventMode } from "@/context/EventMode";
import { openInPopup } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { m, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  Sun,
  Moon,
  User,
  Home,
  Shield,
  MessageCircle,
  ChevronDown,
  Clock,
  Play,
  Pause,
  Calendar,
} from "lucide-react";
import DeleteAccount from "@/components/header/DeleteAccount";
import UserMenu from "@/components/header/userMenu";

const ENV = process.env.NODE_ENV || "development";
const DOMAIN =
  ENV === "production"
    ? "https://pixelwar-hubdurp.fr"
    : "http://localhost:3000";

interface NavItem {
  name: string;
  href: string;
  target: "_self" | "_blank";
  admin: boolean;
  icon: React.ReactNode;
}

const Header: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { data: session, status } = useSession();
  const { isActive, startTime, endTime } = useEventMode();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [eventStatus, setEventStatus] = useState<
    "active" | "suspended" | "ended" | "upcoming"
  >("suspended");

  // 🔥 Ajout pour la suppression
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  console.log(showDeleteConfirm);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const navItems: NavItem[] = [
    {
      name: "Accueil",
      href: "/",
      target: "_self",
      admin: false,
      icon: <Home size={18} />,
    },
    {
      name: "Discord",
      href: "https://discord.gg/AcECGMRTkq",
      target: "_blank",
      admin: false,
      icon: <MessageCircle size={18} />,
    },
    {
      name: "Admin",
      href: "/admin",
      target: "_self",
      admin: true,
      icon: <Shield size={18} />,
    },
  ];

  // fermer menus au clic extérieur + touche Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
        setIsMobileMenuOpen(false);
        setShowDeleteConfirm(false);
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowUserMenu(false);
        setIsMobileMenuOpen(false);
        setShowDeleteConfirm(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  // Timer événement
  useEffect(() => {
    const formatTimeRemaining = (ms: number) => {
      const days = Math.floor(ms / (1000 * 60 * 60 * 24));
      const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((ms % (1000 * 60)) / 1000);
      if (days > 0) return `${days}j ${hours}h ${minutes}m`;
      if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
      if (minutes > 0) return `${minutes}m ${seconds}s`;
      return `${seconds}s`;
    };

    const updateEventStatus = () => {
      const now = new Date();
      if (!isActive) {
        setEventStatus("suspended");
        setTimeRemaining("");
        return;
      }
      if (startTime && endTime) {
        if (now < startTime) {
          setEventStatus("upcoming");
          setTimeRemaining(
            formatTimeRemaining(startTime.getTime() - now.getTime()),
          );
        } else if (now >= startTime && now <= endTime) {
          setEventStatus("active");
          setTimeRemaining(
            formatTimeRemaining(endTime.getTime() - now.getTime()),
          );
        } else {
          setEventStatus("ended");
          setTimeRemaining("");
        }
      }
    };

    updateEventStatus();
    const id = setInterval(updateEventStatus, 1000);
    return () => clearInterval(id);
  }, [isActive, startTime, endTime]);

  // Mapping couleurs
  const getEventStatusConfig = () => {
    switch (eventStatus) {
      case "active":
        return {
          icon: <Play size={14} className="text-green-600" />,
          text: "Event en cours",
          subtext: `Fin dans ${timeRemaining}`,
          bg: "bg-green-50 dark:bg-green-900/20",
          border: "border-green-200 dark:border-green-800",
          dot: "bg-green-500",
          pulse: true,
        };
      case "suspended":
        return {
          icon: <Pause size={14} className="text-orange-500" />,
          text: "Event suspendu",
          subtext: "En attente d'activation",
          bg: "bg-orange-50 dark:bg-orange-900/20",
          border: "border-orange-200 dark:border-orange-800",
          dot: "bg-orange-500",
          pulse: false,
        };
      case "ended":
        return {
          icon: <Clock size={14} className="text-red-600" />,
          text: "Event terminé",
          subtext: "Merci d'avoir participé !",
          bg: "bg-red-50 dark:bg-red-900/20",
          border: "border-red-200 dark:border-red-800",
          dot: "bg-red-500",
          pulse: false,
        };
      case "upcoming":
        return {
          icon: <Calendar size={14} className="text-blue-600" />,
          text: "Event à venir",
          subtext: `Début dans ${timeRemaining}`,
          bg: "bg-blue-50 dark:bg-blue-900/20",
          border: "border-blue-200 dark:border-blue-800",
          dot: "bg-blue-500",
          pulse: false,
        };
    }
  };

  const statusConfig = getEventStatusConfig();
  const filteredNavItems = navItems.filter(
    (item) => !item.admin || session?.user?.role === "ADMIN",
  );

  return (
    <>
      <m.header
        initial={{ y: 0 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-slate-800"
        ref={containerRef}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <m.div
              className="flex items-center space-x-3"
              whileHover={{ scale: 1.02 }}
            >
              <div className="relative">
                <Image
                  src="/HUB-RP.webp"
                  alt="PixelWar Logo"
                  width={40}
                  height={40}
                  className="rounded-lg shadow-sm"
                />
                <div className="absolute inset-0 rounded-lg blur-sm -z-10 bg-indigo-100 dark:bg-indigo-900/20"></div>
              </div>
              <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-emerald-500 bg-clip-text text-transparent">
                PixelWar
              </h1>
            </m.div>

            {/* Event status (desktop) */}
            <m.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
              className={`hidden md:flex items-center space-x-3 px-3 py-2 rounded-lg border ${statusConfig.bg} ${statusConfig.border} shadow-sm`}
              aria-hidden={false}
            >
              <div
                className={`flex items-center space-x-2 ${statusConfig.pulse ? "animate-pulse" : ""}`}
              >
                {statusConfig.icon}
                <div className="flex flex-col">
                  <span className={`text-sm font-medium ${statusConfig.text}`}>
                    {statusConfig.text}
                  </span>
                  {statusConfig.subtext && (
                    <span className={`text-xs opacity-80 ${statusConfig.text}`}>
                      {statusConfig.subtext}
                    </span>
                  )}
                </div>
              </div>
              <div className={`w-2 h-2 rounded-full ${statusConfig.dot}`} />
            </m.div>

            {/* Navigation (desktop) */}
            <nav className="hidden md:flex items-center space-x-2">
              {filteredNavItems.map((item) => (
                <m.div
                  key={item.name}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    href={item.href}
                    target={item.target}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition duration-150"
                  >
                    <span className="text-indigo-600">{item.icon}</span>
                    <span className="font-medium">{item.name}</span>
                  </Link>
                </m.div>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center space-x-3">
              {/* Theme toggle */}
              <m.button
                onClick={toggleTheme}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.96 }}
                aria-label="Basculer thème"
                className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-800 shadow-sm"
              >
                <AnimatePresence mode="wait">
                  {theme === "dark" ? (
                    <m.div
                      key="moon"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                    >
                      <Moon size={18} className="text-indigo-600" />
                    </m.div>
                  ) : (
                    <m.div
                      key="sun"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                    >
                      <Sun size={18} className="text-indigo-600" />
                    </m.div>
                  )}
                </AnimatePresence>
              </m.button>

              {/* Auth */}
              {status === "loading" ? (
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
                  <div className="w-20 h-4 bg-gray-200 rounded animate-pulse hidden sm:block" />
                </div>
              ) : session ? (
                <div
                  className="relative"
                  onClick={(e) => e.stopPropagation()}
                  ref={userMenuRef}
                >
                  <m.button
                    onClick={() => setShowUserMenu((s) => !s)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-800 shadow-sm"
                    aria-haspopup="true"
                    aria-expanded={showUserMenu}
                    aria-controls="user-menu"
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-r from-indigo-600 to-emerald-500 flex items-center justify-center">
                      {session.user?.image ? (
                        <Image
                          src={session.user.image}
                          alt="Avatar"
                          width={32}
                          height={32}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User size={16} className="text-white" />
                      )}
                    </div>
                    <span className="font-medium text-sm max-w-[6rem] truncate hidden sm:block">
                      {session.user?.name}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-gray-400 transition-transform duration-150 hidden sm:block ${showUserMenu ? "rotate-180" : ""}`}
                    />
                  </m.button>
                </div>
              ) : (
                <m.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => openInPopup(`${DOMAIN}/auth/discord-redirect`)}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md transition"
                >
                  Connexion
                </m.button>
              )}

              {/* Mobile menu toggle */}
              <m.button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMobileMenuOpen((s) => !s);
                }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                className="md:hidden p-2 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-800"
                aria-label="Menu mobile"
                aria-expanded={isMobileMenuOpen}
              >
                <AnimatePresence mode="wait">
                  {isMobileMenuOpen ? (
                    <m.div
                      key="close"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                    >
                      <X size={20} />
                    </m.div>
                  ) : (
                    <m.div
                      key="menu"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                    >
                      <Menu size={20} />
                    </m.div>
                  )}
                </AnimatePresence>
              </m.button>
            </div>
          </div>
        </div>
      </m.header>

      {/* Mobile menu panel */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/30 z-40 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            <m.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="fixed top-16 right-4 w-64 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-xl z-50 md:hidden overflow-hidden"
              role="menu"
              aria-label="Navigation mobile"
            >
              <nav className="p-4 space-y-2">
                {filteredNavItems.map((item, index) => (
                  <m.div
                    key={item.name}
                    initial={{ x: 24, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      href={item.href}
                      target={item.target}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center space-x-3 px-3 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                    >
                      <span className="text-indigo-600">{item.icon}</span>
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  </m.div>
                ))}
              </nav>
            </m.div>
          </>
        )}
      </AnimatePresence>
      {showDeleteConfirm && (
        <DeleteAccount
          showDeleteConfirm={showDeleteConfirm}
          setShowDeleteConfirm={setShowDeleteConfirm}
        />
      )}
      {showUserMenu && (
        <UserMenu
          isOpen={showUserMenu}
          setShowDeleteConfirm={setShowDeleteConfirm}
        />
      )}
    </>
  );
};

export default Header;
