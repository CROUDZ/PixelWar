import React, { useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { Trash2 } from "lucide-react";
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
  console.log(showDeleteConfirm);

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
                <Trash2 size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Supprimer le compte</h3>
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
                    <li>• Tous vos pixels seront supprimés</li>
                    <li>• Votre compte sera définitivement effacé</li>
                    <li>• Cette action ne peut pas être annulée</li>
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
                  Tapez <strong>"SUPPRIMER"</strong> pour confirmer :
                </p>
                <input
                  type="text"
                  onChange={(e) => {
                    if (e.target.value === "SUPPRIMER") setDeleteStep(2);
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
                <p className="text-sm">Êtes-vous absolument certain(e) ?</p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setDeleteStep(1)}
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    Retour
                  </button>
                  <button
                    onClick={async () => {
                      setIsDeleting(true);
                      await handleDeleteAccount();
                      setIsDeleting(false);
                    }}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50"
                  >
                    {isDeleting ? "Suppression..." : "Supprimer définitivement"}
                  </button>
                </div>
              </div>
            )}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
};

export default DeleteAccount;
