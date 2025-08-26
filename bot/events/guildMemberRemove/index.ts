import { Events, Client, GuildMember } from "discord.js";

const ENV = process.env.NODE_ENV || "development";
const API_URL =
  ENV === "production"
    ? "https://pixelwar-hubdurp.fr"
    : "http://localhost:3000";

const guildMemberRemoveEvent = {
  name: Events.GuildMemberRemove,
  async execute(client: Client, member: GuildMember) {
    console.log(`Utilisateur a quitté le serveur : ${member.user.tag}`);

    // Appel à l'API pour mettre à jour joinGuild
    try {
      await fetch(`${API_URL}/api/guildMemberRemove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: member.id }),
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
