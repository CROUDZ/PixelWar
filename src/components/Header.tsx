"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useSession, signOut } from "next-auth/react";
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
  LogOut,
  Home,
  Shield,
  MessageCircle,
  ChevronDown,
  Link2,
  Zap,
  AlertCircle,
  CheckCircle,
  Trash2,
  RefreshCw,
  Clock,
  Play,
  Pause,
  Calendar,
} from "lucide-react";

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [deleteStep, setDeleteStep] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [eventStatus, setEventStatus] = useState<
    "active" | "suspended" | "ended" | "upcoming"
  >("suspended");

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
      href: "https://discord.gg/your-discord-link",
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

  // Synchronisation
  const handleSync = async () => {
    setIsSyncing(true);
    setSyncMessage("");
    try {
      const res = await fetch("/api/user/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        setSyncMessage("✅ Synchronisation réussie !");
        setTimeout(() => window.location.reload(), 1200);
      } else {
        setSyncMessage(data.error || "❌ Erreur lors de la synchronisation");
      }
    } catch (err) {
      console.error(err);
      setSyncMessage("❌ Erreur de connexion");
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(""), 3000);
    }
  };

  // Suppression compte
  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch("/api/user/delete-account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "DELETE_ACCOUNT" }),
      });
      if (res.ok) {
        await signOut({ callbackUrl: "/" });
      } else {
        const data = await res.json();
        alert(data.error || "Erreur lors de la suppression");
      }
    } catch {
      alert("Erreur de connexion");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setDeleteStep(0);
    }
  };

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

  // Mapping couleurs (classes Tailwind valides)
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

                  <AnimatePresence>
                    {showUserMenu && (
                      <m.div
                        id="user-menu"
                        initial={{ opacity: 0, scale: 0.97, y: -6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97, y: -6 }}
                        transition={{ duration: 0.15 }}
                        className="fixed z-[9999999] right-4 top-20 w-72 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-xl overflow-hidden"
                        style={{ zIndex: 9999999 }}
                        role="menu"
                      >
                        <div className="p-4 border-b border-gray-100 dark:border-slate-800">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-r from-indigo-600 to-emerald-500 flex items-center justify-center">
                              {session.user?.image ? (
                                <Image
                                  src={session.user.image}
                                  alt="Avatar"
                                  width={40}
                                  height={40}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <User size={20} className="text-white" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                {session.user?.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {session.user?.email}
                              </p>
                            </div>
                          </div>

                          {/* Statuts utilisateur */}
                          <div className="space-y-2">
                            {session.user?.linked ? (
                              <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-slate-800">
                                <div className="flex items-center space-x-2 text-sm">
                                  <Link2 size={16} className="text-green-600" />
                                  <span className="font-medium">
                                    Liaison Discord
                                  </span>
                                </div>
                                <div className="flex items-center space-x-1 text-sm text-green-600">
                                  <CheckCircle size={16} />
                                  <span className="font-medium">Liée</span>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() =>
                                  openInPopup(
                                    `http://${window.location.host}/auth/discord-redirect`,
                                  )
                                }
                                className="w-full flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition"
                              >
                                <div className="flex items-center space-x-2">
                                  <Link2
                                    size={16}
                                    className="text-orange-500"
                                  />
                                  <span className="font-medium">
                                    Liaison Discord
                                  </span>
                                </div>
                                <div className="flex items-center space-x-1 text-sm text-orange-600">
                                  <AlertCircle size={16} />
                                  <span className="font-medium">Non liée</span>
                                </div>
                              </button>
                            )}

                            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-slate-800">
                              <div className="flex items-center space-x-2">
                                <Zap
                                  size={16}
                                  className={
                                    session.user?.boosted
                                      ? "text-purple-600"
                                      : "text-gray-400"
                                  }
                                />
                                <span className="font-medium">
                                  Serveur Boosté
                                </span>
                              </div>
                              <div className="flex items-center space-x-1 text-sm">
                                {session.user?.boosted ? (
                                  <CheckCircle
                                    size={16}
                                    className="text-purple-600"
                                  />
                                ) : (
                                  <X size={16} className="text-gray-400" />
                                )}
                                <span
                                  className={
                                    session.user?.boosted
                                      ? "text-purple-600 font-medium"
                                      : "text-gray-500 font-medium"
                                  }
                                >
                                  {session.user?.boosted ? "Actif" : "Inactif"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="p-2 space-y-1">
                          <button
                            onClick={handleSync}
                            disabled={isSyncing}
                            className="w-full flex items-center space-x-2 px-3 py-2 text-left text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition disabled:opacity-50"
                          >
                            <RefreshCw
                              size={16}
                              className={isSyncing ? "animate-spin" : ""}
                            />
                            <span>
                              {isSyncing
                                ? "Synchronisation..."
                                : "Synchroniser Discord"}
                            </span>
                          </button>

                          {syncMessage && (
                            <div className="px-3 py-2 text-xs text-center rounded-lg bg-gray-50">
                              {syncMessage}
                            </div>
                          )}

                          <button
                            onClick={() => signOut()}
                            className="w-full flex items-center space-x-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition"
                          >
                            <LogOut size={16} />
                            <span>Déconnexion</span>
                          </button>

                          <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="w-full flex items-center space-x-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 size={16} />
                            <span>Supprimer le compte</span>
                          </button>
                        </div>

                        {/* Delete modal */}
                        <AnimatePresence>
                          {showDeleteConfirm && (
                            <m.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
                              onClick={() => {
                                setShowDeleteConfirm(false);
                                setDeleteStep(0);
                              }}
                            >
                              <m.div
                                initial={{ scale: 0.98, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.98, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg p-6 max-w-md w-full shadow-2xl"
                              >
                                <div className="flex items-center space-x-3 mb-4">
                                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                                    <Trash2
                                      size={20}
                                      className="text-red-600"
                                    />
                                  </div>
                                  <div>
                                    <h3 className="font-semibold text-lg">
                                      Supprimer le compte
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                      Cette action est irréversible
                                    </p>
                                  </div>
                                </div>

                                {deleteStep === 0 && (
                                  <div className="space-y-4">
                                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
                                      <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">
                                        ⚠️ Attention
                                      </h4>
                                      <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                                        <li>
                                          • Tous vos pixels seront supprimés
                                        </li>
                                        <li>
                                          • Votre compte sera définitivement
                                          effacé
                                        </li>
                                        <li>
                                          • Cette action ne peut pas être
                                          annulée
                                        </li>
                                      </ul>
                                    </div>

                                    <div className="flex space-x-3">
                                      <button
                                        onClick={() => {
                                          setShowDeleteConfirm(false);
                                          setDeleteStep(0);
                                        }}
                                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                                      >
                                        Annuler
                                      </button>
                                      <button
                                        onClick={() => setDeleteStep(1)}
                                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                      >
                                        Continuer
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {deleteStep === 1 && (
                                  <div className="space-y-4">
                                    <p className="text-sm">
                                      Tapez <strong>"SUPPRIMER"</strong> pour
                                      confirmer :
                                    </p>
                                    <input
                                      type="text"
                                      onChange={(e) => {
                                        if (e.target.value === "SUPPRIMER")
                                          setDeleteStep(2);
                                      }}
                                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                      placeholder="Tapez SUPPRIMER"
                                    />
                                    <div className="flex space-x-3">
                                      <button
                                        onClick={() => setDeleteStep(0)}
                                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                                      >
                                        Retour
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {deleteStep === 2 && (
                                  <div className="space-y-4">
                                    <p className="text-sm font-medium text-red-600">
                                      🚨 Dernière confirmation
                                    </p>
                                    <p className="text-sm">
                                      Êtes-vous absolument certain(e) ?
                                    </p>
                                    <div className="flex space-x-3">
                                      <button
                                        onClick={() => setDeleteStep(1)}
                                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                                      >
                                        Retour
                                      </button>
                                      <button
                                        onClick={handleDeleteAccount}
                                        disabled={isDeleting}
                                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50"
                                      >
                                        {isDeleting
                                          ? "Suppression..."
                                          : "Supprimer définitivement"}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </m.div>
                            </m.div>
                          )}
                        </AnimatePresence>
                      </m.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <m.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() =>
                    openInPopup(`http://${window.location.host}/auth/discord-redirect`)
                  }
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
    </>
  );
};

export default Header;
