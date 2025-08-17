import { NextApiRequest, NextApiResponse } from 'next';
import  prisma from '@/lib/prisma';
import speakeasy from "speakeasy";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'PUT') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, newRole } = req.body;

    if (!email || !newRole || !['USER', 'ADMIN'].includes(newRole)) {
        return res.status(400).json({ error: 'Invalid input' });
    }

    try {
        let secret = null;
        if (newRole === 'ADMIN') {
            secret = speakeasy.generateSecret({ name: `PixelWar Admin` });
        }

        const updatedUser = await prisma.user.update({
            where: { email: email },
            data: { role: newRole, twoFASecret: secret ? secret.base32 : null },
        });

        

        return res.status(200).json({ message: 'User role updated successfully', user: updatedUser });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'An error occurred while updating the user role' });
    }
}