// pages/api/me.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma"; // adapte le chemin
import { authOptions } from "@/lib/auth"; // adapte le chemin vers tes next-auth options

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Not authenticated" });

  // récupère le user dans la BDD
  const user = await prisma.user.findUnique({
    where: { id: session.user.id }, // ou where: { email: session.user.email } selon ton schema
    select: { id: true, linked: true },
  });

  return res.status(200).json({
    id: user?.id ?? null,
    linked: !!user?.linked,
  });
}
