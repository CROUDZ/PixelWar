import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.user?.id) {
      return res.status(401).json({ message: 'Non authentifié' });
    }

    const { x, y, color } = req.body;

    // Validation des paramètres
    if (typeof x !== 'number' || typeof y !== 'number' || typeof color !== 'string') {
      return res.status(400).json({ message: 'Paramètres invalides' });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { lastPixelPlaced: true, id: true }
    });

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const now = new Date();
    const COOLDOWN_DURATION = 60 * 1000; // 60 secondes en millisecondes

    // Vérifier le cooldown
    if (user.lastPixelPlaced) {
      const timeSinceLastPixel = now.getTime() - user.lastPixelPlaced.getTime();
      if (timeSinceLastPixel < COOLDOWN_DURATION) {
        const cooldownRemaining = Math.ceil((COOLDOWN_DURATION - timeSinceLastPixel) / 1000);
        return res.status(429).json({ 
          message: 'Cooldown actif', 
          cooldownRemaining 
        });
      }
    }

    // Mettre à jour le lastPixelPlaced et créer l'action
    await prisma.$transaction(async (tx) => {
      // Mettre à jour le timestamp de l'utilisateur
      await tx.user.update({
        where: { id: session.user.id },
        data: { lastPixelPlaced: now }
      });

      // Créer l'action pixel
      await tx.pixelAction.create({
        data: {
          x,
          y,
          colorIndex: 0, // À adapter selon votre système de couleurs
          userId: session.user.id
        }
      });
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Pixel validé avec succès',
      nextCooldown: now.getTime() + COOLDOWN_DURATION
    });

  } catch (error) {
    console.error('Erreur lors de la validation du pixel:', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
}
