// src/pages/api/guildMemberRemove.ts
import prisma from "@/lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
import Redis from "ioredis";

const pub = new Redis();

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
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      console.error(
        "[guildMemberRemove] (FR) utilisateur non trouvé :",
        userId,
      );
      return res.status(404).json({ error: "User not found" });
    }

    console.log(
      "[guildMemberRemove] (FR) Suppression des sessions pour",
      userId,
    );
    await prisma.session.deleteMany({ where: { userId } });

    console.log(
      "[guildMemberRemove] (FR) Mise à jour de joinGuild=false pour l'utilisateur",
      userId,
    );
    await prisma.user.update({
      where: { id: userId },
      data: { joinGuild: false },
    });

    console.log(
      "[guildMemberRemove] (FR) Publication du logout Redis pour",
      userId,
    );
    const published = await pub.publish("logout", JSON.stringify({ userId }));
    console.log(
      "[guildMemberRemove] (FR) Retour de la publication Redis :",
      published,
    );

    return res.status(200).json({ success: true, published });
  } catch (error) {
    console.error("[guildMemberRemove] (FR) erreur :", error);
    return res.status(500).json({ error: "Failed to remove user" });
  }
}
