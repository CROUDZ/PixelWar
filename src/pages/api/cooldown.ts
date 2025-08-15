import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.user?.id) {
      return res.status(401).json({ message: 'Non authentifié' });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { lastPixelPlaced: true }
    });

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const now = new Date();
    const COOLDOWN_DURATION = 60 * 1000; // 60 secondes en millisecondes

    if (!user.lastPixelPlaced) {
      // Aucun pixel placé précédemment
      return res.status(200).json({ cooldownRemaining: 0 });
    }

    const timeSinceLastPixel = now.getTime() - user.lastPixelPlaced.getTime();
    const cooldownRemaining = Math.max(0, COOLDOWN_DURATION - timeSinceLastPixel);

    return res.status(200).json({ 
      cooldownRemaining: Math.ceil(cooldownRemaining / 1000) // en secondes
    });

  } catch (error) {
    console.error('Erreur lors de la vérification du cooldown:', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
}
