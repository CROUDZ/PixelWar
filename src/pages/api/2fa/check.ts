import { NextApiRequest, NextApiResponse } from "next";
import speakeasy from "speakeasy";
import { getSession } from "next-auth/react";
import prisma from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getSession({ req });

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Token required" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { twoFASecret: true, twoFA: true },
    });

    if (!user?.twoFA || !user?.twoFASecret) {
      return res.status(400).json({ error: "2FA not enabled" });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFASecret,
      encoding: "base32",
      token: token.replace(/\s/g, ""),
      window: 1, // Fenêtre plus stricte pour les actions sensibles
      step: 30,
    });

    if (verified) {
      res.status(200).json({ success: true });
    } else {
      res.status(200).json({ success: false, error: "Invalid token" });
    }
  } catch (error) {
    console.error("Error checking 2FA:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
