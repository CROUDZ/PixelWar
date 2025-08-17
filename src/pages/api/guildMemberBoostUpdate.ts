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
    `[guildMemberBoostUpdate] Updating boost status for user: ${userId}, boosted: ${boosted}`,
  );

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { boosted },
    });
    console.log(
      `[guildMemberBoostUpdate] Updated boost status for user: ${userId}, boosted: ${boosted}`,
    );
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[guildMemberBoostUpdate] error:", error);
    return res
      .status(500)
      .json({ error: "Failed to update user boost status" });
  }
}
