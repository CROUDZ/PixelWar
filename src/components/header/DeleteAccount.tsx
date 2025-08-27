import React, { useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { Trash2, AlertTriangle, Lock, AlertCircle } from "lucide-react";
import { signOut } from "next-auth/react";

interface DeleteAccountProps {
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (show: boolean) => void;
}

const DeleteAccount: React.FC<DeleteAccountProps> = ({
  showDeleteConfirm,
  setShowDeleteConfirm,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0);

  // Suppression compte
  const handleDeleteAccount = async () => {
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
    }
  };

  return (
    <AnimatePresence>
      {showDeleteConfirm && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => {
            setShowDeleteConfirm(false);
            setDeleteStep(0);
          }}
        >
          <m.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 max-w-md w-full shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center space-x-4 mb-6">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <Trash2
                    size={24}
                    className="text-red-600 dark:text-red-400"
                  />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-xl text-gray-900 dark:text-white">
                  Supprimer le compte
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Cette action est irréversible
                </p>
              </div>
            </div>

            {deleteStep === 0 && (
              <m.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-5"
              >
                {/* Warning Section */}
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <AlertTriangle size={12} className="text-white" />
                    </div>
                    <h4 className="font-semibold text-red-800 dark:text-red-200">
                      Attention requise
                    </h4>
                  </div>
                  <ul className="text-sm text-red-700 dark:text-red-300 space-y-2">
                    <li className="flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                      <span>
                        Tous vos pixels seront supprimés définitivement
                      </span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                      <span>
                        Votre compte sera effacé de notre base de données
                      </span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                      <span>Cette action ne peut pas être annulée</span>
                    </li>
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3 pt-2">
                  <m.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteStep(0);
                    }}
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 font-medium"
                  >
                    Annuler
                  </m.button>
                  <m.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setDeleteStep(1)}
                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                  >
                    Continuer
                  </m.button>
                </div>
              </m.div>
            )}

            {deleteStep === 1 && (
              <m.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-5"
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Lock
                      size={32}
                      className="text-orange-600 dark:text-orange-400"
                    />
                  </div>
                  <h4 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">
                    Confirmation requise
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    Tapez{" "}
                    <strong className="text-orange-600 dark:text-orange-400">
                      "SUPPRIMER"
                    </strong>{" "}
                    pour confirmer :
                  </p>
                </div>

                <input
                  type="text"
                  onChange={(e) => {
                    if (e.target.value === "SUPPRIMER") setDeleteStep(2);
                  }}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
                  placeholder="Tapez SUPPRIMER"
                />

                <m.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setDeleteStep(0)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 font-medium"
                >
                  Retour
                </m.button>
              </m.div>
            )}

            {deleteStep === 2 && (
              <m.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-5"
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <AlertCircle size={32} className="text-white" />
                  </div>
                  <h4 className="font-bold text-xl text-red-600 dark:text-red-400 mb-2">
                    Dernière confirmation
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Êtes-vous absolument certain(e) de vouloir supprimer votre
                    compte ?
                  </p>
                </div>

                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <p className="text-sm text-red-700 dark:text-red-300 text-center">
                    Cette action supprimera définitivement toutes vos données et
                    ne peut pas être annulée.
                  </p>
                </div>

                <div className="flex space-x-3">
                  <m.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setDeleteStep(1)}
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 font-medium"
                  >
                    Retour
                  </m.button>
                  <m.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={async () => {
                      setIsDeleting(true);
                      await handleDeleteAccount();
                      setIsDeleting(false);
                    }}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-xl disabled:opacity-50 transition-all duration-200 font-medium shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
                  >
                    {isDeleting ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Suppression...</span>
                      </div>
                    ) : (
                      "Supprimer définitivement"
                    )}
                  </m.button>
                </div>
              </m.div>
            )}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
};

export default DeleteAccount;
