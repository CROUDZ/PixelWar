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
              initial={{ opacity: 0, scale: 0.97, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -6 }}
              transition={{ duration: 0.15 }}
              className="absolute m-5 w-72 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 
                rounded-lg shadow-xl overflow-hidden right-48 top-12"
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
                        <span className="font-medium">Liaison Discord</span>
                      </div>
                      <div className="flex items-center space-x-1 text-sm text-green-600">
                        <CheckCircle size={16} />
                        <span className="font-medium">Liée</span>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() =>
                        openInPopup(`${DOMAIN}/auth/discord-redirect`)
                      }
                      className="w-full flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition"
                    >
                      <div className="flex items-center space-x-2">
                        <Link2 size={16} className="text-orange-500" />
                        <span className="font-medium">Liaison Discord</span>
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
                      <span className="font-medium">Serveur Boosté</span>
                    </div>
                    <div className="flex items-center space-x-1 text-sm">
                      {session.user?.boosted ? (
                        <CheckCircle size={16} className="text-purple-600" />
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
                    {isSyncing ? "Synchronisation..." : "Synchroniser Discord"}
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
            </m.div>
          )}
        </AnimatePresence>
      )}
    </>
  );
};

export default UserMenu;
