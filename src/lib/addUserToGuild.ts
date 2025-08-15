export default async function addUserToGuild(
  userToken: string,
  userId: string,
) {
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_CLIENT_TOKEN;

  if (!guildId || !botToken) {
    console.error(
      "DISCORD_GUILD_ID ou DISCORD_CLIENT_TOKEN manquant(e) dans les env.",
    );
    throw new Error("Configuration Discord manquante");
  }

  // Debug minimal (NE PAS LOGGER LE TOKEN EN PROD)
  console.log("Ajout de l'utilisateur au serveur Discord:", {
    userId,
    guildId,
  });

  const url = `https://discord.com/api/v10/guilds/${guildId}/members/${userId}`;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ access_token: userToken }),
  });

  if (!res.ok) {
    const text = await res.text();
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }

    if (typeof json !== "object" || json === null) {
      console.error("Unexpected response format:", json);
    }
    console.error("Erreur API Discord - status:", res.status, "body:", json);
    throw new Error(`Discord API error ${res.status}: ${JSON.stringify(json)}`);
  }
}
