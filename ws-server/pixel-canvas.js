// pixel-canvas.js
export class PixelCanvas {
  constructor(width, height, snapshot) {
    this.width = width;
    this.height = height;
    this.buf = snapshot?.slice() ?? new Uint8Array(width * height);
    this.chunkSize = 128;
    this.chunksWide = Math.ceil(width / this.chunkSize);
    this.chunksHigh = Math.ceil(height / this.chunkSize);
    this.dirtyChunks = new Set();
  }

  index(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) {
      throw new RangeError(`Pixel hors limites (${x}, ${y})`);
    }
    return y * this.width + x;
  }

  chunkIndexFor(x, y) {
    const cx = Math.floor(x / this.chunkSize);
    const cy = Math.floor(y / this.chunkSize);
    return cy * this.chunksWide + cx;
  }

  getPixel(x, y) {
    return this.buf[this.index(x, y)];
  }

  setPixel(x, y, color) {
    if (color < 0 || color > 255) return false;
    const i = this.index(x, y);
    if (this.buf[i] === color) return false; // pas de changement
    this.buf[i] = color;
    this.dirtyChunks.add(this.chunkIndexFor(x, y));
    return true;
  }

  // Mises à jour en lot (réduit la contention/broadcast)
  applyBatch(updates) {
    let changed = 0;
    for (const u of updates) {
      if (this.setPixel(u.x, u.y, u.color)) changed++;
    }
    return changed;
  }

  // Récupérer un chunk (pour primo-chargement ou resync)
  getChunk(cx, cy) {
    if (cx < 0 || cy < 0 || cx >= this.chunksWide || cy >= this.chunksHigh) {
      throw new RangeError(`Chunk hors limites (${cx}, ${cy})`);
    }
    const x0 = cx * this.chunkSize;
    const y0 = cy * this.chunkSize;
    const w = Math.min(this.chunkSize, this.width - x0);
    const h = Math.min(this.chunkSize, this.height - y0);

    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      const srcStart = (y0 + y) * this.width + x0;
      out.set(this.buf.subarray(srcStart, srcStart + w), y * w);
    }
    return { cx, cy, data: out };
  }

  // Diff simple : liste des chunks modifiés depuis la dernière lecture
  drainDirtyChunks() {
    const list = Array.from(this.dirtyChunks);
    this.dirtyChunks.clear();
    return list;
  }

  // Snapshot binaire complet (pour sauvegarde disque/Redis)
  snapshot() {
    return this.buf.slice();
  }

  // Restauration depuis snapshot
  restore(data) {
    if (data.length !== this.buf.length) {
      throw new Error(
        `Snapshot size mismatch: ${data.length} != ${this.buf.length}`,
      );
    }
    this.buf.set(data);
    // marque tout dirty pour resync si besoin
    for (let cy = 0; cy < this.chunksHigh; cy++) {
      for (let cx = 0; cx < this.chunksWide; cx++) {
        this.dirtyChunks.add(cy * this.chunksWide + cx);
      }
    }
  }
}
