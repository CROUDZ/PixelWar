// src/pages/api/guildMemberBoostUpdate.ts
import prisma from "@/lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId, boosted } = req.body;
  if (!userId) return res.status(400).json({ error: "Missing userId" });
  if (!boosted && typeof boosted !== "boolean") {
    return res.status(400).json({ error: "Invalid boosted value" });
  }

  console.log(
    `[guildMemberBoostUpdate] (FR) Mise à jour du statut boost pour l'utilisateur : ${userId}, boosté : ${boosted}`,
  );

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      console.error(
        "[guildMemberBoostUpdate] (FR) utilisateur non trouvé :",
        userId,
      );
      return res.status(404).json({ error: "User not found" });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { boosted },
    });
    console.log(
      `[guildMemberBoostUpdate] (FR) Statut boost mis à jour pour l'utilisateur : ${userId}, boosté : ${boosted}`,
    );
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[guildMemberBoostUpdate] (FR) erreur :", error);
    return res
      .status(500)
      .json({ error: "Failed to update user boost status" });
  }
}
