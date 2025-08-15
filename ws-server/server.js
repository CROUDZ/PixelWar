// server.js (CommonJS)
import WebSocket, { WebSocketServer } from "ws";
import redis from "redis";

const PORT = 8080;
const GRID_KEY = "pixel-grid";
const WIDTH = 500;
const HEIGHT = 500;
const DEFAULT_COLOR = "#FFFFFF";

(async () => {
  // Création et connexion Redis (v4+)
  const client = redis.createClient();
  client.on("error", (err) => console.error("Redis error:", err));
  await client.connect();
  console.log("Redis connected");

  // Charger ou initialiser la grille une seule fois (shared)
  let grid;
  const loadGrid = async () => {
    const raw = await client.get(GRID_KEY);
    if (raw) {
      try {
        grid = JSON.parse(raw);
        if (!Array.isArray(grid) || grid.length !== WIDTH * HEIGHT)
          throw new Error("Bad grid");
      } catch {
        grid = new Array(WIDTH * HEIGHT).fill(DEFAULT_COLOR);
        await client.set(GRID_KEY, JSON.stringify(grid));
      }
    } else {
      grid = new Array(WIDTH * HEIGHT).fill(DEFAULT_COLOR);
      await client.set(GRID_KEY, JSON.stringify(grid));
    }
    console.log("Grid loaded, size =", grid.length);
  };

  await loadGrid();

  // Serveur WebSocket
  const wss = new WebSocketServer({ port: PORT }, () => {
    console.log(`WebSocket server started on ws://localhost:${PORT}`);
  });

  // Simple rate-limit / cooldown map (clé = userId ou ws._id)
  const lastPlaced = new Map();

  // Broadcast util
  const broadcast = (msg) => {
    const raw = JSON.stringify(msg);
    wss.clients.forEach((c) => {
      if (c.readyState === WebSocket.OPEN) c.send(raw);
    });
  };

  wss.on("connection", async (ws) => {
    // Optionnel : assigner un id temporaire à la socket
    ws._id = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    console.log("Client connected:", ws._id);

    // Envoyer l'état complet (init)
    ws.send(
      JSON.stringify({ type: "init", width: WIDTH, height: HEIGHT, grid }),
    );

    ws.on("message", async (msg) => {
      let data;
      try {
        data = JSON.parse(msg.toString());
      } catch (e) {
        return console.warn("Bad JSON:", e);
      }

      if (data.type === "placePixel") {
        const { x, y, color, userId } = data;
        if (typeof x !== "number" || typeof y !== "number") return;
        if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return;

        // cooldown simple : 60s by default
        const key = userId || ws._id;
        const now = Date.now();
        const last = lastPlaced.get(key) || 0;
        const COOLDOWN = (data.booster ? 45 : 60) * 1000;
        if (now - last < COOLDOWN) {
          // Optionnel : renvoyer un message d'erreur
          ws.send(JSON.stringify({ type: "error", message: "Cooldown" }));
          return;
        }
        lastPlaced.set(key, now);

        // Update in-memory grid
        grid[y * WIDTH + x] = color;

        // Persist to Redis (on peut batcher, ici on sauvegarde immédiatement)
        try {
          await client.set(GRID_KEY, JSON.stringify(grid));
          console.log(
            `Pixel placed at (${x}, ${y}) with color ${color} by ${key}`,
          );
        } catch (err) {
          console.error("Redis set failed:", err);
        }

        // Broadcast à tous
        broadcast({
          type: "updatePixel",
          x,
          y,
          color,
          userId: key,
          timestamp: now,
        });
      }
    });

    ws.on("close", () => {
      console.log("Client disconnected:", ws._id);
    });

    ws.on("error", (err) => {
      console.error("WS error:", err);
    });
  });

  // Handler pour sauvegarder périodiquement (optionnel)
  setInterval(async () => {
    try {
      await client.set(GRID_KEY, JSON.stringify(grid));
      // console.log("Grid auto-saved to Redis");
    } catch (e) {
      console.error("Auto-save failed:", e);
    }
  }, 10_000); // toutes les 10s
})();
