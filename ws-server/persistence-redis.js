// lib/persistence-redis.ts
import { createClient } from "redis";

const KEY = "pixelwar:canvas:v1";

/**
 * Save the binary snapshot of the canvas to Redis as a Buffer.
 * canvas.snapshot() must return a Uint8Array.
 */
export async function saveToRedis(canvas, url = "redis://127.0.0.1:6379") {
  const client = createClient(url ? { url } : {});
  client.on("error", (err) => {
    // avoid unhandled error events
    console.error("redis(saveToRedis) error:", err);
  });
  await client.connect();
  try {
    const snap = canvas.snapshot(); // Uint8Array
    if (!(snap instanceof Uint8Array)) {
      throw new TypeError(
        "saveToRedis: canvas.snapshot() must return a Uint8Array",
      );
    }
    // Convert to Node Buffer (required by node-redis)
    const buf = Buffer.from(snap);
    await client.set(KEY, buf);
  } finally {
    try {
      await client.quit();
    } catch (e) {
      // ignore
    }
  }
}

/**
 * Load binary snapshot from Redis and return Uint8Array or undefined.
 * Validates length === width*height.
 */
export async function loadFromRedis(
  width,
  height,
  url = "redis://127.0.0.1:6379",
) {
  const client = createClient(url ? { url } : {});
  client.on("error", (err) => {
    console.error("redis(loadFromRedis) error:", err);
  });
  await client.connect();
  try {
    // getBuffer returns Buffer | null
    // node-redis exposes .getBuffer; if not available, use get and Buffer.from
    // we try getBuffer first (works in v4)
    const buf =
      typeof client.getBuffer === "function"
        ? await client.getBuffer(KEY)
        : await client.get(KEY);
    if (!buf) return undefined;

    // ensure we have a Buffer
    const buffer = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
    if (buffer.length !== width * height) {
      throw new Error(
        `snapshot size mismatch: ${buffer.length} != ${width * height}`,
      );
    }
    return new Uint8Array(buffer);
  } finally {
    try {
      await client.quit();
    } catch (e) {
      // ignore
    }
  }
}
