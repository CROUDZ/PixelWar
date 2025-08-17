import speakeasy from "speakeasy";
import prisma from "@/lib/prisma";

export interface TwoFASetupResult {
  secret: string;
  qrCode: string;
  backupCodes?: string[];
}

export async function generateTwoFASecret(
  userId: string,
  email: string,
): Promise<TwoFASetupResult> {
  const secret = speakeasy.generateSecret({
    name: `PixelWar Admin (${email})`,
    issuer: "PixelWar",
    length: 32, // Plus de sécurité avec 32 caractères
  });

  // Sauvegarder le secret en base
  await prisma.user.update({
    where: { id: userId },
    data: { twoFASecret: secret.base32 },
  });

  return {
    secret: secret.base32,
    qrCode: secret.otpauth_url || "",
  };
}

export async function verifyTwoFAToken(
  userId: string,
  token: string,
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFASecret: true },
  });

  if (!user?.twoFASecret) {
    return false;
  }

  return speakeasy.totp.verify({
    secret: user.twoFASecret,
    encoding: "base32",
    token: token.replace(/\s/g, ""), // Supprimer les espaces
    window: 2, // Fenêtre de tolérance
    step: 30,
  });
}

export async function enableTwoFA(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { twoFA: true },
  });
}

export async function disableTwoFA(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFA: false,
      twoFASecret: null,
    },
  });
}
