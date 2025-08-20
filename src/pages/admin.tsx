import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getSession, useSession } from "next-auth/react";
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import QRCode from "react-qr-code";
import dynamic from "next/dynamic";
import { useEventMode } from "@/context/EventMode"; // Import EventMode context

const Header = dynamic(() => import("../components/Header"), {
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
      setClearMessage("Veuillez taper exactement 'SUPPRIMER TOUT' pour confirmer");
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
        setClearMessage(`✅ Toile nettoyée avec succès ! Opération effectuée par ${data.clearedBy} à ${new Date(data.timestamp).toLocaleString()}`);
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
      <div className="space-y-4">
        <div className="bg-red-100 dark:bg-red-900/30 border-2 border-red-300 dark:border-red-700 rounded-xl p-6">
          <h3 className="text-lg font-bold text-red-700 dark:text-red-300 mb-4">
            🚨 CONFIRMATION FINALE REQUISE
          </h3>
          <p className="text-red-700 dark:text-red-300 mb-4">
            Pour confirmer que vous voulez vraiment supprimer TOUTE la toile et son historique, 
            tapez exactement <strong>"SUPPRIMER TOUT"</strong> (sans les guillemets) dans le champ ci-dessous :
          </p>
          <input
            type="text"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            placeholder="Tapez SUPPRIMER TOUT"
            className="w-full px-4 py-3 rounded-xl border border-red-300 dark:border-red-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-red-400 focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleClearCanvas}
            disabled={isClearing || confirmationText !== "SUPPRIMER TOUT"}
            className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors"
          >
            {isClearing ? "🔄 Nettoyage en cours..." : "🗑️ CONFIRMER LA SUPPRESSION"}
          </button>
          <button
            onClick={cancelClear}
            disabled={isClearing}
            className="px-6 py-3 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white font-semibold rounded-xl transition-colors"
          >
            Annuler
          </button>
        </div>

        {clearMessage && (
          <div className={`p-4 rounded-xl border ${
            clearMessage.includes("✅") 
              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
              : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
          }`}>
            {clearMessage}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowConfirmation(true)}
        className="w-full px-6 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors border-2 border-red-500 shadow-lg"
      >
        🗑️ NETTOYER COMPLÈTEMENT LA TOILE
      </button>

      {clearMessage && (
        <div className={`p-4 rounded-xl border ${
          clearMessage.includes("✅") 
            ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
            : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
        }`}>
          {clearMessage}
        </div>
      )}
    </div>
  );
};

const AdminPage: React.FC = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isActive, startTime, endTime, setEventState } = useEventMode(); // Use EventMode context
  const [otpAuthUrl, setOtpAuthUrl] = useState("");
  const [token, setToken] = useState("");
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

  useEffect(() => {
    if (status === "unauthenticated" || session?.user.role !== "ADMIN") {
      router.push("/");
    } else if (session && !session.user.twoFA) {
      fetch("/api/2fa/setup")
        .then((res) => res.json())
        .then((data) => {
          if (data.otpAuthUrl) {
            setOtpAuthUrl(data.otpAuthUrl);
          } else {
            console.error("Failed to setup 2FA:", data);
          }
        })
        .catch((error) => {
          console.error("Error setting up 2FA:", error);
        });
    }
  }, [status, session, router]);

  const handleVerify = async (e: React.FormEvent) => {
    if (!session?.user.id) return;
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, id: session.user.id }),
      });
      const data = await res.json();

      if (data.success) {
        window.location.reload();
      } else {
        setMessage("Code incorrect ! Vérifiez votre Google Authenticator.");
      }
    } catch (error) {
      console.error("Error verifying 2FA:", error);
      setMessage("Erreur lors de la vérification. Veuillez réessayer.");
    }
    setIsLoading(false);
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admin.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/prisma/adminUpdate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: admin.trim() }),
      });

      const data = await res.json();
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

  const handleEventUpdate = () => {
    const start = newStartTime ? new Date(newStartTime) : null;
    const end = newEndTime ? new Date(newEndTime) : null;
    setEventState(!isActive, start, end);
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
        <div className="glass-panel rounded-3xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="mt-4 text-center text-gray-600 dark:text-gray-400">
            Chargement...
          </p>
        </div>
      </div>
    );
  }

  if (!session.user.twoFA) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-900">
        <Header />

        <main className="flex items-center justify-center min-h-[calc(100vh-80px)] p-6">
          <div className="w-full max-w-md">
            <div className="glass-panel rounded-3xl p-8">
              {/* En-tête */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Authentification 2FA
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Sécurisez votre accès administrateur
                </p>
              </div>

              {/* QR Code */}
              <div className="text-center mb-8">
                <div className="bg-white rounded-2xl p-6 mb-4 inline-block">
                  {otpAuthUrl ? (
                    <QRCode value={otpAuthUrl} size={200} />
                  ) : (
                    <div className="w-[200px] h-[200px] loading-shimmer rounded-xl"></div>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Scannez avec Google Authenticator
                </p>
              </div>

              {/* Formulaire */}
              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={token}
                    onChange={(e) =>
                      setToken(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="Code à 6 chiffres"
                    className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-cyan-500 text-center text-xl font-mono tracking-wider"
                    maxLength={6}
                  />
                </div>

                <button
                  type="submit"
                  disabled={token.length !== 6 || isLoading}
                  className="w-full glass-button py-3 rounded-xl font-semibold text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      Vérification...
                    </div>
                  ) : (
                    "Vérifier et Activer"
                  )}
                </button>
              </form>

              {message && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {message}
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Page admin principale
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-900">
      <Header />

      <main className="max-w-7xl mx-auto p-6 space-y-8">
        {/* En-tête de l'admin */}
        <div className="glass-panel rounded-3xl p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Administration PixelWar
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Tableau de bord administrateur • Gestion et surveillance
              </p>
            </div>
            <Link
              href="/"
              className="glass-button px-6 py-3 rounded-xl font-semibold text-gray-900 dark:text-white inline-flex items-center gap-2 w-fit"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Retour au Jeu
            </Link>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ∞
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Utilisateurs actifs
                </p>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  Live
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Serveur en ligne
                </p>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  10k
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Pixels placés
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Gestion des administrateurs */}
        <div className="glass-panel rounded-3xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Gestion des Administrateurs
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Ajouter un nouvel administrateur par email
              </p>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  Important
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  L'utilisateur doit se connecter au moins une fois pour que son
                  compte soit créé dans la base de données.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleAddAdmin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Adresse email du nouvel administrateur
              </label>
              <input
                type="email"
                value={admin}
                onChange={(e) => setAdmin(e.target.value)}
                placeholder="admin@example.com"
                className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !admin.trim()}
              className="glass-button px-6 py-3 rounded-xl font-semibold text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  Ajout en cours...
                </div>
              ) : (
                "Ajouter Administrateur"
              )}
            </button>
          </form>

          {message && (
            <div
              className={`mt-6 p-4 rounded-xl border ${
                message.includes("succès")
                  ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                  : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
              }`}
            >
              <p
                className={`text-sm ${
                  message.includes("succès")
                    ? "text-green-700 dark:text-green-300"
                    : "text-red-700 dark:text-red-300"
                }`}
              >
                {message}
              </p>
            </div>
          )}
        </div>

        {/* Gestion des utilisateurs */}
        <div className="glass-panel rounded-3xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 5.636a9 9 0 11-12.728 0M15 11v2m-6-2v2m3-2v6"
                />
              </svg>
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
                className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => handleBanAction("ban")}
                disabled={isLoading || !userId.trim()}
                className="glass-button px-6 py-3 rounded-xl font-semibold text-gray-900 dark:text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Bannissement..." : "Bannir"}
              </button>
              <button
                type="button"
                onClick={() => handleBanAction("unban")}
                disabled={isLoading || !userId.trim()}
                className="glass-button px-6 py-3 rounded-xl font-semibold text-gray-900 dark:text-white bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Débannissement..." : "Débannir"}
              </button>
            </div>
          </form>

          {banMessage && (
            <div
              className={`mt-6 p-4 rounded-xl border ${
                banMessage.includes("banni") || banMessage.includes("débanni")
                  ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                  : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
              }`}
            >
              <p
                className={`text-sm ${
                  banMessage.includes("banni") || banMessage.includes("débanni")
                    ? "text-green-700 dark:text-green-300"
                    : "text-red-700 dark:text-red-300"
                }`}
              >
                {banMessage}
              </p>
            </div>
          )}
        </div>

        {/* Gestion de l'event */}
        <div className="glass-panel rounded-3xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Gestion de l'Event
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Modifier les dates et activer/désactiver l'event
              </p>
            </div>
          </div>

          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date de début
              </label>
              <input
                type="datetime-local"
                value={newStartTime}
                onChange={(e) => setNewStartTime(e.target.value)}
                className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-cyan-500"
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
                className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handleEventUpdate}
                className={`glass-button px-6 py-3 rounded-xl font-semibold text-gray-900 dark:text-white ${
                  isActive
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-green-500 hover:bg-green-600"
                }`}
              >
                {isActive ? "Désactiver l'Event" : "Activer l'Event"}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>État actuel :</strong> {isActive ? "Actif" : "Inactif"}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Date de début :</strong>{" "}
              {startTime ? startTime.toString() : "Non définie"}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Date de fin :</strong>{" "}
              {endTime ? endTime.toString() : "Non définie"}
            </p>
          </div>
        </div>

        {/* Nettoyage de la toile - DANGER ZONE */}
        <div className="glass-panel rounded-3xl p-8 border-2 border-red-300 dark:border-red-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
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
              <svg
                className="w-6 h-6 text-red-500 mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
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
        </div>

        {/* Liste des utilisateurs */}
        <div className="glass-panel rounded-3xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Liste des Utilisateurs
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Rechercher et afficher tous les utilisateurs
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Barre de recherche */}
            <div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par ID Discord, email, username ou global_name"
                className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Bouton pour charger les utilisateurs */}
            <button
              onClick={fetchUsers}
              disabled={isLoading}
              className="glass-button px-6 py-3 rounded-xl font-semibold text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  Chargement...
                </div>
              ) : (
                "Charger tous les utilisateurs"
              )}
            </button>

            {/* Liste des utilisateurs */}
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700">
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      ID Discord
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      Username
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      Global Name
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-t border-gray-200 dark:border-gray-700"
                    >
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300">
                        {user.id || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300">
                        {user.email || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300">
                        {user.username || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300">
                        {user.global_name || "N/A"}
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400"
                      >
                        Aucun utilisateur trouvé.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
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
