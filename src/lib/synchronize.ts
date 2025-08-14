import prisma from '@/lib/prisma';
import { Guild } from '@/types/discord';

async function refreshDiscordToken(refreshToken: string) {
  const body = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID!,
    client_secret: process.env.DISCORD_CLIENT_SECRET!,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const response = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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
}) {
  const refreshToken = data.refreshToken;
  let accessToken = data.accessToken;
  let discordId = data.discordId;
  let newRefreshToken = refreshToken;
  let profile;

  if (!accessToken) {
    throw new Error('Aucun paramètre n’est renseigné');
  }

  try {
    // 1. Tentative de récupération du profil
    let profileResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    console.log('→ Initial Discord status:', profileResponse.status);

    // Gestion du token expiré
    if (profileResponse.status === 401 && refreshToken) {
      // Rafraîchir les tokens
      const newTokens = await refreshDiscordToken(refreshToken);
      console.log('→ New Discord tokens:', newTokens);

      // Mettre à jour les tokens
      accessToken = newTokens.access_token;
      newRefreshToken = newTokens.refresh_token || refreshToken; // Garder l'ancien si non fourni

      // Réessayer avec le nouveau token
      profileResponse = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      console.log('→ New Discord status:', profileResponse.status);
    }

    // Lire le corps de la réponse une seule fois
    const responseText = await profileResponse.text();
    console.log('→ Discord body:', responseText);

    if (!profileResponse.ok) {
      throw new Error(
        `Erreur Discord [${profileResponse.status}]: ${responseText}`
      );
    }

    profile = JSON.parse(responseText);
  } catch (error) {
    console.error('Erreur réseau:', error);
    throw new Error("Échec de la connexion à l'API Discord");
  }

  discordId = profile.id;

  // 2. Récupération des guildes pour vérifier le membership
  console.log('→ Fetching Discord guilds...');
  const guildsResponse = await fetch(
    'https://discord.com/api/users/@me/guilds',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  console.log('→ Guilds response status:', guildsResponse.status);

  if (!guildsResponse.ok) {
    const guildsErrorText = await guildsResponse.text();
    console.error('Erreur lors de la récupération des guildes Discord:', guildsErrorText);
    throw new Error('Erreur lors de la récupération des guildes Discord');
  }

  const guilds = await guildsResponse.json();
  console.log('→ Guilds:', guilds.map((g: Guild) => g.name));

  // Vérifier si l'utilisateur est dans la guild spécifique
  const targetGuildId = "1278013961987690599";
  const isInGuild = guilds.some((guild: Guild) => guild.id === targetGuildId);
  console.log('→ isInGuild:', isInGuild);

  // 3. Upsert utilisateur avec mise à jour du join_guild
  console.log('→ Upserting user in Prisma...');
  await prisma.user.upsert({
    where: { id: discordId },
    update: {
      username: profile.username,
      email: profile.email,
      image: profile.avatar
        ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
        : null,
      global_name: profile.global_name || null,
      accessToken: accessToken,
      refreshToken: newRefreshToken,
      join_guild: isInGuild,
    },
    create: {
      id: discordId,
      username: profile.username,
      email: profile.email,
      image: profile.avatar
        ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
        : null,
      global_name: profile.global_name || null,
      accessToken: accessToken,
      refreshToken: newRefreshToken,
      join_guild: isInGuild,
    },
  });
  console.log('→ User upsert completed.');
}