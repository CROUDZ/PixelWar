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
    console.log("[guildMemberRemove] deleting sessions for", userId);
    await prisma.session.deleteMany({ where: { userId } });

    console.log("[guildMemberRemove] update user joinGuild=false for", userId);
    await prisma.user.update({
      where: { id: userId },
      data: { joinGuild: false },
    });

    console.log("[guildMemberRemove] publishing redis logout for", userId);
    const published = await pub.publish("logout", JSON.stringify({ userId }));
    console.log("[guildMemberRemove] redis publish returned:", published);

    return res.status(200).json({ success: true, published });
  } catch (error) {
    console.error("[guildMemberRemove] error:", error);
    return res.status(500).json({ error: "Failed to remove user" });
  }
}
