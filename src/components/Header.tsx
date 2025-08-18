"use client";

import React, { useState, useEffect } from "react";
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
  const [isScrolled, setIsScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [deleteStep, setDeleteStep] = useState(0); // 0: initial, 1: typing, 2: final confirm
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [eventStatus, setEventStatus] = useState<
    "active" | "suspended" | "ended" | "upcoming"
  >("suspended");

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

  // Gestion du scroll pour l'effet glassmorphism
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fermer les menus lors du clic extérieur
  useEffect(() => {
    const handleClickOutside = () => {
      setShowUserMenu(false);
      setIsMobileMenuOpen(false);
      setShowDeleteConfirm(false);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Fonction de synchronisation
  const handleSync = async () => {
    setIsSyncing(true);
    setSyncMessage("");

    try {
      const response = await fetch("/api/user/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok) {
        setSyncMessage("✅ Synchronisation réussie !");
        // Recharger la session pour mettre à jour les données
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setSyncMessage(data.error || "❌ Erreur lors de la synchronisation");
      }
    } catch (error) {
      console.error("Sync error:", error);
      setSyncMessage("❌ Erreur de connexion");
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(""), 3000);
    }
  };

  // Fonction de suppression de compte
  const handleDeleteAccount = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch("/api/user/delete-account", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          confirmation: "DELETE_ACCOUNT",
        }),
      });

      if (response.ok) {
        // Déconnexion et redirection
        await signOut({ callbackUrl: "/" });
      } else {
        const data = await response.json();
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

  // Event timer logic
  useEffect(() => {
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
          const diff = startTime.getTime() - now.getTime();
          setTimeRemaining(formatTimeRemaining(diff));
        } else if (now >= startTime && now <= endTime) {
          setEventStatus("active");
          const diff = endTime.getTime() - now.getTime();
          setTimeRemaining(formatTimeRemaining(diff));
        } else {
          setEventStatus("ended");
          setTimeRemaining("");
        }
      }
    };

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

    updateEventStatus();
    const interval = setInterval(updateEventStatus, 1000);

    return () => clearInterval(interval);
  }, [isActive, startTime, endTime]);

  const getEventStatusConfig = () => {
    switch (eventStatus) {
      case "active":
        return {
          icon: <Play size={14} className="text-green-500" />,
          text: "Event en cours",
          subtext: `Fin dans ${timeRemaining}`,
          bgColor: "bg-green-50 dark:bg-green-950/20",
          borderColor: "border-green-200 dark:border-green-800",
          textColor: "text-green-700 dark:text-green-300",
          pulse: true,
        };
      case "suspended":
        return {
          icon: <Pause size={14} className="text-orange-500" />,
          text: "Event suspendu",
          subtext: "En attente d'activation",
          bgColor: "bg-orange-50 dark:bg-orange-950/20",
          borderColor: "border-orange-200 dark:border-orange-800",
          textColor: "text-orange-700 dark:text-orange-300",
          pulse: false,
        };
      case "ended":
        return {
          icon: <Clock size={14} className="text-red-500" />,
          text: "Event terminé",
          subtext: "Merci d'avoir participé !",
          bgColor: "bg-red-50 dark:bg-red-950/20",
          borderColor: "border-red-200 dark:border-red-800",
          textColor: "text-red-700 dark:text-red-300",
          pulse: false,
        };
      case "upcoming":
        return {
          icon: <Calendar size={14} className="text-blue-500" />,
          text: "Event à venir",
          subtext: `Début dans ${timeRemaining}`,
          bgColor: "bg-blue-50 dark:bg-blue-950/20",
          borderColor: "border-blue-200 dark:border-blue-800",
          textColor: "text-blue-700 dark:text-blue-300",
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
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-background/80 backdrop-blur-md border-b border-border shadow-lg"
            : "bg-background/95 backdrop-blur-sm"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo et titre */}
            <m.div
              className="flex items-center space-x-3"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <div className="relative">
                <Image
                  src="/HUB-RP.webp"
                  alt="PixelWar Logo"
                  width={40}
                  height={40}
                  className="rounded-lg shadow-md"
                />
                <div className="absolute inset-0 bg-accent/20 rounded-lg blur-sm -z-10"></div>
              </div>
              <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-text to-accent-600 bg-clip-text text-transparent">
                PixelWar
              </h1>
            </m.div>

            {/* Event Status Display */}
            <m.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className={`hidden md:flex items-center space-x-2 px-3 py-2 rounded-lg border ${statusConfig.bgColor} ${statusConfig.borderColor} shadow-sm`}
            >
              <div
                className={`flex items-center space-x-1 ${statusConfig.pulse ? "animate-pulse" : ""}`}
              >
                {statusConfig.icon}
                <span
                  className={`text-sm font-medium ${statusConfig.textColor}`}
                >
                  {statusConfig.text}
                </span>
              </div>
              {statusConfig.subtext && (
                <>
                  <div
                    className={`w-1 h-1 rounded-full ${statusConfig.textColor.replace("text-", "bg-")}`}
                  ></div>
                  <span
                    className={`text-xs ${statusConfig.textColor} opacity-75`}
                  >
                    {statusConfig.subtext}
                  </span>
                </>
              )}
            </m.div>

            {/* Navigation desktop */}
            <nav className="hidden md:flex items-center space-x-1">
              {filteredNavItems.map((item) => (
                <m.div
                  key={item.name}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    href={item.href}
                    target={item.target}
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg text-text-secondary hover:text-text hover:bg-surface-hover transition-all duration-200 group"
                  >
                    <span className="text-accent-600 group-hover:text-accent-700 transition-colors">
                      {item.icon}
                    </span>
                    <span className="font-medium">{item.name}</span>
                  </Link>
                </m.div>
              ))}
            </nav>

            {/* Actions (theme + auth) */}
            <div className="flex items-center space-x-3">
              {/* Toggle theme */}
              <m.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-surface hover:bg-surface-hover border border-border transition-all duration-200 shadow-sm"
                aria-label="Toggle theme"
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
                      <Moon size={18} className="text-accent-600" />
                    </m.div>
                  ) : (
                    <m.div
                      key="sun"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Sun size={18} className="text-accent-600" />
                    </m.div>
                  )}
                </AnimatePresence>
              </m.button>

              {/* Auth section */}
              {status === "loading" ? (
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-surface animate-pulse"></div>
                  <div className="w-16 h-4 bg-surface rounded animate-pulse hidden sm:block"></div>
                </div>
              ) : session ? (
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <m.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-surface hover:bg-surface-hover border border-border transition-all duration-200 shadow-sm"
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-r from-accent to-accent-600 flex items-center justify-center">
                      {session.user?.image ? (
                        <Image
                          src={session.user.image}
                          alt="Discord Avatar"
                          width={32}
                          height={32}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User size={16} className="text-white" />
                      )}
                    </div>
                    <span className="font-medium text-sm max-w-24 truncate hidden sm:block">
                      {session.user?.name}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-muted transition-transform duration-200 hidden sm:block ${
                        showUserMenu ? "rotate-180" : ""
                      }`}
                    />
                  </m.button>

                  <AnimatePresence>
                    {showUserMenu && (
                      <m.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 top-full mt-2 w-72 bg-background border border-border rounded-lg shadow-xl overflow-hidden"
                      >
                        <div className="p-4 border-b border-border">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-r from-accent to-accent-600 flex items-center justify-center">
                              {session.user?.image ? (
                                <Image
                                  src={session.user.image}
                                  alt="Discord Avatar"
                                  width={40}
                                  height={40}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <User size={20} className="text-white" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-sm text-text">
                                {session.user?.name}
                              </p>
                              <p className="text-xs text-muted truncate">
                                {session.user?.email}
                              </p>
                            </div>
                          </div>

                          {/* Status indicators */}
                          <div className="space-y-2">
                            {session.user?.linked ? (
                              <>
                                <div className="flex items-center justify-between p-2 rounded-lg bg-surface">
                                  <div className="flex items-center space-x-2">
                                    <Link2
                                      size={16}
                                      className="text-green-500"
                                    />
                                    <span className="text-sm font-medium">
                                      Liaison Discord
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <CheckCircle
                                      size={16}
                                      className="text-green-500"
                                    />

                                    <span className="text-xs font-medium text-green-600">
                                      Liée
                                    </span>
                                  </div>
                                </div>
                                <p className="text-xs text-muted px-2">
                                  Vous pouvez placer des pixels sur la toile
                                </p>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() =>
                                    openInPopup(
                                      "http://localhost:3000/auth/discord-redirect",
                                    )
                                  }
                                  className="flex items-center justify-between w-full p-2 rounded-lg bg-surface hover:bg-surface-hover transition-all"
                                >
                                  <div className="flex items-center space-x-2">
                                    <Link2
                                      size={16}
                                      className="text-orange-500"
                                    />
                                    <span className="text-sm font-medium">
                                      Liaison Discord
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <AlertCircle
                                      size={16}
                                      className="text-orange-500"
                                    />
                                    <span className="text-xs font-medium text-orange-600">
                                      Non liée
                                    </span>
                                  </div>
                                </button>
                                <p className="text-xs text-muted px-2">
                                  Liaison obligatoire pour placer un pixel
                                </p>
                              </>
                            )}
                            {/* Link status */}

                            {/* Boost status */}
                            <div className="flex items-center justify-between p-2 rounded-lg bg-surface">
                              <div className="flex items-center space-x-2">
                                <Zap
                                  size={16}
                                  className={
                                    session.user?.boosted
                                      ? "text-purple-500"
                                      : "text-gray-400"
                                  }
                                />
                                <span className="text-sm font-medium">
                                  Serveur Boosté
                                </span>
                              </div>
                              <div className="flex items-center space-x-1">
                                {session.user?.boosted ? (
                                  <CheckCircle
                                    size={16}
                                    className="text-purple-500"
                                  />
                                ) : (
                                  <X size={16} className="text-gray-400" />
                                )}
                                <span
                                  className={`text-xs font-medium ${session.user?.boosted ? "text-purple-600" : "text-gray-500"}`}
                                >
                                  {session.user?.boosted ? "Actif" : "Inactif"}
                                </span>
                              </div>
                            </div>
                            <p className="text-xs text-muted px-2">
                              {session.user?.boosted
                                ? "Cooldown réduit à 45 secondes"
                                : "Boostez le serveur pour réduire le cooldown de 60 à 45 sec"}
                            </p>
                          </div>
                        </div>

                        <div className="p-2 space-y-1">
                          {/* Synchronization button */}
                          <button
                            onClick={handleSync}
                            disabled={isSyncing}
                            className="w-full flex items-center space-x-2 px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

                          {/* Sync message */}
                          {syncMessage && (
                            <div className="px-3 py-2 text-xs text-center rounded-lg bg-surface">
                              {syncMessage}
                            </div>
                          )}

                          {/* Logout button */}
                          <button
                            onClick={() => signOut()}
                            className="w-full flex items-center space-x-2 px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-950/20 rounded-lg transition-colors"
                          >
                            <LogOut size={16} />
                            <span>Déconnexion</span>
                          </button>

                          {/* Delete account button */}
                          <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="w-full flex items-center space-x-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                            <span>Supprimer le compte</span>
                          </button>
                        </div>

                        {/* Delete confirmation modal */}
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
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-background border border-border rounded-lg p-6 max-w-md w-full mx-auto my-auto shadow-2xl"
                              >
                                <div className="flex items-center space-x-3 mb-4">
                                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/20 flex items-center justify-center">
                                    <Trash2
                                      size={20}
                                      className="text-red-600"
                                    />
                                  </div>
                                  <div>
                                    <h3 className="font-semibold text-lg">
                                      Supprimer le compte
                                    </h3>
                                    <p className="text-sm text-muted">
                                      Cette action est irréversible
                                    </p>
                                  </div>
                                </div>

                                {deleteStep === 0 && (
                                  <div className="space-y-4">
                                    <div className="bg-red-50 dark:bg-red-950/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
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
                                        className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-surface transition-colors"
                                      >
                                        Annuler
                                      </button>
                                      <button
                                        onClick={() => setDeleteStep(1)}
                                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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
                                        if (e.target.value === "SUPPRIMER") {
                                          setDeleteStep(2);
                                        }
                                      }}
                                      className="w-full px-3 py-2 border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-red-500"
                                      placeholder="Tapez SUPPRIMER"
                                    />
                                    <div className="flex space-x-3">
                                      <button
                                        onClick={() => setDeleteStep(0)}
                                        className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-surface transition-colors"
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
                                      Êtes-vous absolument certain(e) de vouloir
                                      supprimer votre compte ? Cette action est
                                      irréversible.
                                    </p>
                                    <div className="flex space-x-3">
                                      <button
                                        onClick={() => setDeleteStep(1)}
                                        className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-surface transition-colors"
                                      >
                                        Retour
                                      </button>
                                      <button
                                        onClick={handleDeleteAccount}
                                        disabled={isDeleting}
                                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                    openInPopup("http://localhost:3000/auth/discord-redirect")
                  }
                  className="px-4 py-2 rounded-lg bg-accent-600 hover:to-accent-700 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200"
                >
                  Connexion
                </m.button>
              )}

              {/* Menu mobile button */}
              <m.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMobileMenuOpen(!isMobileMenuOpen);
                }}
                className="md:hidden p-2 rounded-lg bg-surface hover:bg-surface-hover border border-border transition-all duration-200"
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
                      <X size={20} />
                    </m.div>
                  ) : (
                    <m.div
                      key="menu"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
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

      {/* Menu mobile */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Overlay */}
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Menu panel */}
            <m.div
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-16 right-4 w-64 bg-background border border-border rounded-lg shadow-xl z-50 md:hidden overflow-hidden"
            >
              <nav className="p-4 space-y-2">
                {filteredNavItems.map((item, index) => (
                  <m.div
                    key={item.name}
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link
                      href={item.href}
                      target={item.target}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center space-x-3 px-3 py-3 rounded-lg text-text-secondary hover:text-text hover:bg-surface-hover transition-all duration-200 group"
                    >
                      <span className="text-accent-600 group-hover:text-accent-700 transition-colors">
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

      {/* Spacer pour compenser le header fixed */}
      <div className="h-16 md:h-20"></div>
    </>
  );
};

export default Header;
