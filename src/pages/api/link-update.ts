import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    console.log(
      "[API] (FR) Mise à jour du champ linked pour l'utilisateur :",
      userId,
    );
    await prisma.user.update({
      where: { id: userId },
      data: { linked: true, joinGuild: true },
    });

    console.log("[API] (FR) Mise à jour réussie :", userId);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("[API] (FR) Erreur de mise à jour Prisma :", err);
    res.status(500).json({ error: "Database update failed" });
  }
}
