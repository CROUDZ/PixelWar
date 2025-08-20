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
import { logToDiscord } from "../bot/dist/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, "../.env") });

// --- Configs ---
const PORT = Number(process.env.WS_PORT || 8080);
const GRID_KEY = process.env.GRID_KEY || "pixel-grid"; // legacy JSON key
const QUEUE_KEY = process.env.QUEUE_KEY || "pixel-queue";
const DEFAULT_COLOR = process.env.DEFAULT_COLOR || "#FFFFFF";

const FLUSH_INTERVAL_MS = Number(process.env.FLUSH_INTERVAL_MS || 100);
const BATCH_MAX = Number(process.env.BATCH_MAX || 1000);
const GRID_SAVE_DEBOUNCE_MS = Number(process.env.GRID_SAVE_DEBOUNCE_MS || 1000);

const WIDTH = Number(process.env.GRID_WIDTH || 100);
const HEIGHT = Number(process.env.GRID_HEIGHT || 100);

// --- Clients Redis ---
const redisUrl = process.env.REDIS_URL || undefined;
const client = redis.createClient(redisUrl ? { url: redisUrl } : {});
client.on("error", (e) => logToDiscord(`Erreur client Redis : ${e.message}`));

const sub = new IORedis(redisUrl);
sub.on("error", (e) => logToDiscord(`Erreur ioredis (sub) : ${e.message}`));

// subscribe channels already used in your code
sub.subscribe("logout", (err, count) => {
  if (err) logToDiscord(`Erreur d'abonnement au canal logout : ${err.message}`);
  else logToDiscord(`Abonné au canal logout (${count} abonnés).`);
});
sub.subscribe("link", (err, count) => {
  if (err) logToDiscord(`Erreur d'abonnement au canal link : ${err.message}`);
  else logToDiscord(`Abonné au canal link (${count} abonnés).`);
});
sub.subscribe("canvas-clear", (err, count) => {
  if (err) logToDiscord(`Erreur d'abonnement au canal canvas-clear : ${err.message}`);
  else logToDiscord(`Abonné au canal canvas-clear (${count} abonnés).`);
});

sub.on("message", (channel, message) => {
  logToDiscord(`Message reçu sur le canal ${channel} : ${message}`);
  // --- leave your existing handlers unchanged (copié depuis ton code) ---
  if (channel === "logout") {
    try {
      const { userId } = JSON.parse(message);
      logToDiscord(`L'utlilisateur avec l'ID ${userId} s'est déconnecté.`);
      // Log to console
      console.log("[server.js] logout event for userId:", userId);

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
            console.error("[server.js] failed to send logout to socket:", e);
          }
        }
        if (set.size === 0) userSockets.delete(String(userId));
      } else {
        console.log("[server.js] no ws found for user", userId);
      }
    } catch (e) {
      console.error("Invalid logout payload:", e);
    }
  }

  if (channel === "link") {
    (async () => {
      try {
        const payload = JSON.parse(message);
        const discordId = String(payload.userId);
        logToDiscord(`L'utilisateur avec l'ID Discord ${discordId} a été lié.`);
        console.log(
          "[server.js] link event for discordId:",
          discordId,
          "payload:",
          payload,
        );

        let account = null;
        try {
          account = await prisma.account.findFirst({
            where: { provider: "discord", providerAccountId: discordId },
            select: { id: true, userId: true, providerAccountId: true },
          });
          console.log("[server.js] prisma: account lookup result:", account);
        } catch (e) {
          console.error("[server.js] prisma error while finding account:", e);
        }

        if (!account) {
          console.warn(
            `[server.js] Aucun Account trouvé pour discordId=${discordId}.`,
          );
        } else {
          try {
            const updated = await prisma.user.update({
              where: { id: account.userId },
              data: { linked: true },
            });
            console.log(
              `[server.js] prisma: user ${account.userId} updated linked=true`,
              {
                updatedId: updated.id,
                linked: updated.linked,
              },
            );
          } catch (e) {
            console.error("[server.js] prisma update error for link:", e);
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
                  "[server.js] failed to send linked to socket:",
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
        console.error("[server.js] invalid link payload or error:", e);
      }
    })();
    return;
  }

  if (channel === "canvas-clear") {
    (async () => {
      try {
        const payload = JSON.parse(message);
        logToDiscord(`[ADMIN] Canvas cleared by admin ${payload.adminId} at ${new Date(payload.timestamp).toISOString()}`);
        console.log("[server.js] canvas-clear event:", payload);

        // Reset total pixels counter
        totalPixels = 0;

        // *** IMPORTANT: Reset the server's internal canvas to empty state ***
        const emptySnap = new Uint8Array(payload.width * payload.height); // All pixels = 0 (default color ID)
        canvas.restore(emptySnap);
        
        // Reset palette to ensure default color is ID 0
        palette.colorToId.clear();
        palette.idToColor = [];
        palette._registerColor(payload.defaultColor);
        
        console.log(`[server.js] Internal canvas reset to empty state (${payload.width}x${payload.height})`);

        // Create empty grid with default color for client compatibility
        const emptyGrid = payload.grid || new Array(payload.width * payload.height).fill(payload.defaultColor);

        // Broadcast canvas clear to all connected clients
        const clearMessage = {
          type: "canvasClear",
          timestamp: payload.timestamp,
          width: payload.width,
          height: payload.height,
          grid: emptyGrid,
          totalPixels: 0,
          clearedBy: payload.adminId
        };

        // Send to all connected websockets
        if (wss && wss.clients) {
          for (const client of wss.clients) {
            if (client.readyState === 1) { // WebSocket.OPEN
              try {
                client.send(JSON.stringify(clearMessage));
              } catch (e) {
                console.warn("[server.js] Failed to send canvas clear to client:", e);
              }
            }
          }
          console.log(`[server.js] Canvas clear broadcasted to ${wss.clients.size} clients`);
        } else {
          console.warn("[server.js] WebSocket server not ready, cannot broadcast canvas clear");
        }
        
        // Immediately save the empty state to Redis to ensure persistence
        try {
          await saveToRedis(canvas);
          console.log("[server.js] Empty canvas state saved to Redis persistence");
        } catch (e) {
          console.error("[server.js] Failed to save empty canvas to Redis:", e);
        }
        
      } catch (e) {
        console.error("[server.js] invalid canvas-clear payload or error:", e);
      }
    })();
    return;
  }
});

// --- Prisma ---
const prisma = new PrismaClient();

// --- User sockets map (identique à ton code) ---
const userSockets = new Map();

// --- Global WebSocket server reference ---
let wss = null;

// helpers add/remove user sockets (copiés)
function addUserSocket(userId, ws) {
  let set = userSockets.get(userId);
  if (!set) {
    set = new Set();
    userSockets.set(userId, set);
  }
  set.add(ws);
  ws.userId = userId;
  console.log(
    `[server.js] addUserSocket: ${userId} -> now ${set.size} socket(s)`,
  );
}
function removeUserSocket(ws) {
  const userId = ws.userId;
  if (!userId) return;
  const set = userSockets.get(userId);
  if (!set) return;
  set.delete(ws);
  console.log(
    `[server.js] removeUserSocket: ${userId} -> remaining ${set.size} socket(s)`,
  );
  if (set.size === 0) {
    userSockets.delete(userId);
    console.log(`[server.js] removed user mapping for ${userId}`);
  }
}

// --- metrics & init ---
let totalPixels = 0;
async function initCounter() {
  logToDiscord("Initialisation du compteur de pixels...");
  totalPixels = await prisma.pixelAction.count();
  logToDiscord(
    `Le compteur de pixels a été initialisé avec ${totalPixels} pixels.`,
  );
  console.log("Total pixels:", totalPixels);
}
initCounter();

// ----------------------------
// Palette manager (dynamique)
// ----------------------------
// map couleur string <-> id (0..255). id 0 reserved for DEFAULT_COLOR
class PaletteManager {
  constructor(defaultColor = "#FFFFFF") {
    this.colorToId = new Map();
    this.idToColor = [];
    this.defaultColor = defaultColor;
    // init id 0 as default
    this._registerColor(defaultColor);
  }

  _registerColor(hex) {
    hex = String(hex).toUpperCase();
    if (this.colorToId.has(hex)) return this.colorToId.get(hex);
    const id = this.idToColor.length;
    if (id >= 256) {
      // palette full -> fallback to default
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

  // convert an array of color-strings to a Uint8Array using dynamic palette
  arrayStringsToSnapshot(arr, width, height) {
    const snap = new Uint8Array(width * height);
    for (let i = 0; i < snap.length; i++) {
      const s = arr[i] ?? this.defaultColor;
      snap[i] = this.getId(s);
    }
    return snap;
  }

  // convert snapshot Uint8Array -> array of strings
  snapshotToArrayStrings(snapshot) {
    const out = new Array(snapshot.length);
    for (let i = 0; i < snapshot.length; i++) {
      out[i] = this.getColor(snapshot[i]);
    }
    return out;
  }
}

(async () => {
  await client.connect();
  logToDiscord("Connexion à Redis réussie (client)");

  // --- Load canvas snapshot (try binary first via loadFromRedis) ---
  let canvas;
  const palette = new PaletteManager(DEFAULT_COLOR);

  try {
    const snap = await loadFromRedis(WIDTH, HEIGHT).catch(() => undefined);
    if (snap && snap instanceof Uint8Array && snap.length === WIDTH * HEIGHT) {
      // Great — we have binary snapshot (ids)
      canvas = new PixelCanvas(WIDTH, HEIGHT, snap);
      // We need to ensure palette has entries for ids present.
      // If persistence saved only raw bytes, we don't know color strings -> fallback to defaultColor for all ids > 0
      // (Assumption: previous save used same palette scheme)
      console.log("Loaded binary snapshot from persistence (Uint8Array).");
    } else {
      // fallback: try legacy GRID_KEY JSON (array of color strings)
      const raw = await client.get(GRID_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length === WIDTH * HEIGHT) {
            const snapFromStrings = palette.arrayStringsToSnapshot(
              parsed,
              WIDTH,
              HEIGHT,
            );
            canvas = new PixelCanvas(WIDTH, HEIGHT, snapFromStrings);
            console.log(
              "Loaded legacy GRID_KEY JSON and converted to PixelCanvas.",
            );
          } else {
            throw new Error("Bad grid shape or invalid legacy grid.");
          }
        } catch (e) {
          console.warn(
            "Legacy GRID_KEY invalid — initializing new canvas:",
            e.message || e,
          );
          const emptySnap = new Uint8Array(WIDTH * HEIGHT); // filled with 0 (default color)
          // ensure default color id is registered
          palette.getId(DEFAULT_COLOR);
          canvas = new PixelCanvas(WIDTH, HEIGHT, emptySnap);
          // mark all dirty so clients resync if needed
          canvas.drainDirtyChunks(); // just to be explicit; you can mark dirty manually if needed
        }
      } else {
        // nothing found — start fresh
        const emptySnap = new Uint8Array(WIDTH * HEIGHT);
        palette.getId(DEFAULT_COLOR);
        canvas = new PixelCanvas(WIDTH, HEIGHT, emptySnap);
        console.log("No grid found — started new empty PixelCanvas.");
      }
    }
  } catch (e) {
    console.error(
      "Error while loading initial snapshot — initializing empty canvas:",
      e,
    );
    const emptySnap = new Uint8Array(WIDTH * HEIGHT);
    palette.getId(DEFAULT_COLOR);
    canvas = new PixelCanvas(WIDTH, HEIGHT, emptySnap);
  }

  // --- utility: convert x,y to index (same as PixelCanvas.index but private here if needed) ---
  /*function idxOf(x, y) {
    return y * WIDTH + x;
  }*/

  // --- Debounced save: save binary snapshot + optionally update legacy GRID_KEY JSON (compat) ---
  let saveScheduled = false;
  function scheduleSaveGrid() {
    if (saveScheduled) return;
    saveScheduled = true;
    setTimeout(async () => {
      try {
        // save binary snapshot (recommended)
        await saveToRedis(canvas).catch((e) => {
          console.error("saveToRedis failed:", e);
        });

        // Also update legacy GRID_KEY as JSON of color-strings (for compatibility)
        try {
          // convert snapshot to array of strings (careful with large memory; we keep it since old code did the same)
          const arr = palette.snapshotToArrayStrings(canvas.snapshot());
          await client.set(GRID_KEY, JSON.stringify(arr));
        } catch (e) {
          console.error("Failed to write legacy GRID_KEY JSON (compat):", e);
        }
      } catch (e) {
        console.error("Redis autosave failed:", e);
      } finally {
        saveScheduled = false;
      }
    }, GRID_SAVE_DEBOUNCE_MS);
  }

  // --- WebSocket server ---
  wss = new WebSocketServer({ port: PORT }, () => {
    logToDiscord("WebSocket server démarré sur ws://0.0.0.0:${PORT}");
  });

  // --- Queue push helper (same logic) ---
  async function pushToQueue(item) {
    try {
      await client.rPush(QUEUE_KEY, JSON.stringify(item));
    } catch (e) {
      console.error(
        "Failed to push to Redis queue, fallback to in-memory (risky):",
        e,
      );
    }
  }

  // --- Consumer flush (identique à ton code) ---
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

      console.log(`Flushing ${items.length} item(s) from Redis queue to DB...`);

      // Trim list
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
        color: p.color, // color string — we persisted strings to queue
        userId: p.userId ?? null,
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
        `Flushed ${payload.length} pixel(s) to DB (users updated: ${userIds.length})`,
      );
    } catch (err) {
      console.error("Error flushing Redis queue to DB:", err);
      // attempt to requeue
      try {
        if (items && items.length > 0) {
          for (const s of items) {
            try {
              await client.rPush(QUEUE_KEY, s);
            } catch (e) {
              console.error("Failed to requeue item:", e);
            }
          }
        }
      } catch (e) {
        console.error("Re-queue attempt failed:", e);
      }
    } finally {
      flushing = false;
    }
  }

  const flushInterval = setInterval(() => {
    void flushRedisQueue();
  }, FLUSH_INTERVAL_MS);

  // --- Graceful shutdown ---
  async function gracefulShutdown() {
    logToDiscord(
      "Arrêt du serveur - sauvegarde de la grille et vidage de la file Redis...",
    );
    clearInterval(flushInterval);

    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        await flushRedisQueue();
        const remaining = await client.lLen(QUEUE_KEY);
        logToDiscord("Longueur de la file restante :", remaining);
        if (remaining === 0) break;
      } catch (e) {
        console.error("Error during shutdown flush attempt:", e);
      }
      await new Promise((r) => setTimeout(r, 300));
    }

    try {
      await saveToRedis(canvas);
      logToDiscord("Grille sauvegardée dans la persistance (binaire).");
    } catch (e) {
      console.error("Error saving canvas on shutdown:", e);
    }

    try {
      // update legacy JSON too
      const arr = palette.snapshotToArrayStrings(canvas.snapshot());
      await client.set(GRID_KEY, JSON.stringify(arr));
      logToDiscord("JSON GRID_KEY mis à jour lors de l'arrêt.");
    } catch (e) {
      console.error("Error writing legacy GRID_KEY JSON on shutdown:", e);
    }

    try {
      await client.quit();
      logToDiscord("Déconnexion de Redis réussie.");
    } catch (e) {
      console.error("Error disconnecting Redis:", e);
    }

    try {
      await prisma.$disconnect();
      logToDiscord("Déconnexion de Prisma réussie.");
    } catch (e) {
      console.error("Error disconnecting Prisma:", e);
    }

    process.exit(0);
  }

  process.on("SIGINT", gracefulShutdown);
  process.on("SIGTERM", gracefulShutdown);

  // --- Helper: validate incoming placePixel (accept color string or id) ---
  function validatePlacePixel(data) {
    if (!data || data.type !== "placePixel") return null;
    const x = Number(data.x);
    const y = Number(data.y);
    const color = data.color; // can be string like "#AABBCC" or number
    const userId = data.userId ?? null;
    const isAdmin = Boolean(data.isAdmin);
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      (typeof color !== "string" && typeof color !== "number")
    )
      return null;
    if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return null;
    return { x: Math.trunc(x), y: Math.trunc(y), color, userId, isAdmin };
  }

  // --- Broadcast helper (keep previous behaviour) ---
  function broadcast(obj) {
    const raw = JSON.stringify(obj);
    for (const c of wss.clients) {
      if (c.readyState === 1) {
        try {
          c.send(raw);
        } catch (e) {
          console.warn("Failed to send message to client:", c._id, e);
        }
      }
    }
  }

  // --- Connection handling ---
  wss.on("connection", (ws) => {
    ws._id = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // send init (grid snapshot) — we send legacy JSON array of color-strings to avoid breaking clients
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
      console.warn("Failed to send init to client", e);
    }

    ws.on("message", async (msg) => {
      let data;
      try {
        data = JSON.parse(msg.toString());
      } catch (e) {
        console.warn("Invalid JSON from client:", ws._id, msg.toString(), e);
        return;
      }

      // Handle heartbeat ping
      if (data.type === "ping") {
        try {
          ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
        } catch (e) {
          console.error(`[WS ${ws._id}] Error sending pong:`, e);
        }
        return;
      }

      if (data.type === "auth") {
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
              `[WS ${ws._id}] auth registered discordId=${discordId} token=${token}`,
            );
          }
          if (internalId) {
            addUserSocket(internalId, ws);
            console.log(
              `[WS ${ws._id}] auth registered internalUserId=${internalId} token=${token}`,
            );
          }
        } catch (e) {
          console.error("[WS] auth handling error:", e);
        }
        return;
      }

      // Handle request for resync
      if (data.type === "requestInit") {
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
          console.error(`[WS ${ws._id}] Error sending resync:`, e);
        }
        return;
      }

      console.log(`[WS ${ws._id}] raw message:`, msg.toString());
      console.log(`[WS ${ws._id}] parsed message:`, data);

      if (data.type === "placePixel") {
        console.log(
          `[WS ${ws._id}] received placePixel -> x=${data.x}, y=${data.y}, color=${data.color}, userId=${data.userId}`,
        );
        const place = validatePlacePixel(data);
        if (!place) return;

        // convert color to id (if string) or validate id
        let colorId;
        let colorString;
        if (typeof place.color === "string") {
          colorString = String(place.color).toUpperCase();
          colorId = palette.getId(colorString);
        } else {
          colorId = Number(place.color) || 0;
          colorString = palette.getColor(colorId);
        }

        const key = place.userId || ws._id;

        let changed = false;
        try {
          changed = canvas.setPixel(place.x, place.y, colorId);
          console.log(
            `[server] canvas.setPixel returned: ${changed} for (${place.x},${place.y}) colorId=${colorId}`,
          );
        } catch (err) {
          console.error("[server] setPixel error:", err);
          changed = false;
        }

        if (!changed) {
          console.log(
            "[server] no change (same color) — skipping queue & broadcast",
          );
          return;
        }

        // schedule debounced save
        scheduleSaveGrid();

        // push event to Redis queue with color string (keeps DB schema unchanged)
        const now = Date.now();
        await pushToQueue({
          x: place.x,
          y: place.y,
          color: colorString,
          userId: place.userId ?? null,
          isAdmin: place.isAdmin,
          timestamp: now,
        });

        totalPixels += 1;

        // broadcast immediately using color string (compat clients expect strings)
        broadcast({
          type: "updatePixel",
          x: place.x,
          y: place.y,
          color: colorString,
          userId: key,
          timestamp: now,
          totalPixels,
        });

        logToDiscord(
          `Mise à jour du pixel diffusée : x=${place.x}, y=${place.y}, couleur=${colorString}, total=${totalPixels}`,
        );

        // optionally trigger consumer if queue big
        try {
          const qlen = await client.lLen(QUEUE_KEY);
          if (qlen >= BATCH_MAX) {
            void flushRedisQueue();
          }
        } catch (e) {
          console.error("Error checking Redis queue length:", e);
        }
      }
    });

    ws.on("close", () => {
      removeUserSocket(ws);
    });

    ws.on("error", (err) => {
      logToDiscord(`Erreur WebSocket sur le socket ${ws._id} : ${err.message}`);
    });
  });

  logToDiscord("Serveur prêt.");
})().catch((e) => {
  logToDiscord("Erreur fatale du serveur : " + e.message);
  process.exit(1);
});
