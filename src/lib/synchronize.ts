// @ts-expect-error: prisma.mjs est en JS, TS ne peut pas inférer le type
import prismaJs from "./prisma.mjs";
import type { Guild } from "@/types/discord";
import type { DiscordProfile } from "@/types/discord";

// @ts-expect-error: prisma.mjs est en JS, TS ne peut pas inférer le type
const prisma = prismaJs;

const guildId = process.env.DISCORD_GUILD_ID || "1278013961987690599"; // ID du serveur Discord

async function refreshDiscordToken(refreshToken: string) {
  const body = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID!,
    client_secret: process.env.DISCORD_CLIENT_SECRET!,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Échec du rafraîchissement: ${error}`);
  }

  return await response.json();
}

export async function synchronize(data: {
  refreshToken: string;
  accessToken: string;
  discordId: string;
  prismaUserId?: string; // nouvel argument optionnel : l'id prisma du user à mettre à jour
}) {
  const { refreshToken, accessToken: initialAccessToken, discordId } = data;
  let accessToken = initialAccessToken;
  let newRefreshToken = refreshToken;
  let profile: DiscordProfile;

  if (!accessToken) {
    throw new Error("Aucun access token fourni");
  }

  try {
    let profileResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (profileResponse.status === 401 && refreshToken) {
      const newTokens = await refreshDiscordToken(refreshToken);
      accessToken = newTokens.access_token;
      newRefreshToken = newTokens.refresh_token || refreshToken;

      profileResponse = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    }

    const text = await profileResponse.text();
    if (!profileResponse.ok) {
      throw new Error(`Erreur Discord [${profileResponse.status}]: ${text}`);
    }
    profile = JSON.parse(text);
  } catch (err) {
    console.error("Erreur réseau dans synchronize:", err);
    throw new Error("Échec de la connexion à l'API Discord");
  }

  // récupération des guildes
  const guildsResponse = await fetch(
    "https://discord.com/api/users/@me/guilds",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!guildsResponse.ok) {
    const guildsErrorText = await guildsResponse.text();
    console.error(
      "Erreur lors de la récupération des guildes Discord:",
      guildsErrorText,
    );
    throw new Error("Erreur lors de la récupération des guildes Discord");
  }

  const guilds = await guildsResponse.json();
  const isInGuild = guilds.some((g: Guild) => g.id === guildId);

  const guildMemberResponse = await fetch(
  `https://discord.com/api/guilds/${guildId}/members/${discordId}`,
  {
    headers: { Authorization: `Bearer ${accessToken}` },
  }
);

let boosted = false;

if (guildMemberResponse.ok) {
  const memberData = await guildMemberResponse.json();
  boosted = !!memberData.premium_since; // true si boost, false sinon
} else {
  // si on ne peut pas récupérer le membre (pas dans la guilde ou pas les droits)
  boosted = false;
}

  // Si prismaUserId existe, mettre à jour l'utilisateur existant (c'est la bonne pratique)
  if (data.prismaUserId) {
    await prisma.user.update({
      where: { id: data.prismaUserId },
      data: {
        // ne change pas l'id Prisma
        username: profile.username,
        email: profile.email ?? undefined,
        image: profile.avatar
          ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
          : null,
        global_name: profile.global_name || null,
        accessToken: accessToken,
        refreshToken: newRefreshToken,
        expires: undefined, // si tu veux stocker expires, mappe account.expires_at
        joinGuild: isInGuild,
        boosted
      },
    });
    return;
  }

  // si prismaUserId absent : fallback — upsert par email si possible (éviter upsert par id=discordId)
  if (profile.email) {
    await prisma.user.upsert({
      where: { email: profile.email },
      update: {
        username: profile.username,
        image: profile.avatar
          ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
          : null,
        global_name: profile.global_name || null,
        accessToken,
        refreshToken: newRefreshToken,
        joinGuild: isInGuild,
        boosted
      },
      create: {
        id: discordId, // si tu veux absolument garder l'id discord, ok (optionnel)
        username: profile.username,
        email: profile.email,
        image: profile.avatar
          ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
          : null,
        global_name: profile.global_name || null,
        accessToken,
        refreshToken: newRefreshToken,
        joinGuild: isInGuild,
        boosted
      },
    });
    return;
  }

  // dernière option: si pas d'email, crée ou update par discordId (moins souhaitable si NextAuth gère id autrement)
  await prisma.user.upsert({
    where: { id: discordId },
    update: {
      username: profile.username,
      image: profile.avatar
        ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
        : null,
      global_name: profile.global_name || null,
      accessToken,
      refreshToken: newRefreshToken,
      joinGuild: isInGuild,
      boosted
    },
    create: {
      id: discordId,
      username: profile.username,
      image: profile.avatar
        ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
        : null,
      global_name: profile.global_name || null,
      accessToken,
      refreshToken: newRefreshToken,
      joinGuild: isInGuild,
      boosted
    },
  });
}
