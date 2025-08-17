import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { synchronize } from "@/lib/synchronize";
import prisma from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user?.id) {
      return res.status(401).json({ error: "Non authentifié" });
    }

    // Récupérer l'utilisateur avec ses tokens
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        accessToken: true,
        refreshToken: true,
        lastSyncAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    if (!user.accessToken || !user.refreshToken) {
      return res.status(400).json({ 
        error: "Tokens Discord manquants. Veuillez vous reconnecter." 
      });
    }

    // Vérifier le cooldown de 10 minutes
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    
    if (user.lastSyncAt && user.lastSyncAt > tenMinutesAgo) {
      const remainingTime = Math.ceil((user.lastSyncAt.getTime() + 10 * 60 * 1000 - now.getTime()) / 1000);
      const minutes = Math.floor(remainingTime / 60);
      const seconds = remainingTime % 60;
      
      return res.status(429).json({ 
        error: `Cooldown actif. Attendez encore ${minutes}m ${seconds}s`,
        remainingSeconds: remainingTime
      });
    }

    // Effectuer la synchronisation
    await synchronize({
      refreshToken: user.refreshToken,
      accessToken: user.accessToken,
      discordId: session.user.id,
      prismaUserId: user.id,
    });

    // Mettre à jour la date de dernière synchronisation
    await prisma.user.update({
      where: { id: session.user.id },
      data: { lastSyncAt: now },
    });

    return res.status(200).json({ 
      success: true, 
      message: "Synchronisation réussie",
      nextSyncAvailable: new Date(now.getTime() + 10 * 60 * 1000)
    });

  } catch (error) {
    console.error("Erreur lors de la synchronisation:", error);
    return res.status(500).json({ 
      error: "Erreur lors de la synchronisation" 
    });
  }
}
