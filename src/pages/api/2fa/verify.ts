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
    console.log(
      "Vérification de la 2FA pour l'utilisateur ID :",
      id,
      "avec le token :",
      token,
    );

    const verified = await verifyTwoFAToken(id, token);

    console.log(
      "Résultat de la vérification 2FA :",
      verified,
      "pour l'utilisateur ID :",
      id,
    );

    if (verified) {
      // Activer la 2FA et marquer comme vérifié
      await enableTwoFA(id);

      console.log("2FA activée avec succès pour l'utilisateur ID :", id);
      res.status(200).json({ success: true });
    } else {
      res.status(200).json({ success: false });
    }
  } catch (error) {
    console.error("Erreur lors de la vérification de la 2FA :", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
