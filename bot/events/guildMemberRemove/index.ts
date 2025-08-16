import { Events, Client, GuildMember } from "discord.js";

const guildMemberRemoveEvent = {
  name: Events.GuildMemberRemove,
  async execute(client: Client, member: GuildMember) {
    console.log(`User left the server: ${member.user.tag}`);

    // Appel à l'API pour mettre à jour joinGuild
    try {
      await fetch("http://localhost:3000/api/guildMemberRemove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: member.id }),
      });
    } catch (error) {
      console.error("Failed to notify API about guild member removal:", error);
    }
  },
};

export default guildMemberRemoveEvent;
