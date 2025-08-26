import { Events, Client, GuildMember } from "discord.js";

const ENV = process.env.NODE_ENV || "development";
const API_URL =
  ENV === "production"
    ? "https://pixelwar-hubdurp.fr"
    : "http://localhost:3000";

const guildMemberRemoveEvent = {
  name: Events.GuildMemberRemove,
  async execute(
    client: Client,
    oldMember: GuildMember,
    newMember: GuildMember,
  ) {
    let boosted: boolean = false;

    if (!oldMember.premiumSince && newMember.premiumSince) {
      boosted = true;
      console.log(`Utilisateur a boosté le serveur : ${newMember.user.tag}`);
    }
    if (newMember.premiumSince && !oldMember.premiumSince) {
      boosted = false;
      console.log(
        `Utilisateur a retiré son boost du serveur : ${newMember.user.tag}`,
      );
    }

    try {
      await fetch(`${API_URL}/api/guildMemberBoostUpdate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: newMember.id, boosted: boosted }),
      });
    } catch (error) {
      console.error(
        "Échec de la notification à l'API concernant le retrait du membre du serveur :",
        error,
      );
    }
  },
};

export default guildMemberRemoveEvent;
