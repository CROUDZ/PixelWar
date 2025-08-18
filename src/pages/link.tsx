"use client";

import { useEffect, useState } from "react";
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-900 flex items-center justify-center p-6">
      {/* Arrière-plan décoratif */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-500/20 rounded-full blur-3xl animate-float"></div>
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "3s" }}
        ></div>
      </div>

      <div className="relative z-10 w-full max-w-lg">
        <div className="glass-panel rounded-3xl p-8">
          {/* En-tête */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0002 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9554 2.4189-2.1568 2.4189Z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Liaison Discord
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  HUB du Roleplay
                </p>
              </div>
            </div>
          </div>

          {linked ? (
            /* État lié */
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto animate-glow">
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Liaison réussie !
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Votre compte Discord a été lié avec succès.
                  <br />
                  Cette fenêtre va se fermer automatiquement...
                </p>
              </div>

              <div className="flex justify-center">
                <div className="flex space-x-1">
                  <div
                    className="w-2 h-2 bg-green-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-green-500 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-green-500 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  ></div>
                </div>
              </div>
            </div>
          ) : (
            /* Instructions de liaison */
            <div className="space-y-6">
              {/* Étapes */}
              <div className="space-y-4">
                {/* Étape 1 */}
                <div
                  className={`flex gap-4 p-4 rounded-2xl transition-all ${step >= 1 ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800" : "bg-gray-50 dark:bg-gray-800/50"}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${step >= 1 ? "bg-blue-500 text-white" : "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400"}`}
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
                    <a
                      href="https://discord.gg/AcECGMRTkq"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="glass-button inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-900 dark:text-white"
                      onClick={() => setStep(2)}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0002 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9554 2.4189-2.1568 2.4189Z" />
                      </svg>
                      Rejoindre le serveur
                    </a>
                  </div>
                </div>

                {/* Étape 2 */}
                <div
                  className={`flex gap-4 p-4 rounded-2xl transition-all ${step >= 2 ? "bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800" : "bg-gray-50 dark:bg-gray-800/50"}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${step >= 2 ? "bg-purple-500 text-white" : "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400"}`}
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
                    <div className="bg-purple-100 dark:bg-purple-900/30 px-3 py-2 rounded-lg text-sm font-mono text-purple-800 dark:text-purple-300">
                      #liaison-compte
                    </div>
                  </div>
                </div>

                {/* Étape 3 */}
                <div className="flex gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
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
                    <div className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium inline-block">
                      🔗 Lier mon compte
                    </div>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                    En attente de liaison...
                  </span>
                </div>
                <p className="text-xs text-yellow-700 dark:text-yellow-400">
                  Cette page se fermera automatiquement une fois la liaison
                  effectuée
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
