// app/link/page.tsx  ou pages/link.tsx (selon ton projet). "use client" must be present.
"use client";

import { useEffect, useState } from "react";
import { subscribeWS, sendWS } from "@/lib/ws";

function makeToken() {
  try { return crypto.randomUUID(); } catch { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
}


export default function LinkPage() {
  const [token] = useState(() => makeToken());
  const [linked, setLinked] = useState(false);

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
          const payload = { type: "auth", userId: body.id ?? null, discordId: body.discordId ?? null, clientToken: token };
          sendWS(payload);
          if (attempts >= 30) {
            if (authInterval) { window.clearInterval(authInterval); authInterval = null; }
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
        try { window.opener.postMessage({ type: "discord-linked", token }, "*"); } catch { /* ignore */ }
      }
      window.close();
    } catch (e) {
      console.warn("window.close failed:", e);
    }
    setTimeout(() => { window.location.href = "/?discord_linked=1"; }, 350);
  }, [linked, token]);

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-100 to-purple-200">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full flex flex-col items-center space-y-5 border border-blue-300">
        <div className="flex items-center space-x-2 mb-2">
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="12" fill="#5865F2"/>
            <path d="M17 8.5V15.5C17 16.3284 16.3284 17 15.5 17H8.5C7.67157 17 7 16.3284 7 15.5V8.5C7 7.67157 7.67157 7 8.5 7H15.5C16.3284 7 17 7.67157 17 8.5Z" fill="white"/>
          </svg>
          <h1 className="text-2xl font-bold text-blue-700">Discord HUB du Rolplay</h1>
        </div>

        {linked ? (
          <p className="text-gray-700">En attente de liaison...</p>
        ) : linked ? (
          <p className="text-green-600 font-semibold">Compte lié — fermeture en cours…</p>
        ) : (
          <>
            <p className="text-gray-700 text-center">
              Veuillez aller dans le serveur Discord HUB du Rolplay
            </p>
            <p className="text-gray-600 text-center">
              Normalement vous avez rejoint automatiquement le serveur Discord.<br />
              Si ce n'est pas le cas, voici un lien d'invitation :
            </p>
            <a
              href="https://discord.gg/AcECGMRTkq"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span role="img" aria-label="discord">🔗</span> Rejoindre le serveur
            </a>
            <div className="w-full border-t border-gray-200 my-2"></div>
            <p className="text-gray-700 text-center">
              Ensuite, veuillez vous rendre dans le salon :
            </p>
            <a href="#nom-du-salon" className="font-bold text-purple-700 underline">Nom du salon</a>
            <p className="text-gray-700 text-center">
              Et cliquez sur le bouton <span className="bg-blue-100 px-2 py-1 rounded text-blue-700 font-semibold">Lier mon compte</span>
            </p>
            <p className="text-gray-500 text-sm text-center">
              Cette page se fermera automatiquement une fois que vous aurez lié votre compte.
            </p>
          </>
        )}
    </div>
      </div>
  );
}
