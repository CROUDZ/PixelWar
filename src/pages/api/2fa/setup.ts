import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";
import { generateTwoFASecret } from "@/lib/twofa";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Récupérer la session pour obtenir l'ID utilisateur
  const session = await getSession({ req });

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const result = await generateTwoFASecret(
      session.user.id,
      session.user.email || "admin",
    );

    res.status(200).json({
      otpAuthUrl: result.qrCode,
      base32: result.secret, // optionnel pour debug
    });
  } catch (error) {
    console.error("Error setting up 2FA:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
