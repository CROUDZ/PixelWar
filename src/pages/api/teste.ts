import type { NextApiRequest, NextApiResponse } from 'next';
import { synchronize } from '@/lib/synchronize';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { accessToken, refreshToken, discordId } = req.body;

  if (!accessToken || !refreshToken || !discordId) {
    return res.status(400).json({ error: 'Paramètres manquants' });
  }

  try {
    await synchronize({ accessToken, refreshToken, discordId });
    return res.status(200).json({ success: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur serveur';
    return res.status(500).json({ error: errorMessage });
  }
}
