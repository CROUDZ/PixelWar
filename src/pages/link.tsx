"use client";

import React, { useEffect, useState } from "react";
import { m } from "framer-motion";
import {
  MessageCircle,
  CheckCircle,
  ExternalLink,
  Hash,
  Link as LinkIcon,
} from "lucide-react";
import { subscribeWS, sendWS } from "@/lib/ws";

function makeToken() {
  try {
    return crypto.randomUUID();
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

export default function LinkPage() {
  const [token] = useState(() => makeToken());
  const [linked, setLinked] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let authInterval: number | null = null;

    async function init() {
      try {
        const r = await fetch("/api/me");
        if (!r.ok) throw new Error("Not authenticated");
        const body = await r.json();

        unsub = subscribeWS((data) => {
          if (!data || data.type !== "linked") return;
          if (data.clientToken && data.clientToken === token) {
            setLinked(true);
            return;
          }
          if (data.forDiscordId && data.forDiscordId === body.discordId) {
            setLinked(true);
            return;
          }
          if (body.linked) {
            setLinked(true);
            return;
          }
        });

        // Send auth with both identifiers
        let attempts = 0;
        authInterval = window.setInterval(() => {
          attempts++;
          const payload = {
            type: "auth",
            userId: body.id ?? null,
            discordId: body.discordId ?? null,
            clientToken: token,
          };
          sendWS(payload);
          if (attempts >= 30) {
            if (authInterval) {
              window.clearInterval(authInterval);
              authInterval = null;
            }
          }
        }, 300);
      } catch (e) {
        console.error("[LinkPage] init error:", e);
      }
    }
    init();

    return () => {
      if (unsub) unsub();
      if (authInterval) window.clearInterval(authInterval);
    };
  }, [token]);

  // Close logic + fallback redirect
  useEffect(() => {
    if (!linked) return;
    try {
      if (window.opener && !window.opener.closed) {
        try {
          window.opener.postMessage({ type: "discord-linked", token }, "*");
        } catch {
          /* ignore */
        }
      }
      window.close();
    } catch (e) {
      console.warn("window.close failed:", e);
    }
    setTimeout(() => {
      window.location.href = "/?discord_linked=1";
    }, 350);
  }, [linked, token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-gray-800 flex items-center justify-center p-6">
      {/* Arrière-plan décoratif avec animations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <m.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.1 }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full blur-3xl"
        />
        <m.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.1 }}
          transition={{ duration: 2, delay: 0.5, ease: "easeOut" }}
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full blur-3xl"
        />
      </div>

      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-lg"
      >
        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-3xl p-8 shadow-2xl">
          {/* En-tête */}
          <div className="text-center mb-8">
            <m.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                duration: 0.5,
                delay: 0.2,
                type: "spring",
                stiffness: 200,
              }}
              className="flex items-center justify-center gap-3 mb-4"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  Liaison Discord
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  HUB du Roleplay
                </p>
              </div>
            </m.div>
          </div>

          {linked ? (
            /* État lié */
            <m.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="text-center space-y-6"
            >
              <m.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  duration: 0.5,
                  delay: 0.3,
                  type: "spring",
                  stiffness: 200,
                }}
                className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto"
              >
                <CheckCircle className="w-8 h-8 text-white" />
              </m.div>

              <m.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 }}
              >
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Liaison réussie !
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Votre compte Discord a été lié avec succès.
                  <br />
                  Cette fenêtre va se fermer automatiquement...
                </p>
              </m.div>

              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.7 }}
                className="flex justify-center"
              >
                <div className="flex space-x-1">
                  <m.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                    className="w-2 h-2 bg-green-500 rounded-full"
                  />
                  <m.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                    className="w-2 h-2 bg-green-500 rounded-full"
                  />
                  <m.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                    className="w-2 h-2 bg-green-500 rounded-full"
                  />
                </div>
              </m.div>
            </m.div>
          ) : (
            /* Instructions de liaison */
            <div className="space-y-6">
              {/* Étapes */}
              <div className="space-y-4">
                {/* Étape 1 */}
                <m.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className={`flex gap-4 p-4 rounded-2xl transition-all ${
                    step >= 1
                      ? "bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-800/50"
                      : "bg-gray-50/80 dark:bg-gray-800/50"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      step >= 1
                        ? "bg-blue-500 text-white"
                        : "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      Rejoindre le serveur Discord
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Vous devriez avoir rejoint automatiquement. Sinon,
                      utilisez le lien ci-dessous :
                    </p>
                    <m.a
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      href="https://discord.gg/AcECGMRTkq"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setStep(2)}
                      className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 hover:bg-white/90 dark:hover:bg-gray-800/90 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-900 dark:text-white transition-all duration-300"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Rejoindre le serveur
                    </m.a>
                  </div>
                </m.div>

                {/* Étape 2 */}
                <m.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className={`flex gap-4 p-4 rounded-2xl transition-all ${
                    step >= 2
                      ? "bg-purple-50/80 dark:bg-purple-900/20 border border-purple-200/50 dark:border-purple-800/50"
                      : "bg-gray-50/80 dark:bg-gray-800/50"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      step >= 2
                        ? "bg-purple-500 text-white"
                        : "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      Trouver le salon de liaison
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Rendez-vous dans le salon dédié à la liaison des comptes
                    </p>
                    <div className="bg-purple-100/80 dark:bg-purple-900/30 px-3 py-2 rounded-lg text-sm font-mono text-purple-800 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/50">
                      <Hash className="w-3 h-3 inline mr-1" />
                      liaison-compte
                    </div>
                  </div>
                </m.div>

                {/* Étape 3 */}
                <m.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                  className="flex gap-4 p-4 rounded-2xl bg-gray-50/80 dark:bg-gray-800/50"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      Cliquer sur le bouton de liaison
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Utilisez le bouton pour lier votre compte
                    </p>
                    <div className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium inline-flex items-center gap-1">
                      <LinkIcon className="w-3 h-3" />
                      Lier mon compte
                    </div>
                  </div>
                </m.div>
              </div>

              {/* Status */}
              <m.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
                className="text-center p-4 bg-yellow-50/80 dark:bg-yellow-900/20 border border-yellow-200/50 dark:border-yellow-800/50 rounded-xl"
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <m.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-2 h-2 bg-yellow-500 rounded-full"
                  />
                  <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                    En attente de liaison...
                  </span>
                </div>
                <p className="text-xs text-yellow-700 dark:text-yellow-400">
                  Cette page se fermera automatiquement une fois la liaison
                  effectuée
                </p>
              </m.div>
            </div>
          )}
        </div>
      </m.div>
    </div>
  );
}
