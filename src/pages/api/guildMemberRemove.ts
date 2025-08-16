import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
console.log('Received request to /api/guildMemberRemove');
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { joinGuild: false },
    });

    return res.status(200).json({ success: true, user });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update user', details: error });
  }
}
