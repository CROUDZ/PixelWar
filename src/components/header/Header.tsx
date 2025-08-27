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
import dynamic from "next/dynamic";

const DeleteAccount = dynamic(
  () => import("@/components/header/DeleteAccount"),
);
const UserMenu = dynamic(() => import("@/components/header/userMenu"));

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
          bg: "bg-green-50/80 dark:bg-green-900/20",
          border: "border-green-200/50 dark:border-green-800/50",
          dot: "bg-green-500",
          pulse: true,
        };
      case "suspended":
        return {
          icon: <Pause size={14} className="text-gray-500" />,
          text: "Event suspendu",
          subtext: "En attente d'activation",
          bg: "bg-gray-50/80 dark:bg-gray-900/20",
          border: "border-gray-200/50 dark:border-gray-800/50",
          dot: "bg-gray-500",
          pulse: false,
        };
      case "ended":
        return {
          icon: <Clock size={14} className="text-gray-600" />,
          text: "Event terminé",
          subtext: "Merci d'avoir participé !",
          bg: "bg-gray-50/80 dark:bg-gray-900/20",
          border: "border-gray-200/50 dark:border-gray-800/50",
          dot: "bg-gray-600",
          pulse: false,
        };
      case "upcoming":
        return {
          icon: <Calendar size={14} className="text-blue-600" />,
          text: "Event à venir",
          subtext: `Début dans ${timeRemaining}`,
          bg: "bg-blue-50/80 dark:bg-blue-900/20",
          border: "border-blue-200/50 dark:border-blue-800/50",
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
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50 shadow-lg"
        ref={containerRef}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <m.div
              className="flex items-center space-x-3"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <div className="relative group">
                <Image
                  src="/HUB-RP.webp"
                  alt="PixelWar Logo"
                  width={40}
                  height={40}
                  className="rounded-lg shadow-lg transition-all duration-300 group-hover:shadow-xl"
                />
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-200/20 to-cyan-600/20 blur-sm -z-10 group-hover:blur-md transition-all duration-300"></div>
              </div>
              <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-cyan-600 to-cyan-800 bg-clip-text text-transparent">
                PixelWar
              </h1>
            </m.div>

            {/* Event status (desktop) */}
            <m.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: 0.15,
                type: "spring",
                stiffness: 300,
                damping: 25,
              }}
              className={`hidden md:flex items-center space-x-3 px-4 py-2.5 rounded-xl border backdrop-blur-sm ${statusConfig.bg} ${statusConfig.border} shadow-lg`}
              aria-hidden={false}
            >
              <div
                className={`flex items-center space-x-2.5 ${statusConfig.pulse ? "animate-pulse" : ""}`}
              >
                {statusConfig.icon}
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {statusConfig.text}
                  </span>
                  {statusConfig.subtext && (
                    <span className="text-xs text-gray-600 dark:text-gray-300">
                      {statusConfig.subtext}
                    </span>
                  )}
                </div>
              </div>
              <div
                className={`w-2.5 h-2.5 rounded-full ${statusConfig.dot} ${statusConfig.pulse ? "animate-ping" : ""}`}
              />
            </m.div>

            {/* Navigation (desktop) */}
            <nav className="hidden md:flex items-center space-x-1">
              {filteredNavItems.map((item, index) => (
                <m.div
                  key={item.name}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.1 + index * 0.1,
                    type: "spring",
                    stiffness: 300,
                    damping: 25,
                  }}
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    href={item.href}
                    target={item.target}
                    className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-200"
                  >
                    <span className="text-cyan-600 group-hover:scale-110 transition-transform duration-200">
                      {item.icon}
                    </span>
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
                whileHover={{ scale: 1.06, rotate: 5 }}
                whileTap={{ scale: 0.96 }}
                aria-label="Basculer thème"
                className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-200"
              >
                <AnimatePresence mode="wait">
                  {theme === "dark" ? (
                    <m.div
                      key="moon"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Moon size={18} className="text-cyan-600" />
                    </m.div>
                  ) : (
                    <m.div
                      key="sun"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Sun size={18} className="text-cyan-600" />
                    </m.div>
                  )}
                </AnimatePresence>
              </m.button>

              {/* Auth */}
              {status === "loading" ? (
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
                  <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse hidden sm:block" />
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
                    className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-200"
                    aria-haspopup="true"
                    aria-expanded={showUserMenu}
                    aria-controls="user-menu"
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-r from-cyan-500 to-cyan-700 flex items-center justify-center shadow-sm">
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
                    <span className="font-medium text-sm max-w-[6rem] truncate hidden sm:block text-gray-900 dark:text-white">
                      {session.user?.name}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-gray-500 transition-transform duration-200 hidden sm:block ${showUserMenu ? "rotate-180" : ""}`}
                    />
                  </m.button>

                  {/* User Menu Dropdown */}
                  <UserMenu
                    isOpen={showUserMenu}
                    setShowDeleteConfirm={setShowDeleteConfirm}
                  />
                </div>
              ) : (
                <m.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => openInPopup(`${DOMAIN}/auth/discord-redirect`)}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
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
                whileHover={{ scale: 1.08, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                className="md:hidden p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-200"
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
                      transition={{ duration: 0.2 }}
                    >
                      <X size={20} className="text-gray-900 dark:text-white" />
                    </m.div>
                  ) : (
                    <m.div
                      key="menu"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Menu
                        size={20}
                        className="text-gray-900 dark:text-white"
                      />
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
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            <m.div
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="fixed top-20 right-4 w-72 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-800/50 rounded-2xl shadow-xl z-50 md:hidden overflow-hidden"
              role="menu"
              aria-label="Navigation mobile"
            >
              <nav className="p-6 space-y-3">
                {filteredNavItems.map((item, index) => (
                  <m.div
                    key={item.name}
                    initial={{ x: 24, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{
                      delay: index * 0.05,
                      type: "spring",
                      stiffness: 300,
                      damping: 25,
                    }}
                  >
                    <Link
                      href={item.href}
                      target={item.target}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 group"
                    >
                      <span className="text-cyan-600 group-hover:scale-110 transition-transform duration-200">
                        {item.icon}
                      </span>
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  </m.div>
                ))}
              </nav>
            </m.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Account Confirmation */}
      {showDeleteConfirm && (
        <DeleteAccount
          showDeleteConfirm={showDeleteConfirm}
          setShowDeleteConfirm={setShowDeleteConfirm}
        />
      )}
    </>
  );
};

export default Header;
