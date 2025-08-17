import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user?.id) {
      return res.status(401).json({ error: "Non authentifié" });
    }

    const { confirmation } = req.body;

    // Vérifier que l'utilisateur a bien confirmé la suppression
    if (confirmation !== "DELETE_ACCOUNT") {
      return res.status(400).json({ 
        error: "Confirmation de suppression requise" 
      });
    }

    // Supprimer toutes les actions de pixels placées par l'utilisateur
    await prisma.pixelAction.deleteMany({
      where: { userId: session.user.id },
    });

    // Supprimer le compte utilisateur (CASCADE supprimera automatiquement accounts et sessions)
    await prisma.user.delete({
      where: { id: session.user.id },
    });

    return res.status(200).json({ 
      success: true, 
      message: "Compte supprimé avec succès" 
    });
  } catch (error) {
    console.error("Erreur lors de la suppression du compte:", error);
    return res.status(500).json({ 
      error: "Erreur interne du serveur" 
    });
  }
}
