import { NextApiRequest, NextApiResponse } from "next";
import { verifyTwoFAToken, enableTwoFA } from "@/lib/twofa";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { token, id } = req.body;

  if (!token || !id) {
    return res.status(400).json({ error: "Token and user ID required" });
  }

  try {
    console.log("Verifying 2FA for user ID:", id, "with token:", token);

    const verified = await verifyTwoFAToken(id, token);

    console.log("2FA verification result:", verified, "for user ID:", id);

    if (verified) {
      // Activer la 2FA et marquer comme vérifié
      await enableTwoFA(id);

      console.log("2FA successfully activated for user ID:", id);
      res.status(200).json({ success: true });
    } else {
      res.status(200).json({ success: false });
    }
  } catch (error) {
    console.error("Error verifying 2FA:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
