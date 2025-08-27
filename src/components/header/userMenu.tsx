import React, { useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import {
  User,
  CheckCircle,
  X,
  Zap,
  AlertCircle,
  Link2,
  RefreshCw,
  LogOut,
  Trash2,
} from "lucide-react";
import { openInPopup } from "@/lib/utils";

const ENV = process.env.NODE_ENV || "development";
const DOMAIN =
  ENV === "production"
    ? "https://pixelwar-hubdurp.fr"
    : "http://localhost:3000";

interface UserMenuProps {
  isOpen: boolean;
  setShowDeleteConfirm: (show: boolean) => void;
}

const UserMenu: React.FC<UserMenuProps> = ({
  isOpen,
  setShowDeleteConfirm,
}) => {
  const { data: session } = useSession();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

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

  if (!session) return null;

  return (
    <>
      {isOpen && (
        <AnimatePresence>
          {isOpen && (
            <m.div
              id="user-menu"
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="absolute right-0 top-full mt-2 w-80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/30 rounded-2xl shadow-lg overflow-hidden"
              style={{ zIndex: 9999999 }}
              role="menu"
            >
              {/* Header Section */}
              <div className="p-5 border-b border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="relative group">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                      {session.user?.image ? (
                        <Image
                          src={session.user.image}
                          alt="Avatar"
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User size={24} className="text-white" />
                      )}
                    </div>
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-400/20 to-cyan-600/20 blur-sm -z-10 group-hover:blur-md transition-all duration-300"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-base text-gray-900 dark:text-white truncate">
                      {session.user?.name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                      {session.user?.email}
                    </p>
                  </div>
                </div>

                {/* Status Cards */}
                <div className="space-y-3">
                  {/* Discord Link Status */}
                  {session.user?.linked ? (
                    <m.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                      className="flex items-center justify-between p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200/50 dark:border-green-800/30"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                          <Link2
                            size={16}
                            className="text-green-600 dark:text-green-400"
                          />
                        </div>
                        <span className="font-medium text-sm text-green-800 dark:text-green-200">
                          Discord Lié
                        </span>
                      </div>
                      <CheckCircle
                        size={18}
                        className="text-green-600 dark:text-green-400"
                      />
                    </m.div>
                  ) : (
                    <m.button
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                      onClick={() =>
                        openInPopup(`${DOMAIN}/auth/discord-redirect`)
                      }
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200/50 dark:border-orange-800/30 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-all duration-200 group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                          <Link2
                            size={16}
                            className="text-orange-600 dark:text-orange-400"
                          />
                        </div>
                        <span className="font-medium text-sm text-orange-800 dark:text-orange-200">
                          Lier Discord
                        </span>
                      </div>
                      <AlertCircle
                        size={18}
                        className="text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform duration-200"
                      />
                    </m.button>
                  )}

                  {/* Server Boost Status */}
                  <m.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className={`flex items-center justify-between p-3 rounded-xl border ${
                      session.user?.boosted
                        ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200/50 dark:border-purple-800/30"
                        : "bg-gray-50 dark:bg-gray-800 border-gray-200/50 dark:border-gray-700/50"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          session.user?.boosted
                            ? "bg-purple-100 dark:bg-purple-900/40"
                            : "bg-gray-100 dark:bg-gray-700"
                        }`}
                      >
                        <Zap
                          size={16}
                          className={
                            session.user?.boosted
                              ? "text-purple-600 dark:text-purple-400"
                              : "text-muted"
                          }
                        />
                      </div>
                      <span
                        className={`font-medium text-sm ${
                          session.user?.boosted
                            ? "text-purple-800 dark:text-purple-200"
                            : "text-gray-600 dark:text-gray-300"
                        }`}
                      >
                        Serveur Boosté
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {session.user?.boosted ? (
                        <>
                          <CheckCircle
                            size={18}
                            className="text-purple-600 dark:text-purple-400"
                          />
                          <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
                            Actif
                          </span>
                        </>
                      ) : (
                        <>
                          <X size={18} className="text-muted" />
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                            Inactif
                          </span>
                        </>
                      )}
                    </div>
                  </m.div>
                </div>
              </div>

              {/* Actions Section */}
              <div className="p-3 space-y-2">
                <m.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-left text-sm font-medium text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 rounded-xl transition-all duration-200 disabled:opacity-50 group"
                >
                  <RefreshCw
                    size={18}
                    className={`transition-transform duration-200 ${isSyncing ? "animate-spin" : "group-hover:rotate-12"}`}
                  />
                  <span>
                    {isSyncing ? "Synchronisation..." : "Synchroniser Discord"}
                  </span>
                </m.button>

                {syncMessage && (
                  <m.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="px-4 py-3 text-xs text-center rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200/50 dark:border-gray-700/50 text-gray-600 dark:text-gray-300"
                  >
                    {syncMessage}
                  </m.div>
                )}

                <div className="border-t border-gray-200/50 dark:border-gray-700/50 pt-2 space-y-1">
                  <m.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    onClick={() => signOut()}
                    className="w-full flex items-center space-x-3 px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all duration-200 group"
                  >
                    <LogOut
                      size={18}
                      className="group-hover:translate-x-0.5 transition-transform duration-200"
                    />
                    <span>Déconnexion</span>
                  </m.button>

                  <m.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full flex items-center space-x-3 px-4 py-3 text-left text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200 group"
                  >
                    <Trash2
                      size={18}
                      className="group-hover:scale-110 transition-transform duration-200"
                    />
                    <span>Supprimer le compte</span>
                  </m.button>
                </div>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      )}
    </>
  );
};

export default UserMenu;
