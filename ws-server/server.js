// server.js (ESM)
// Assure-toi d'avoir installé: ws, redis (v4), ioredis, @prisma/client
import { config } from "dotenv";
import { WebSocketServer } from "ws";
import redis from "redis";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import IORedis from "ioredis";
import { PixelCanvas } from "./pixel-canvas.js";
import { loadFromRedis, saveToRedis } from "./persistence-redis.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, "../.env") });

// --- Configurations ---
const PORT = Number(process.env.WS_PORT || 8080);
const GRID_KEY = process.env.GRID_KEY || "pixel-grid"; // clé JSON héritée
const QUEUE_KEY = process.env.QUEUE_KEY || "pixel-queue";
const PALETTE_KEY = process.env.PALETTE_KEY || `${GRID_KEY}:palette`;
const DEFAULT_COLOR = process.env.DEFAULT_COLOR || "#FFFFFF";

const FLUSH_INTERVAL_MS = Number(process.env.FLUSH_INTERVAL_MS || 100);
const BATCH_MAX = Number(process.env.BATCH_MAX || 1000);
const GRID_SAVE_DEBOUNCE_MS = Number(process.env.GRID_SAVE_DEBOUNCE_MS || 1000);

// --- NOTE: On ne lit plus NEXT_PUBLIC_WIDTH / NEXT_PUBLIC_HEIGHT depuis le .env ---
// On initialise des defaults puis on écrase avec la valeur stockée en base via Prisma
let WIDTH = 100;
let HEIGHT = 100;

// --- Clients Redis ---
const redisUrl = process.env.REDIS_URL || undefined;
const client = redis.createClient(redisUrl ? { url: redisUrl } : {});
client.on("error", (e) => console.error(`Erreur client Redis : ${e.message}`));

const sub = new IORedis(redisUrl);
sub.on("error", (e) => console.error(`Erreur ioredis (sub) : ${e.message}`));

// s'abonner aux canaux déjà utilisés dans votre code
sub.subscribe("logout", (err, count) => {
  if (err)
    console.error(`Erreur d'abonnement au canal logout : ${err.message}`);
  else console.log(`Abonné au canal logout (${count} abonnés).`);
});
sub.subscribe("link", (err, count) => {
  if (err) console.error(`Erreur d'abonnement au canal link : ${err.message}`);
  else console.log(`Abonné au canal link (${count} abonnés).`);
});
sub.subscribe("canvas-clear", (err, count) => {
  if (err)
    console.error(`Erreur d'abonnement au canal canvas-clear : ${err.message}`);
  else console.log(`Abonné au canal canvas-clear (${count} abonnés).`);
});

sub.on("message", (channel, message) => {
  console.log(`Message reçu sur le canal ${channel} : ${message}`);
  if (!canvas || !palette) {
    console.warn(
      "Message Redis reçu mais canvas/palette pas encore initialisés — ignoring for now",
    );
    return;
  }
  // --- laissez vos gestionnaires existants inchangés (copié depuis votre code) ---
  if (channel === "logout") {
    try {
      const { userId } = JSON.parse(message);
      console.log(`L'utilisateur avec l'ID ${userId} s'est déconnecté.`);
      // Enregistrer dans la console
      console.log("[server.js] événement de déconnexion pour userId:", userId);

      const set = userSockets.get(String(userId));
      if (set && set.size > 0) {
        for (const s of Array.from(set)) {
          try {
            if (s.readyState === s.OPEN || s.readyState === 1) {
              s.send(JSON.stringify({ type: "logout" }));
            } else {
              set.delete(s);
            }
          } catch (e) {
            console.error(
              "[server.js] échec de l'envoi de déconnexion au socket:",
              e,
            );
          }
        }
        if (set.size === 0) userSockets.delete(String(userId));
      } else {
        console.log("[server.js] aucun ws trouvé pour l'utilisateur", userId);
      }
    } catch (e) {
      console.error("Charge utile de déconnexion invalide:", e);
    }
  }

  if (channel === "link") {
    (async () => {
      try {
        const payload = JSON.parse(message);
        const discordId = String(payload.userId);
        const boosted = Boolean(payload.boosted);

        console.log(`L'utilisateur avec l'ID Discord ${discordId} a été lié.`);
        console.log(
          "[server.js] événement de liaison pour discordId:",
          discordId,
          "charge utile:",
          payload,
        );

        let account = null;
        try {
          account = await prisma.account.findFirst({
            where: { provider: "discord", providerAccountId: discordId },
            select: { id: true, userId: true, providerAccountId: true },
          });
          console.log(
            "[server.js] prisma: résultat de recherche de compte:",
            account,
          );
        } catch (e) {
          console.error(
            "[server.js] erreur prisma lors de la recherche de compte:",
            e,
          );
        }

        if (!account) {
          console.warn(
            `[server.js] Aucun Account trouvé pour discordId=${discordId}.`,
          );
        } else {
          try {
            const updated = await prisma.user.update({
              where: { id: account.userId },
              data: { linked: true, boosted },
            });
            console.log(
              `[server.js] prisma: utilisateur ${account.userId} mis à jour linked=true`,
              {
                updatedId: updated.id,
                linked: updated.linked,
                boosted: updated.boosted,
              },
            );
          } catch (e) {
            console.error(
              "[server.js] erreur de mise à jour prisma pour la liaison:",
              e,
            );
          }
        }

        const notifiedSocketIds = new Set();
        function notifySet(set) {
          if (!set) return;
          for (const s of Array.from(set)) {
            if (s && s.readyState === s.OPEN && !notifiedSocketIds.has(s._id)) {
              try {
                const payloadToSend = {
                  type: "linked",
                  ts: Date.now(),
                  clientToken: s.clientToken ?? null,
                  forDiscordId: discordId,
                };
                s.send(JSON.stringify(payloadToSend));
                notifiedSocketIds.add(s._id);
              } catch (e) {
                console.error(
                  "[server.js] échec de l'envoi de liaison au socket:",
                  e,
                );
              }
            }
          }
        }

        const setByDiscord = userSockets.get(discordId);
        if (setByDiscord && setByDiscord.size > 0) {
          notifySet(setByDiscord);
        }

        if (account && account.userId) {
          const setByUser = userSockets.get(String(account.userId));
          if (setByUser && setByUser.size > 0) {
            notifySet(setByUser);
          }
        }
      } catch (e) {
        console.error(
          "[server.js] charge utile de liaison invalide ou erreur:",
          e,
        );
      }
    })();
    return;
  }

  if (channel === "canvas-clear") {
    (async () => {
      try {
        const payload = JSON.parse(message);
        console.log("[server.js] événement canvas-clear:", payload);

        // Réinitialiser le compteur total de pixels
        totalPixels = 0;

        // *** IMPORTANT: Réinitialiser le canvas interne du serveur à l'état vide ***
        const emptySnap = new Uint8Array(payload.width * payload.height); // Tous les pixels = 0 (ID de couleur par défaut)
        canvas.restore(emptySnap);

        // Réinitialiser la palette pour s'assurer que la couleur par défaut est l'ID 0
        palette.colorToId.clear();
        palette.idToColor = [];
        palette._registerColor(payload.defaultColor);

        console.log(
          `[server.js] Canvas interne réinitialisé à l'état vide (${payload.width}x${payload.height})`,
        );

        // Créer une grille vide avec la couleur par défaut pour la compatibilité client
        const emptyGrid =
          payload.grid ||
          new Array(payload.width * payload.height).fill(payload.defaultColor);

        // Diffuser l'effacement du canvas à tous les clients connectés
        const clearMessage = {
          type: "canvasClear",
          timestamp: payload.timestamp,
          width: payload.width,
          height: payload.height,
          grid: emptyGrid,
          totalPixels: 0,
          clearedBy: payload.adminId,
        };

        // Envoyer à tous les websockets connectés
        if (wss && wss.clients) {
          for (const client of wss.clients) {
            if (client.readyState === 1) {
              // WebSocket.OPEN
              try {
                client.send(JSON.stringify(clearMessage));
              } catch (e) {
                console.warn(
                  "[server.js] Échec de l'envoi de l'effacement du canvas au client:",
                  e,
                );
              }
            }
          }
          console.log(
            `[server.js] Effacement du canvas diffusé à ${wss.clients.size} clients`,
          );
        } else {
          console.warn(
            "[server.js] Serveur WebSocket pas prêt, impossible de diffuser l'effacement du canvas",
          );
        }

        // Sauvegarder immédiatement l'état vide dans Redis pour assurer la persistance
        try {
          await saveToRedis(canvas);
          console.log(
            "[server.js] État de canvas vide sauvegardé dans la persistance Redis",
          );
        } catch (e) {
          console.error(
            "[server.js] Échec de la sauvegarde du canvas vide dans Redis:",
            e,
          );
        }
      } catch (e) {
        console.error(
          "[server.js] charge utile canvas-clear invalide ou erreur:",
          e,
        );
      }
    })();
    return;
  }
});

// --- Prisma ---
const prisma = new PrismaClient();

// --- Carte des sockets utilisateur (identique à votre code) ---
const userSockets = new Map();

// --- Référence globale du serveur WebSocket ---
let wss = null;

// --- Variables globales pour canvas et palette ---
let canvas = null;
let palette = null;

// assistants ajouter/supprimer des sockets utilisateur (copiés)
function addUserSocket(userId, ws) {
  let set = userSockets.get(userId);
  if (!set) {
    set = new Set();
    userSockets.set(userId, set);
  }
  set.add(ws);
  ws.userId = userId;
  console.log(
    `[server.js] addUserSocket: ${userId} -> maintenant ${set.size} socket(s)`,
  );
}
function removeUserSocket(ws) {
  const userId = ws.userId;
  if (!userId) return;
  const set = userSockets.get(userId);
  if (!set) return;
  set.delete(ws);
  console.log(
    `[server.js] removeUserSocket: ${userId} -> restant ${set.size} socket(s)`,
  );
  if (set.size === 0) {
    userSockets.delete(userId);
    console.log(`[server.js] mappage utilisateur supprimé pour ${userId}`);
  }
}

// --- métriques et initialisation ---
let totalPixels = 0;
async function initCounter() {
  console.log("Initialisation du compteur de pixels...");
  totalPixels = await prisma.pixelAction.count();
  console.log(
    `Le compteur de pixels a été initialisé avec ${totalPixels} pixels.`,
  );
  console.log("Total pixels:", totalPixels);
}
initCounter();

// ----------------------------
// Gestionnaire de palette (dynamique)
// ----------------------------
// map couleur string <-> id (0..255). id 0 réservé pour DEFAULT_COLOR
class PaletteManager {
  constructor(defaultColor = "#FFFFFF") {
    this.colorToId = new Map();
    this.idToColor = [];
    this.defaultColor = defaultColor;
    // initialiser id 0 comme défaut
    this._registerColor(defaultColor);
  }

  _registerColor(hex) {
    hex = String(hex).toUpperCase();
    if (this.colorToId.has(hex)) return this.colorToId.get(hex);
    const id = this.idToColor.length;
    if (id >= 256) {
      // palette pleine -> retour à la valeur par défaut
      return 0;
    }
    this.idToColor.push(hex);
    this.colorToId.set(hex, id);
    return id;
  }

  getId(hex) {
    if (!hex) return 0;
    hex = String(hex).toUpperCase();
    if (this.colorToId.has(hex)) return this.colorToId.get(hex);
    return this._registerColor(hex);
  }

  getColor(id) {
    return this.idToColor[id] ?? this.defaultColor;
  }

  arrayStringsToSnapshot(arr, width, height) {
    const snap = new Uint8Array(width * height);
    for (let i = 0; i < snap.length; i++) {
      const s = arr[i] ?? this.defaultColor;
      snap[i] = this.getId(s);
    }
    return snap;
  }

  snapshotToArrayStrings(snapshot) {
    const out = new Array(snapshot.length);
    for (let i = 0; i < snapshot.length; i++) {
      out[i] = this.getColor(snapshot[i]);
    }
    return out;
  }

  // --- Nouveaux helpers pour persistence ---
  toArray() {
    // retourne la table id->color (index = id)
    return Array.from(this.idToColor);
  }

  restoreFromArray(arr) {
    if (!Array.isArray(arr)) return;
    this.idToColor = arr.map((v) => String(v).toUpperCase());
    this.colorToId = new Map();
    for (let i = 0; i < this.idToColor.length; i++) {
      this.colorToId.set(this.idToColor[i], i);
    }
    // s'assurer que id 0 est bien defaultColor
    if (this.idToColor[0] !== String(this.defaultColor).toUpperCase()) {
      // forcer l'entrée 0 à default (sécurité)
      this.idToColor[0] = String(this.defaultColor).toUpperCase();
      this.colorToId.set(this.idToColor[0], 0);
    }
  }
}

(async () => {
  await client.connect();
  console.log("Connexion à Redis réussie (client)");

  // --- Récupérer la taille de la grille depuis la DB via Prisma (eventMode where name="eventMode") ---
  try {
    // utilise findFirst au cas où `name` ne serait pas unique ; adapte si besoin à findUnique
    const cfg = await prisma.eventMode.findFirst({
      where: { name: "eventMode" },
      select: { width: true, height: true },
    });

    if (cfg) {
      const w = Number(cfg.width);
      const h = Number(cfg.height);
      if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
        WIDTH = Math.trunc(w);
        HEIGHT = Math.trunc(h);
        console.log(`[server.js] Dimensions récupérées depuis la BD: ${WIDTH}x${HEIGHT}`);
      } else {
        console.warn("[server.js] Dimensions en BD invalides, utilisation des valeurs par défaut:", WIDTH, "x", HEIGHT);
      }
    } else {
      console.warn("[server.js] Aucun enregistrement eventMode trouvé (name='eventMode') — utilisation des valeurs par défaut:", WIDTH, "x", HEIGHT);
    }
  } catch (e) {
    console.error("[server.js] Erreur lors de la récupération des dimensions depuis Prisma:", e);
    console.warn("Utilisation des valeurs par défaut:", WIDTH, "x", HEIGHT);
  }

  // --- Charger l'instantané du canvas (essayer d'abord le binaire via loadFromRedis) ---
  // NOTE: Si un snapshot binaire exact existe dans Redis, on le charge. Sinon, on reconstruit
  // la grille à partir de la table PixelAction (prisma) de manière paginée/optimisée.
  palette = new PaletteManager(DEFAULT_COLOR);

  // tenter de restaurer la palette depuis Redis si possible
  const paletteRaw = await client.get(PALETTE_KEY).catch(() => null);
  if (paletteRaw) {
    try {
      const parsedPalette = JSON.parse(paletteRaw);
      if (Array.isArray(parsedPalette)) {
        palette.restoreFromArray(parsedPalette);
        console.log("Palette restaurée depuis Redis.");
      }
    } catch (e) {
      console.warn("PALETTE_KEY corrompu -> ignored:", e.message);
    }
  }

  // créer un canvas vide par défaut (sera remplacé si on trouve un snapshot binaire exact)
  canvas = new PixelCanvas(WIDTH, HEIGHT, new Uint8Array(WIDTH * HEIGHT));

  // 1) Essayer le snapshot binaire Redis (meilleur perf si présent et bonne taille)
  const snap = await loadFromRedis(WIDTH, HEIGHT).catch(() => undefined);
  if (snap && snap instanceof Uint8Array && snap.length === WIDTH * HEIGHT) {
    try {
      canvas = new PixelCanvas(WIDTH, HEIGHT, snap);
      console.log("Instantané binaire cohérent chargé depuis la persistance.");
    } catch (e) {
      console.warn("Échec de l'utilisation du snapshot binaire -> on reconstruira depuis la DB:", e.message);
    }
  } else {
    // 2) Sinon: reconstruire depuis la table PixelAction (prend en charge les agrandissements)
    console.log("Aucun snapshot binaire exact trouvé — reconstruction depuis PixelAction (BD)...");

    // Pagination efficace pour éviter d'aspirer tout en mémoire
    const BATCH = 10000; // ajustable selon mémoire / perf
    let lastId = null;
    while (true) {
      const where = lastId ? { id: { gt: lastId } } : {};
      const rows = await prisma.pixelAction.findMany({
        where,
        select: { id: true, x: true, y: true, color: true },
        orderBy: { id: 'asc' },
        take: BATCH,
      });

      if (!rows || rows.length === 0) break;

      for (const r of rows) {
        // si le pixel est en dehors de la nouvelle taille (rare si agrandissement seulement), on l'ignore
        if (r.x == null || r.y == null) continue;
        if (r.x < 0 || r.y < 0) continue;
        if (r.x >= WIDTH || r.y >= HEIGHT) continue;

        const col = String(r.color ?? DEFAULT_COLOR).toUpperCase();
        const colorId = palette.getId(col);
        try {
          canvas.setPixel(r.x, r.y, colorId);
        } catch (e) {
          // setPixel doit gérer les coordonnées, mais on protège
          console.warn("Impossible d'appliquer pixel depuis la BD:", r, e.message);
        }
      }

      lastId = rows[rows.length - 1].id;
      if (rows.length < BATCH) break; // fin
    }

    console.log("Reconstruction depuis PixelAction terminée.");

    // Sauvegarder le résultat dans Redis pour accélérer les prochains démarrages
    try {
      await saveToRedis(canvas);
      const arr = palette.snapshotToArrayStrings(canvas.snapshot());
      const paletteArr = palette.toArray();
      const multi = client.multi();
      multi.set(GRID_KEY, JSON.stringify(arr));
      multi.set(PALETTE_KEY, JSON.stringify(paletteArr));
      await multi.exec();
      console.log("Grille reconstruite sauvegardée dans Redis (binaire + JSON GRID_KEY/PALETTE_KEY).");
    } catch (e) {
      console.warn("Impossible de sauvegarder la grille reconstruite dans Redis:", e.message);
    }
  }

  console.log(`Canvas dimensions final : ${WIDTH}x${HEIGHT}`);

  // --- utilitaire: convertir x,y en index (identique à PixelCanvas.index mais privé ici si nécessaire) --- (identique à PixelCanvas.index mais privé ici si nécessaire) ---
  /*function idxOf(x, y) {
    return y * WIDTH + x;
  }*/

  // --- Sauvegarde avec anti-rebond: sauvegarder l'instantané binaire + optionnellement mettre à jour le JSON GRID_KEY hérité (compat) ---
  let saveScheduled = false;
  function scheduleSaveGrid() {
    if (saveScheduled) return;
    saveScheduled = true;
    setTimeout(async () => {
      try {
        // sauvegarder l'instantané binaire (recommandé)
        await saveToRedis(canvas).catch((e) => {
          console.error("saveToRedis a échoué:", e);
        });

        // Mettre à jour aussi le GRID_KEY hérité en tant que JSON de chaînes de couleur (pour la compatibilité)
        try {
          const arr = palette.snapshotToArrayStrings(canvas.snapshot());
          const paletteArr = palette.toArray();

          // Sauvegarde atomique avec transaction Redis
          const multi = client.multi();
          multi.set(GRID_KEY, JSON.stringify(arr));
          multi.set(PALETTE_KEY, JSON.stringify(paletteArr));
          await multi.exec();

          console.log(
            "JSON GRID_KEY et PALETTE_KEY mis à jour de manière atomique.",
          );
        } catch (e) {
          console.error(
            "Erreur lors de l'écriture atomique du JSON GRID_KEY/PALETTE_KEY:",
            e,
          );
        }
      } catch (e) {
        console.error("Échec de la sauvegarde automatique Redis:", e);
      } finally {
        saveScheduled = false;
      }
    }, GRID_SAVE_DEBOUNCE_MS);
  }

  // --- Serveur WebSocket ---
  wss = new WebSocketServer({ port: PORT }, () => {
    console.log(`Serveur WebSocket démarré sur ws://0.0.0.0:${PORT}`);
  });

  // --- Assistant de poussée de file (même logique) ---
  async function pushToQueue(item) {
    try {
      await client.rPush(QUEUE_KEY, JSON.stringify(item));
    } catch (e) {
      console.error(
        "Échec de la poussée vers la file Redis, retour à la mémoire (risqué):",
        e,
      );
    }
  }

  // --- Vidange du consommateur (identique à votre code) ---
  let flushing = false;
  async function flushRedisQueue() {
    if (flushing) return;
    flushing = true;
    let items = [];
    try {
      items = await client.lRange(QUEUE_KEY, 0, BATCH_MAX - 1);
      if (!items || items.length === 0) {
        flushing = false;
        return;
      }

      console.log(
        `Vidange de ${items.length} élément(s) de la file Redis vers la DB...`,
      );
      console.log(
        `Éléments:`,
        items.slice(0, 10).map((s) => JSON.parse(s)),
      );

      // Couper la liste
      await client.lTrim(QUEUE_KEY, items.length, -1);

      const toWrite = items
        .map((s) => {
          try {
            return JSON.parse(s);
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      if (toWrite.length === 0) {
        flushing = false;
        return;
      }

      const payload = toWrite.map((p) => ({
        x: p.x,
        y: p.y,
        color: p.color, // chaîne de couleur — nous avons persisté les chaînes dans la file
        userId: p.userId ?? null,
        name: p.name ?? null, // nom optionnel
        avatar: p.avatar ?? null, // avatar optionnel
      }));

      const userIds = Array.from(
        new Set(payload.map((p) => p.userId).filter(Boolean)),
      );

      await prisma.$transaction(async (tx) => {
        await tx.pixelAction.createMany({
          data: payload,
          skipDuplicates: false,
        });

        if (userIds.length > 0) {
          await tx.user.updateMany({
            where: { id: { in: userIds } },
            data: { lastPixelPlaced: new Date() },
          });
        }
      });

      console.log(
        `${payload.length} pixel(s) vidangé(s) vers la DB (utilisateurs mis à jour: ${userIds.length})`,
      );
    } catch (err) {
      console.error(
        "Erreur lors de la vidange de la file Redis vers la DB:",
        err,
      );
      // tentative de remise en file
      try {
        if (items && items.length > 0) {
          for (const s of items) {
            try {
              await client.rPush(QUEUE_KEY, s);
            } catch (e) {
              console.error("Échec de la remise en file de l'élément:", e);
            }
          }
        }
      } catch (e) {
        console.error("Tentative de remise en file échouée:", e);
      }
    } finally {
      flushing = false;
    }
  }

  const flushInterval = setInterval(() => {
    void flushRedisQueue();
  }, FLUSH_INTERVAL_MS);

  // --- Arrêt gracieux ---
  async function gracefulShutdown() {
    console.log(
      "Arrêt du serveur - sauvegarde de la grille et vidage de la file Redis...",
    );
    clearInterval(flushInterval);

    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        await flushRedisQueue();
        const remaining = await client.lLen(QUEUE_KEY);
        console.log("Longueur de la file restante :", remaining);
        if (remaining === 0) break;
      } catch (e) {
        console.error("Erreur lors de la tentative de vidange d'arrêt:", e);
      }
      await new Promise((r) => setTimeout(r, 300));
    }

    try {
      await saveToRedis(canvas);
      console.log("Grille sauvegardée dans la persistance (binaire).");
    } catch (e) {
      console.error("Erreur lors de la sauvegarde du canvas à l'arrêt:", e);
    }

    try {
      // mettre à jour aussi le JSON hérité de manière atomique
      const arr = palette.snapshotToArrayStrings(canvas.snapshot());
      const paletteArr = palette.toArray();

      const multi = client.multi();
      multi.set(GRID_KEY, JSON.stringify(arr));
      multi.set(PALETTE_KEY, JSON.stringify(paletteArr));
      await multi.exec();

      console.log(
        "JSON GRID_KEY et PALETTE_KEY mis à jour de manière atomique lors de l'arrêt.",
      );
    } catch (e) {
      console.error(
        "Erreur lors de l'écriture atomique du JSON GRID_KEY/PALETTE_KEY à l'arrêt:",
        e,
      );
    }

    try {
      await client.quit();
      console.log("Déconnexion de Redis réussie.");
    } catch (e) {
      console.error("Erreur lors de la déconnexion Redis:", e);
    }

    try {
      await prisma.$disconnect();
      console.log("Déconnexion de Prisma réussie.");
    } catch (e) {
      console.error("Erreur lors de la déconnexion Prisma:", e);
    }

    process.exit(0);
  }

  process.on("SIGINT", gracefulShutdown);
  process.on("SIGTERM", gracefulShutdown);

  // --- Assistant: valider le placePixel entrant (accepter chaîne de couleur ou id) ---
  function validatePlacePixel(data) {
    if (!data || data.type !== "placePixel") return null;
    const x = Number(data.x);
    const y = Number(data.y);
    const color = data.color; // peut être une chaîne comme "#AABBCC" ou un nombre
    const userId = data.userId ?? null;
    const name = data.name ?? null; // nom optionnel
    const avatar = data.avatar ?? null;
    const isAdmin = Boolean(data.isAdmin);
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      (typeof color !== "string" && typeof color !== "number")
    )
      return null;
    if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return null;
    return {
      x: Math.trunc(x),
      y: Math.trunc(y),
      color,
      userId,
      isAdmin,
      name,
      avatar,
    };
  }

  // --- Assistant de diffusion (garder le comportement précédent) ---
  function broadcast(obj) {
    const raw = JSON.stringify(obj);
    for (const c of wss.clients) {
      if (c.readyState === 1) {
        try {
          c.send(raw);
        } catch (e) {
          console.warn("Échec de l'envoi du message au client:", c._id, e);
        }
      }
    }
  }

  // --- Gestion des connexions ---
  wss.on("connection", (ws) => {
    ws._id = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // envoyer init (instantané de grille) — nous envoyons un tableau JSON hérité de chaînes de couleur pour éviter de casser les clients
    try {
      const gridStr = palette.snapshotToArrayStrings(canvas.snapshot());
      totalPixels = gridStr.filter((c) => c !== DEFAULT_COLOR).length;
      console.log(
        `[WS ${ws._id}] nouvelle connexion, envoi de l'init...`,
        totalPixels,
      );
      ws.send(
        JSON.stringify({
          type: "init",
          width: WIDTH,
          height: HEIGHT,
          grid: gridStr,
          totalPixels,
          timestamp: Date.now(),
        }),
      );
    } catch (e) {
      console.warn("Échec de l'envoi d'init au client", e);
    }

    ws.on("message", async (msg) => {
      let data;
      try {
        data = JSON.parse(msg.toString());
      } catch (e) {
        console.warn("JSON invalide du client:", ws._id, msg.toString(), e);
        return;
      }

      console.log(`[WS ${ws._id}] message brut:`, msg.toString());
      console.log(`[WS ${ws._id}] message analysé:`, data);

      switch (data.type) {
        case "ping": {
          try {
            ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
          } catch (e) {
            console.error(`[WS ${ws._id}] Erreur lors de l'envoi du pong:`, e);
          }
          break;
        }
        case "auth": {
          try {
            const internalId = data.userId ? String(data.userId) : null;
            const discordId = data.discordId ? String(data.discordId) : null;
            const token = data.clientToken ? String(data.clientToken) : null;

            ws.clientToken = token;
            ws.internalUserId = internalId;
            ws.discordId = discordId;

            if (discordId) {
              addUserSocket(discordId, ws);
              console.log(
                `[WS ${ws._id}] auth enregistré discordId=${discordId} token=${token}`,
              );
            }
            if (internalId) {
              addUserSocket(internalId, ws);
              console.log(
                `[WS ${ws._id}] auth enregistré internalUserId=${internalId} token=${token}`,
              );
            }
          } catch (e) {
            console.error("[WS] erreur de gestion d'auth:", e);
          }
          break;
        }
        case "requestInit": {
          try {
            const gridStr = palette.snapshotToArrayStrings(canvas.snapshot());
            ws.send(
              JSON.stringify({
                type: "init",
                width: WIDTH,
                height: HEIGHT,
                grid: gridStr,
                totalPixels,
                timestamp: Date.now(),
              }),
            );
          } catch (e) {
            console.error(
              `[WS ${ws._id}] Erreur lors de l'envoi de resync:`,
              e,
            );
          }
          break;
        }
        case "placePixel": {
          console.log(
            `[WS ${ws._id}] placePixel reçu -> x=${data.x}, y=${data.y}, couleur=${data.color}, userId=${data.userId}`,
          );
          const place = validatePlacePixel(data);
          if (!place) return;

          // convertir couleur en id (si chaîne) ou valider id
          let colorId;
          let colorString;
          if (typeof place.color === "string") {
            const prevLen = palette.idToColor.length;
            colorString = String(place.color).toUpperCase();
            colorId = palette.getId(colorString);
            if (palette.idToColor.length !== prevLen) {
              console.log(
                "Nouvelle couleur enregistrée dans la palette:",
                colorString,
                "-> id",
                colorId,
              );
            }
          } else {
            colorId = Number(place.color) || 0;
            colorString = palette.getColor(colorId);
          }

          const key = place.userId || ws._id;

          let changed = false;
          try {
            changed = canvas.setPixel(place.x, place.y, colorId);
            console.log(
              `[server] canvas.setPixel a retourné: ${changed} pour (${place.x},${place.y}) colorId=${colorId}`,
            );
          } catch (err) {
            console.error("[server] erreur setPixel:", err);
            changed = false;
          }

          if (!changed) {
            console.log(
              "[server] aucun changement (même couleur) — ignorer la file et la diffusion",
            );
            return;
          }

          // programmer la sauvegarde avec anti-rebond
          scheduleSaveGrid();

          // pousser l'événement vers la file Redis avec chaîne de couleur (garde le schéma DB inchangé)
          const now = Date.now();
          await pushToQueue({
            x: place.x,
            y: place.y,
            color: colorString,
            userId: place.userId ?? null,
            isAdmin: place.isAdmin,
            name: place.name ?? null,
            avatar: place.avatar ?? null,
            timestamp: now,
          });

          totalPixels += 1;

          // diffuser immédiatement en utilisant la chaîne de couleur (les clients de compat attendent des chaînes)
          broadcast({
            type: "updatePixel",
            x: place.x,
            y: place.y,
            color: colorString,
            userId: key,
            timestamp: now,
            name: place.name ?? null,
            avatar: place.avatar ?? null,
            totalPixels,
          });

          console.log(
            `Mise à jour du pixel diffusée : x=${place.x}, y=${place.y}, couleur=${colorString}, total=${totalPixels}`,
          );

          // optionnellement déclencher le consommateur si la file est grande
          try {
            const qlen = await client.lLen(QUEUE_KEY);
            if (qlen >= BATCH_MAX) {
              void flushRedisQueue();
            }
          } catch (e) {
            console.error(
              "Erreur lors de la vérification de la longueur de la file Redis:",
              e,
            );
          }
        }
        case "placeAdminBlock": {
          if (!data.isAdmin || !Array.isArray(data.pixels)) {
            console.warn(
              `[WS ${ws._id}] placeAdminBlock rejeté (non-admin ou données invalides).`,
            );
            return;
          }

          const updates = [];
          const now = Date.now();

          for (const pixel of data.pixels) {
            const { x, y, color } = pixel;
            if (
              !Number.isFinite(x) ||
              !Number.isFinite(y) ||
              typeof color !== "string" ||
              x < 0 ||
              x >= WIDTH ||
              y < 0 ||
              y >= HEIGHT
            ) {
              console.warn(
                `[WS ${ws._id}] Pixel invalide ignoré: x=${x}, y=${y}, color=${color}`,
              );
              continue;
            }

            const colorId = palette.getId(color.toUpperCase());
            const changed = canvas.setPixel(x, y, colorId);

            if (changed) {
              updates.push({
                x,
                y,
                color,
                userId: data.userId,
                timestamp: now,
              });
            }
          }

          if (updates.length === 0) {
            console.log(
              `[WS ${ws._id}] Aucun pixel modifié dans placeAdminBlock.`,
            );
            return;
          }

          // Programmer la sauvegarde avec anti-rebond
          scheduleSaveGrid();

          // Pousser les mises à jour dans la file Redis
          for (const update of updates) {
            await pushToQueue(update);
          }

          // Diffuser les mises à jour aux clients
          for (const update of updates) {
            broadcast({
              type: "updatePixel",
              ...update,
            });
          }

          totalPixels += updates.length;

          console.log(
            `[WS ${ws._id}] ${updates.length} pixel(s) mis à jour par placeAdminBlock.`,
          );
          break;
        }
      }
    });

    ws.on("close", () => {
      removeUserSocket(ws);
    });

    ws.on("error", (err) => {
      console.log(`Erreur WebSocket sur le socket ${ws._id} : ${err.message}`);
    });
  });

  console.log("Serveur prêt.");
})();

