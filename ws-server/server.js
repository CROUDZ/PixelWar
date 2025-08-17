// server.js (CommonJS)
// Assure-toi d'avoir installé: ws, redis (v4), @prisma/client
import { config } from "dotenv";
import { WebSocketServer } from "ws";
import redis from "redis";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import { Redis } from "ioredis";
const sub = new Redis();

// near top, après const sub = new Redis();
sub.subscribe("logout", (err, count) => {
  if (err) console.error("Redis subscribe error:", err);
  else console.log("Subscribed to logout channel, subscriber count:", count);
});
sub.subscribe("link", (err, count) => {
  if (err) console.error("Redis subscribe error:", err);
  else console.log("Subscribed to link channel, subscriber count:", count);
});

sub.on("message", (channel, message) => {
  console.log("[server.js] Redis message:", channel, message);
  if (channel === "logout") {
    try {
      const { userId } = JSON.parse(message);
      console.log("[server.js] logout event for userId:", userId);

      const set = userSockets.get(String(userId));
      if (set && set.size > 0) {
        console.log(
          `[server.js] sending logout to ${set.size} socket(s) for user ${userId}`,
        );
        for (const s of Array.from(set)) {
          try {
            if (s.readyState === s.OPEN || s.readyState === 1) {
              s.send(JSON.stringify({ type: "logout" }));
            } else {
              console.log("[server.js] socket not open, removing");
              set.delete(s);
            }
          } catch (e) {
            console.error("[server.js] failed to send logout to socket:", e);
          }
        }
        // cleanup if set became empty
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
        console.log(
          "[server.js] link event for discordId:",
          discordId,
          "payload:",
          payload,
        );

        // find account -> get internal userId
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

        // Notify sockets for both keys: discordId and internal userId (if known)
        const notifiedSocketIds = new Set();

        // helper to notify all sockets in a set
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
                console.log(
                  "[server.js] sent linked to socket",
                  s._id,
                  "token=",
                  s.clientToken,
                );
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

        // notify sockets keyed by discordId
        const setByDiscord = userSockets.get(discordId);
        if (setByDiscord && setByDiscord.size > 0) {
          console.log(
            `[server.js] sending 'linked' to ${setByDiscord.size} socket(s) for discordId ${discordId}`,
          );
          notifySet(setByDiscord);
        }

        // notify sockets keyed by internal userId (fallback)
        if (account && account.userId) {
          const setByUser = userSockets.get(String(account.userId));
          if (setByUser && setByUser.size > 0) {
            console.log(
              `[server.js] also sending 'linked' to ${setByUser.size} socket(s) for internal user ${account.userId}`,
            );
            notifySet(setByUser);
          }
        }
      } catch (e) {
        console.error("[server.js] invalid link payload or error:", e);
      }
    })();
    return;
  }
});

// Initialize Prisma Client
const prisma = new PrismaClient();

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from parent directory
config({ path: resolve(__dirname, "../.env") });

// --- Config ---
const PORT = Number(process.env.WS_PORT || 8080);
const GRID_KEY = process.env.GRID_KEY || "pixel-grid";
const QUEUE_KEY = process.env.QUEUE_KEY || "pixel-queue";
const WIDTH = Number(process.env.GRID_WIDTH || 500);
const HEIGHT = Number(process.env.GRID_HEIGHT || 500);
const DEFAULT_COLOR = process.env.DEFAULT_COLOR || "#FFFFFF";

const FLUSH_INTERVAL_MS = Number(process.env.FLUSH_INTERVAL_MS || 100); // consumer flush
const BATCH_MAX = Number(process.env.BATCH_MAX || 1000); // items per DB write
const GRID_SAVE_DEBOUNCE_MS = Number(process.env.GRID_SAVE_DEBOUNCE_MS || 1000); // debounce Redis grid SAVE

let totalPixels = 0;
const userSockets = new Map(); // Map<userId, Set<ws>>

// helper pour ajouter un ws à un userId
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

// helper pour retirer un ws (à la close)
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

async function initCounter() {
  console.log("Initializing pixel counter...");
  totalPixels = await prisma.pixelAction.count();
  console.log("Total pixels:", totalPixels);
}
initCounter();

(async () => {
  // --- Redis client v4 ---
  const redisUrl = process.env.REDIS_URL || undefined;
  const client = redis.createClient(redisUrl ? { url: redisUrl } : {});
  client.on("error", (err) => console.error("Redis error:", err));
  await client.connect();
  console.log("Redis connected");

  // --- Load or init grid in memory (array of colors length = WIDTH*HEIGHT) ---
  let grid;
  async function loadGrid() {
    const raw = await client.get(GRID_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || parsed.length !== WIDTH * HEIGHT) {
          throw new Error("Bad grid shape");
        }
        grid = parsed;
      } catch (e) {
        console.warn(
          "Grid corrupted or invalid, reinitializing:",
          e.message || e,
        );
        grid = new Array(WIDTH * HEIGHT).fill(DEFAULT_COLOR);
        await client.set(GRID_KEY, JSON.stringify(grid));
      }
    } else {
      grid = new Array(WIDTH * HEIGHT).fill(DEFAULT_COLOR);
      await client.set(GRID_KEY, JSON.stringify(grid));
    }
    console.log("Grid loaded, size =", grid.length);
  }
  await loadGrid();

  // --- WebSocket server ---
  const wss = new WebSocketServer({ port: PORT }, () => {
    console.log(`WebSocket server started on ws://0.0.0.0:${PORT}`);
  });

  // --- In-memory helpers ---
  // Note: buffer is now persisted into Redis queue (RPUSH) to avoid data loss on crash.
  // But we keep a small in-memory buffer length metric.
  let flushing = false;

  // --- Debounced save of grid to Redis (avoid SET every pixel) ---
  let saveScheduled = false;
  function scheduleSaveGrid() {
    if (saveScheduled) return;
    saveScheduled = true;
    setTimeout(async () => {
      try {
        await client.set(GRID_KEY, JSON.stringify(grid));
        // console.log("Grid saved to Redis (debounced)");
      } catch (e) {
        console.error("Redis autosave failed:", e);
      } finally {
        saveScheduled = false;
      }
    }, GRID_SAVE_DEBOUNCE_MS);
  }

  // --- Broadcast helper ---
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

  // --- Validate incoming placePixel payload ---
  function validatePlacePixel(data) {
    if (!data || data.type !== "placePixel") return null;
    const x = Number(data.x);
    const y = Number(data.y);
    const color = typeof data.color === "string" ? data.color : null;
    const userId = data.userId ?? null;
    if (!Number.isFinite(x) || !Number.isFinite(y) || !color) return null;
    if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return null;
    return { x: Math.trunc(x), y: Math.trunc(y), color, userId };
  }

  // --- Push to Redis queue (RPUSH) ---
  async function pushToQueue(item) {
    try {
      await client.rPush(QUEUE_KEY, JSON.stringify(item));
    } catch (e) {
      console.error(
        "Failed to push to Redis queue, fallback to in-memory (risky):",
        e,
      );
      // As fallback, try to keep in memory by unshift to a small array (not implemented here).
      // Better to alert and restart consumer.
    }
  }

  // --- Consumer: flush items from Redis queue to DB in batch ---
  async function flushRedisQueue() {
    if (flushing) return;
    flushing = true;
    try {
      // Read up to BATCH_MAX items
      const items = await client.lRange(QUEUE_KEY, 0, BATCH_MAX - 1);
      if (!items || items.length === 0) {
        flushing = false;
        return;
      }

      console.log(`Flushing ${items.length} item(s) from Redis queue to DB...`);
      console.log("Items:", items);

      // Trim the list to remove the items we are going to process
      // Keep elements from index items.length .. -1
      await client.lTrim(QUEUE_KEY, items.length, -1);

      // Parse payload
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

      // Prepare payload for Prisma
      const payload = toWrite.map((p) => ({
        x: p.x,
        y: p.y,
        color: p.color,
        userId: p.userId ?? null,
      }));

      const userIds = Array.from(
        new Set(payload.map((p) => p.userId).filter(Boolean)),
      );

      // Transaction: createMany + updateMany for users' lastPixelPlaced
      await prisma.$transaction(async (tx) => {
        await tx.pixelAction.createMany({
          data: payload,
          skipDuplicates: false,
        });

        console.log(`Persisting ${payload.length} pixel(s) to DB...`);
        console.log(`User IDs to update: ${userIds.join(", ")}`);

        if (userIds.length > 0) {
          await tx.user.updateMany({
            where: { id: { in: userIds } },
            data: { lastPixelPlaced: new Date() },
          });
        }
      });

      // Success: log basic metric
      console.log(
        `Flushed ${payload.length} pixel(s) to DB (users updated: ${userIds.length})`,
      );
    } catch (err) {
      console.error("Error flushing Redis queue to DB:", err);
      // In case of error (DB down...), items were already removed from list.
      // To be safe, requeue the failed items by pushing them back.
      // As a simple approach, push back the items that were parsed.
      // NOTE: this is best-effort; if parsing or store failed, log and alert in prod.
      try {
        // Attempt to re-push items we failed to persist (best-effort)
        // If 'items' variable exists in this scope, requeue them. Otherwise skip.
        if (typeof items !== "undefined" && items && items.length > 0) {
          // push all back (could lead to duplicates if partial success occurred)
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

  // Periodic consumer
  const flushInterval = setInterval(() => {
    void flushRedisQueue();
  }, FLUSH_INTERVAL_MS);

  // --- Graceful shutdown: try to flush queue and save grid ---
  async function gracefulShutdown() {
    console.log("Shutting down - flushing Redis queue and saving grid...");
    clearInterval(flushInterval);

    // Try multiple times to flush the queue
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        await flushRedisQueue();
        const remaining = await client.lLen(QUEUE_KEY);
        console.log("Remaining queue length:", remaining);
        if (remaining === 0) break;
      } catch (e) {
        console.error("Error during shutdown flush attempt:", e);
      }
      // small delay before retry
      await new Promise((r) => setTimeout(r, 300));
    }

    // Save current grid to Redis
    try {
      await client.set(GRID_KEY, JSON.stringify(grid));
      console.log("Grid saved to Redis on shutdown.");
    } catch (e) {
      console.error("Error saving grid on shutdown:", e);
    }

    try {
      await client.quit();
    } catch (e) {
      console.error("Error disconnecting Redis:", e);
    }

    try {
      await prisma.$disconnect();
    } catch (e) {
      console.error("Error disconnecting Prisma:", e);
    }
    process.exit(0);
  }

  process.on("SIGINT", gracefulShutdown);
  process.on("SIGTERM", gracefulShutdown);

  // --- Handle WS connections ---
  wss.on("connection", (ws) => {
    ws._id = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    console.log("Client connected:", ws._id);

    // send init (grid snapshot)
    try {
      ws.send(
        JSON.stringify({
          type: "init",
          width: WIDTH,
          height: HEIGHT,
          grid,
          totalPixels,
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

      if (data.type === "auth") {
        try {
          const internalId = data.userId ? String(data.userId) : null; // internal user id (session.user.id)
          const discordId = data.discordId ? String(data.discordId) : null; // providerAccountId (discord)
          const token = data.clientToken ? String(data.clientToken) : null;

          ws.clientToken = token;
          ws.internalUserId = internalId;
          ws.discordId = discordId;

          // register under both keys if present
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

      if (data.type === "placePixel") {
        const place = validatePlacePixel(data);
        if (!place) return;

        const key = place.userId || ws._id;

        // update in-memory grid (latest state)
        const idx = place.y * WIDTH + place.x;
        grid[idx] = place.color;

        // schedule debounced save of full grid to Redis
        scheduleSaveGrid();

        // push the pixel event to Redis queue for durable batch persistence
        const now = Date.now();
        await pushToQueue({
          x: place.x,
          y: place.y,
          color: place.color,
          userId: place.userId ?? null,
          timestamp: now,
        });

        totalPixels += 1;

        // broadcast immediately to clients
        broadcast({
          type: "updatePixel",
          x: place.x,
          y: place.y,
          color: place.color,
          userId: key,
          timestamp: now,
          totalPixels,
        });

        // If queue length is large, trigger a flush (non-blocking)
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
      console.log("Client disconnected:", ws._id);
    });

    ws.on("error", (err) => {
      console.error("WS error on socket", ws._id, err);
    });
  });

  console.log("Server ready.");
})();
