import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getSession, useSession } from "next-auth/react";
import { GetServerSideProps } from "next";
import dynamic from "next/dynamic";
import { m } from "framer-motion";
import {
  Users,
  Zap,
  UserX,
  Calendar,
  AlertTriangle,
  Trash2,
  ArrowLeft,
  UserPlus,
  UserMinus,
  Ban,
  CheckCircle,
  XCircle,
  Search,
  Loader2,
  Crown,
  Clock,
  Palette,
  Database,
  Settings,
  Play,
  Pause,
} from "lucide-react";
import { useEventMode } from "@/context/EventMode"; // Import EventMode context
import { sendWS } from "@/lib/ws";

const Header = dynamic(() => import("../components/header/Header"), {
  ssr: false,
});

const A2F = dynamic(() => import("../components/admin/A2F"), {
  ssr: false,
});

// Define the User type
type User = {
  id: string;
  discordId?: string;
  email?: string;
  username?: string;
  global_name?: string;
};

// Component for clearing the canvas - DANGEROUS OPERATION
const ClearCanvasButton: React.FC = () => {
  const [isClearing, setIsClearing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [clearMessage, setClearMessage] = useState("");

  const handleClearCanvas = async () => {
    if (confirmationText !== "SUPPRIMER TOUT") {
      setClearMessage(
        "Veuillez taper exactement 'SUPPRIMER TOUT' pour confirmer",
      );
      return;
    }

    setIsClearing(true);
    setClearMessage("");

    try {
      const response = await fetch("/api/clear-canvas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          confirmationToken: "CLEAR_CANVAS_CONFIRM",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setClearMessage(
          `✅ Toile nettoyée avec succès ! Opération effectuée par ${data.clearedBy} à ${new Date(data.timestamp).toLocaleString()}`,
        );
        setShowConfirmation(false);
        setConfirmationText("");
      } else {
        setClearMessage(`❌ Erreur: ${data.error}`);
      }
    } catch (error) {
      setClearMessage(`❌ Erreur de réseau: ${error}`);
    } finally {
      setIsClearing(false);
    }
  };

  const cancelClear = () => {
    setShowConfirmation(false);
    setConfirmationText("");
    setClearMessage("");
  };

  if (showConfirmation) {
    return (
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
            <h3 className="text-lg font-bold text-red-700 dark:text-red-300">
              CONFIRMATION FINALE REQUISE
            </h3>
          </div>
          <p className="text-red-700 dark:text-red-300 mb-4">
            Pour confirmer que vous voulez vraiment supprimer TOUTE la toile et
            son historique, tapez exactement <strong>"SUPPRIMER TOUT"</strong>{" "}
            (sans les guillemets) dans le champ ci-dessous :
          </p>
          <input
            type="text"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            placeholder="Tapez SUPPRIMER TOUT"
            className="w-full px-4 py-3 rounded-xl border border-red-300 dark:border-red-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-red-400 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
          />
        </div>

        <div className="flex gap-4">
          <m.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleClearCanvas}
            disabled={isClearing || confirmationText !== "SUPPRIMER TOUT"}
            className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {isClearing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Nettoyage en cours...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                CONFIRMER LA SUPPRESSION
              </>
            )}
          </m.button>
          <m.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={cancelClear}
            disabled={isClearing}
            className="px-6 py-3 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white font-semibold rounded-xl transition-colors"
          >
            Annuler
          </m.button>
        </div>

        {clearMessage && (
          <m.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`p-4 rounded-xl border ${
              clearMessage.includes("✅")
                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
                : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {clearMessage.includes("✅") ? (
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 flex-shrink-0" />
              )}
              {clearMessage}
            </div>
          </m.div>
        )}
      </m.div>
    );
  }

  return (
    <div className="space-y-4">
      <m.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setShowConfirmation(true)}
        className="w-full px-6 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors border-2 border-red-500 shadow-lg flex items-center justify-center gap-2"
      >
        <Trash2 className="w-5 h-5" />
        NETTOYER COMPLÈTEMENT LA TOILE
      </m.button>

      {clearMessage && (
        <m.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-4 rounded-xl border ${
            clearMessage.includes("✅")
              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
              : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {clearMessage.includes("✅") ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 flex-shrink-0" />
            )}
            {clearMessage}
          </div>
        </m.div>
      )}
    </div>
  );
};

const AdminPage: React.FC = () => {
  const { data: session } = useSession();
  const { isActive, startTime, endTime, setEventState, width: currentWidth, height: currentHeight } = useEventMode(); // Use EventMode context
  const [admin, setAdmin] = useState("");
  const [userId, setUserId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [banMessage, setBanMessage] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [newStartTime, setNewStartTime] = useState<string>("");
  const [newEndTime, setNewEndTime] = useState<string>("");
  const [newWidth, setNewWidth] = useState<number>(currentWidth || 100); // New width input
  const [newHeight, setNewHeight] = useState<number>(currentHeight || 100); // New height input
  const [updateSuccess, setUpdateSuccess] = useState(false);

  const handleAdmin = async (e: React.FormEvent, newRole: "ADMIN" | "USER") => {
    e.preventDefault();
    if (!admin.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/prisma/adminUpdate", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: admin.trim(), newRole }),
      });

      const data = await res.json();
      console.log(data);
      if (data.success) {
        setMessage("Administrateur ajouté avec succès !");
        setAdmin("");
      } else {
        setMessage(data.error || "Erreur lors de l'ajout de l'administrateur");
      }
    } catch {
      setMessage("Erreur lors de l'ajout de l'administrateur");
    }
    setIsLoading(false);
  };

  // Function to handle banning/unbanning users
  const handleBanAction = async (action: "ban" | "unban") => {
    if (!userId.trim()) return;
    setIsLoading(true);
    setBanMessage("");

    try {
      const res = await fetch("/api/user/banned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId.trim(), action }),
      });

      const data = await res.json();
      if (res.ok) {
        setBanMessage(data.message);
        setUserId("");
      } else {
        setBanMessage(data.error || "Erreur lors de l'action.");
      }
    } catch {
      setBanMessage("Erreur lors de l'action.");
    }
    setIsLoading(false);
  };

  const handleEventUpdate = async () => {
    const start = newStartTime ? new Date(newStartTime) : null;
    const end = newEndTime ? new Date(newEndTime) : null;
    await setEventState(!isActive, start, end, newWidth, newHeight);
    // Inform WS server that grid size may have changed
    try {
      sendWS({ type: "gridSizeChanged", width: newWidth, height: newHeight, isAdmin: true });
    } catch (e) {
      console.error("WS notify gridSizeChanged failed:", e);
    }
  };

  const handleSizeUpdate = async () => {
    console.log("Updating Event Mode Size:", { newWidth, newHeight });
    await setEventState(isActive, startTime, endTime, newWidth, newHeight);
    // Notify WS server to reload grid size without restart
    try {
      sendWS({ type: "gridSizeChanged", width: newWidth, height: newHeight, isAdmin: true });
    } catch (e) {
      console.error("WS notify gridSizeChanged failed:", e);
    }
    setUpdateSuccess(true);
    setTimeout(() => setUpdateSuccess(false), 3000);
  };

  // Fetch all users
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/user/getAll");
      const data = await res.json();
      setUsers(data);
      setFilteredUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
    setIsLoading(false);
  };

  // Filter users based on search query
  useEffect(() => {
    const query = searchQuery.toLowerCase();
    const filtered = users.filter(
      (user) =>
        user.discordId?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.username?.toLowerCase().includes(query) ||
        user.global_name?.toLowerCase().includes(query),
    );
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-900 flex items-center justify-center">
        <m.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-lg"
        >
          <Loader2 className="w-12 h-12 animate-spin text-cyan-500 mx-auto" />
          <p className="mt-4 text-center text-gray-600 dark:text-gray-400">
            Chargement...
          </p>
        </m.div>
      </div>
    );
  }

  if (!session.user.twoFA) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-900">
        <Header />
        <A2F />
      </div>
    );
  }

  // Page admin principale
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-gray-800">
      <Header />

      <main className="max-w-7xl mx-auto p-6 space-y-8">
        {/* En-tête de l'admin avec breadcrumb */}
        <m.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 rounded-3xl p-8 shadow-xl"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
                <span>PixelWar</span>
                <span>/</span>
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  Administration
                </span>
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent mb-2">
                Centre d'Administration
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                Tableau de bord administrateur • Gestion et surveillance en
                temps réel
              </p>
            </div>
            <m.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                href="/"
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-2xl px-8 py-4 transition-all duration-300 inline-flex items-center gap-3 shadow-lg hover:shadow-xl"
              >
                <ArrowLeft className="w-5 h-5" />
                Retour au Jeu
              </Link>
            </m.div>
          </div>
        </m.div>

        {/* Statistiques améliorées */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ y: -5 }}
            className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    Live
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    Serveur en ligne
                  </p>
                </div>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </m.div>

          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ y: -5 }}
            className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Palette className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    10k
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    Pixels placés
                  </p>
                </div>
              </div>
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            </div>
          </m.div>
        </div>

        {/* Gestion des administrateurs améliorée */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 rounded-3xl p-8 shadow-xl"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Crown className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Gestion des Administrateurs
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Ajouter ou retirer des privilèges administrateur
              </p>
            </div>
            <div className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-sm font-medium">
              Niveau Élevé
            </div>
          </div>

          <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-300 mb-2">
                  Information Importante
                </h3>
                <p className="text-amber-700 dark:text-amber-400">
                  L'utilisateur doit se connecter au moins une fois pour que son
                  compte soit créé dans la base de données avant de pouvoir lui
                  attribuer des privilèges.
                </p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Ajouter Admin */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <UserPlus className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Promouvoir Administrateur
                </h3>
              </div>
              <form
                onSubmit={(e) => handleAdmin(e, "ADMIN")}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Adresse email du nouvel administrateur
                  </label>
                  <input
                    type="email"
                    value={admin}
                    onChange={(e) => setAdmin(e.target.value)}
                    placeholder="admin@example.com"
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    required
                  />
                </div>

                <m.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading || !admin.trim()}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-6 py-3 transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Promotion en cours...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Promouvoir Administrateur
                    </>
                  )}
                </m.button>
              </form>
            </div>

            {/* Retirer Admin */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <UserMinus className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Rétrograder Administrateur
                </h3>
              </div>
              <form
                onSubmit={(e) => handleAdmin(e, "USER")}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Adresse email de l'administrateur à rétrograder
                  </label>
                  <input
                    type="email"
                    value={admin}
                    onChange={(e) => setAdmin(e.target.value)}
                    placeholder="admin@example.com"
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    required
                  />
                </div>

                <m.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading || !admin.trim()}
                  className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-6 py-3 transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Rétrogradation en cours...
                    </>
                  ) : (
                    <>
                      <UserMinus className="w-4 h-4" />
                      Rétrograder Administrateur
                    </>
                  )}
                </m.button>
              </form>
            </div>
          </div>

          {message && (
            <m.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`mt-6 p-4 rounded-xl border ${
                message.includes("succès")
                  ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                  : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
              }`}
            >
              <div className="flex items-center gap-3">
                {message.includes("succès") ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                )}
                <p
                  className={`text-sm font-medium ${
                    message.includes("succès")
                      ? "text-green-700 dark:text-green-300"
                      : "text-red-700 dark:text-red-300"
                  }`}
                >
                  {message}
                </p>
              </div>
            </m.div>
          )}
        </m.div>

        {/* Gestion des utilisateurs */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-8 shadow-lg"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center">
              <UserX className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Gestion des Utilisateurs
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Bannir ou débannir un utilisateur par ID
              </p>
            </div>
          </div>

          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ID Discord de l'utilisateur
              </label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Entrez l'ID de l'utilisateur"
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-cyan-500 transition-colors"
                required
              />
            </div>

            <div className="flex gap-4">
              <m.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => handleBanAction("ban")}
                disabled={isLoading || !userId.trim()}
                className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-6 py-3 transition-colors flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Bannissement...
                  </>
                ) : (
                  <>
                    <Ban className="w-4 h-4" />
                    Bannir
                  </>
                )}
              </m.button>
              <m.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => handleBanAction("unban")}
                disabled={isLoading || !userId.trim()}
                className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-6 py-3 transition-colors flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Débannissement...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Débannir
                  </>
                )}
              </m.button>
            </div>
          </form>

          {banMessage && (
            <m.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`mt-6 p-4 rounded-xl border ${
                banMessage.includes("banni") || banMessage.includes("débanni")
                  ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                  : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
              }`}
            >
              <div className="flex items-center gap-2">
                {banMessage.includes("banni") ||
                banMessage.includes("débanni") ? (
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 flex-shrink-0" />
                )}
                <p
                  className={`text-sm ${
                    banMessage.includes("banni") ||
                    banMessage.includes("débanni")
                      ? "text-green-700 dark:text-green-300"
                      : "text-red-700 dark:text-red-300"
                  }`}
                >
                  {banMessage}
                </p>
              </div>
            </m.div>
          )}
        </m.div>

        {/* Gestion de l'event améliorée */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 rounded-3xl p-8 shadow-xl"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Calendar className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Gestion des Événements
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Planifier et contrôler les événements PixelWar
              </p>
            </div>
            <div
              className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${
                isActive
                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${isActive ? "bg-green-500" : "bg-gray-400"}`}
              ></div>
              {isActive ? "Actif" : "Inactif"}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Configuration des dates */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Configuration Temporelle
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date de début
                  </label>
                  <input
                    type="datetime-local"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date de fin
                  </label>
                  <input
                    type="datetime-local"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Contrôles et statut */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Contrôles d'Événement
              </h3>

              <m.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={handleEventUpdate}
                className={`w-full px-6 py-4 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-3 shadow-lg ${
                  isActive
                    ? "bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
                    : "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                }`}
              >
                {isActive ? (
                  <>
                    <Pause className="w-5 h-5" />
                    Désactiver l'Événement
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Activer l'Événement
                  </>
                )}
              </m.button>

              {/* Statut détaillé */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-6">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                  Statut Actuel
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      État
                    </span>
                    <span
                      className={`text-sm font-medium ${isActive ? "text-green-600" : "text-red-600"}`}
                    >
                      {isActive ? "En cours" : "Arrêté"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Début
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {startTime
                        ? new Date(startTime).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Non défini"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Fin
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {endTime
                        ? new Date(endTime).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Non défini"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </m.div>

        {/* Configuration de la taille de la grille */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 rounded-3xl p-8 shadow-xl"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Palette className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Configuration de la Grille
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Ajuster la taille de la grille PixelWar (augmentation uniquement)
              </p>
            </div>
            <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
              Configuration
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Configuration des dimensions */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Dimensions de la Grille
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Largeur actuelle:{" "}
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">
                      {currentWidth || 100}px
                    </span>
                  </label>
                  <input
                    type="number"
                    value={newWidth}
                    onChange={(e) => {
                      const inputWidth = parseInt(e.target.value);
                      if (inputWidth >= (currentWidth || 100)) {
                        // Only allow increase from current database value
                        setNewWidth(inputWidth);
                      }
                    }}
                    min={currentWidth || 100}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Nouvelle largeur"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Valeur minimale: {currentWidth || 100}px (augmentation uniquement)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Hauteur actuelle:{" "}
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">
                      {currentHeight || 100}px
                    </span>
                  </label>
                  <input
                    type="number"
                    value={newHeight}
                    onChange={(e) => {
                      const inputHeight = parseInt(e.target.value);
                      if (inputHeight >= (currentHeight || 100)) {
                        // Only allow increase from current database value
                        setNewHeight(inputHeight);
                      }
                    }}
                    min={currentHeight || 100}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Nouvelle hauteur"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Valeur minimale: {currentHeight || 100}px (augmentation uniquement)
                  </p>
                </div>
              </div>
            </div>

            {/* Contrôles et aperçu */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Database className="w-5 h-5" />
                Contrôles de Mise à Jour
              </h3>

              <m.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={handleSizeUpdate}
                disabled={isLoading}
                className={`w-full font-semibold rounded-xl px-6 py-4 transition-all flex items-center justify-center gap-3 shadow-lg ${
                  updateSuccess
                    ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                    : "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white"
                }`}
              >
                {updateSuccess ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Grille mise à jour !
                  </>
                ) : isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Mise à jour en cours...
                  </>
                ) : (
                  <>
                    <Palette className="w-4 h-4" />
                    Mettre à Jour la Grille
                  </>
                )}
              </m.button>

              {/* Aperçu des dimensions */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-6">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                  Aperçu des Dimensions
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Largeur actuelle
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-300">
                      {currentWidth || 100}px
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Nouvelle largeur
                    </span>
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      {newWidth}px
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Hauteur actuelle
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-300">
                      {currentHeight || 100}px
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Nouvelle hauteur
                    </span>
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      {newHeight}px
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Pixels totaux (nouveau)
                    </span>
                    <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                      {newWidth * newHeight}
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">
                      Information Importante
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      L'augmentation de la taille de la grille nécessite un
                      redémarrage du serveur pour prendre effet.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </m.div>

        {/* Nettoyage de la toile - DANGER ZONE */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white dark:bg-gray-800 border-2 border-red-300 dark:border-red-700 rounded-3xl p-8 shadow-lg"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-red-600 dark:text-red-400">
                Zone Dangereuse - Nettoyage de la Toile
              </h2>
              <p className="text-sm text-red-600 dark:text-red-400">
                ⚠️ Cette action est IRRÉVERSIBLE et supprimera TOUS les pixels
              </p>
            </div>
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">
                  Attention : Action Critique
                </h3>
                <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                  <li>• Supprime TOUS les pixels de la toile</li>
                  <li>• Efface TOUT l'historique des actions de pixels</li>
                  <li>• Vide la queue Redis des pixels en attente</li>
                  <li>• Remet la toile à l'état vierge (couleur par défaut)</li>
                  <li>• Cette action ne peut PAS être annulée</li>
                </ul>
              </div>
            </div>
          </div>

          <ClearCanvasButton />
        </m.div>

        {/* Liste des utilisateurs améliorée */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 rounded-3xl p-8 shadow-xl"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Base d'Utilisateurs
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Parcourir et rechercher dans la communauté PixelWar
              </p>
            </div>
            <div className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
              {filteredUsers.length} utilisateur
              {filteredUsers.length !== 1 ? "s" : ""}
            </div>
          </div>

          <div className="space-y-6">
            {/* Barre de recherche améliorée */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <Search className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par ID Discord, email, username ou nom global..."
                className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <m.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={fetchUsers}
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-6 py-3 transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Chargement en cours...
                  </>
                ) : (
                  <>
                    <Database className="w-5 h-5" />
                    Charger les Utilisateurs
                  </>
                )}
              </m.button>
            </div>

            {/* Tableau des utilisateurs */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-lg">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600">
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                        ID Discord
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Email
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Username
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Nom Global
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredUsers.map((user, index) => (
                      <m.tr
                        key={user.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm font-mono text-gray-900 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50">
                          {user.id || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300">
                          {user.email || (
                            <span className="text-gray-400 italic">
                              Non renseigné
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300">
                          {user.username || (
                            <span className="text-gray-400 italic">
                              Non renseigné
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300">
                          {user.global_name || (
                            <span className="text-gray-400 italic">
                              Non renseigné
                            </span>
                          )}
                        </td>
                      </m.tr>
                    ))}
                  </tbody>
                </table>

                {filteredUsers.length === 0 && !isLoading && (
                  <div className="py-12 text-center">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 text-lg">
                      {searchQuery
                        ? "Aucun utilisateur trouvé pour cette recherche"
                        : "Aucun utilisateur chargé"}
                    </p>
                    {!searchQuery && (
                      <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                        Cliquez sur "Charger les Utilisateurs" pour afficher la
                        liste
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </m.div>
      </main>
    </div>
  );
};

export default AdminPage;

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);

  if (!session || session.user.role !== "ADMIN") {
    return {
      redirect: { destination: "/", permanent: false },
    };
  }

  return { props: {} };
};
