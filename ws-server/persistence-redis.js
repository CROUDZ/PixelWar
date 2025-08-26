// lib/persistence-redis.ts
import { createClient } from "redis";

const KEY = "pixelwar:canvas:v1";

/**
 * Sauvegarde l'instantané binaire du canvas dans Redis sous forme de Buffer.
 * canvas.snapshot() doit retourner un Uint8Array.
 */
export async function saveToRedis(canvas, url = "redis://127.0.0.1:6379") {
  const client = createClient(url ? { url } : {});
  client.on("error", (err) => {
    // éviter les événements d'erreur non gérés
    console.error("redis(saveToRedis) erreur :", err);
  });
  await client.connect();
  try {
    const snap = canvas.snapshot(); // Uint8Array
    if (!(snap instanceof Uint8Array)) {
      throw new TypeError(
        "saveToRedis: canvas.snapshot() doit retourner un Uint8Array",
      );
    }
    // Convertir en Node Buffer (requis par node-redis)
    const buf = Buffer.from(snap);
    await client.set(KEY, buf);
  } finally {
    try {
      await client.quit();
    } catch {
      // ignorer
    }
  }
}

/**
 * Charge l'instantané binaire depuis Redis et retourne un Uint8Array ou undefined.
 * Valide que la longueur === width*height.
 */
export async function loadFromRedis(
  width,
  height,
  url = "redis://127.0.0.1:6379",
) {
  const client = createClient(url ? { url } : {});
  client.on("error", (err) => {
    console.error("redis(loadFromRedis) erreur :", err);
  });
  await client.connect();
  try {
    // getBuffer retourne Buffer | null
    // node-redis expose .getBuffer ; si non disponible, utiliser get et Buffer.from
    // on essaie getBuffer d'abord (fonctionne en v4)
    const buf =
      typeof client.getBuffer === "function"
        ? await client.getBuffer(KEY)
        : await client.get(KEY);
    if (!buf) return undefined;

    // assurer que nous avons un Buffer
    const buffer = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
    if (buffer.length !== width * height) {
      throw new Error(
        `mismatch de taille d'instantané : ${buffer.length} != ${width * height}`,
      );
    }
    return new Uint8Array(buffer);
  } finally {
    try {
      await client.quit();
    } catch {
      // ignorer
    }
  }
}
