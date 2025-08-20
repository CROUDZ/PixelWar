import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createClient } from "redis";

const client = createClient(
  process.env.REDIS_URL ? { url: process.env.REDIS_URL } : {}
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Vérifier le token 2FA si nécessaire
    if (!session.user.twoFA) {
      return res.status(403).json({ error: "2FA required" });
    }

    const { confirmationToken } = req.body;
    
    // Vérifier que l'utilisateur a fourni le token de confirmation
    if (confirmationToken !== "CLEAR_CANVAS_CONFIRM") {
      return res.status(400).json({ error: "Invalid confirmation token" });
    }

    // Se connecter à Redis
    if (!client.isOpen) {
      await client.connect();
    }

    const GRID_KEY = process.env.GRID_KEY || "pixel-grid";
    const QUEUE_KEY = process.env.QUEUE_KEY || "pixel-queue";
    const BINARY_KEY = "pixelwar:canvas:v1"; // Clé pour la persistance binaire
    const WIDTH = Number(process.env.GRID_WIDTH || 100);
    const HEIGHT = Number(process.env.GRID_HEIGHT || 100);
    const DEFAULT_COLOR = process.env.DEFAULT_COLOR || "#FFFFFF";

    console.log(`[ADMIN] Starting canvas clear by user ${session.user.id} (${session.user.email})`);

    // 1. Créer une grille vide (format legacy JSON pour compatibilité)
    const emptyGrid = new Array(WIDTH * HEIGHT).fill(DEFAULT_COLOR);

    // 2. Créer un buffer binaire vide (tous les pixels à l'ID 0 = couleur par défaut)
    const emptyBinaryGrid = new Uint8Array(WIDTH * HEIGHT); // Rempli de 0 par défaut

    // 3. ATOMIQUE : Nettoyer toutes les données Redis
    const multi = client.multi();
    
    // Supprimer l'ancienne grille JSON
    multi.del(GRID_KEY);
    
    // Supprimer la grille binaire
    multi.del(BINARY_KEY);
    
    // Vider complètement la queue Redis
    multi.del(QUEUE_KEY);
    
    // Créer la nouvelle grille JSON vide
    multi.set(GRID_KEY, JSON.stringify(emptyGrid));
    
    // Créer la nouvelle grille binaire vide
    multi.set(BINARY_KEY, Buffer.from(emptyBinaryGrid));
    
    await multi.exec();

    // 4. Supprimer toutes les actions de pixels de la base de données
    const deletedPixels = await prisma.pixelAction.deleteMany();
    console.log(`[ADMIN] Deleted ${deletedPixels.count} pixel actions from database`);

    // 5. Publier un message Redis pour notifier le serveur WebSocket
    const clearMessage = {
      adminId: session.user.id,
      timestamp: Date.now(),
      width: WIDTH,
      height: HEIGHT,
      defaultColor: DEFAULT_COLOR,
      grid: emptyGrid // Inclure la grille vide pour synchronisation immédiate
    };

    await client.publish("canvas-clear", JSON.stringify(clearMessage));

    console.log(`[ADMIN] Canvas cleared successfully - Redis and DB cleaned, WebSocket notified`);

    await client.quit();

    return res.status(200).json({ 
      success: true, 
      message: "Canvas cleared successfully",
      clearedBy: session.user.email,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error clearing canvas:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      details: process.env.NODE_ENV === "development" ? String(error) : undefined
    });
  }
}
