import { Events, Client, GuildMember } from "discord.js";

const ENV = process.env.NODE_ENV || "development";
const API_URL = ENV === "production" ? "https://pixelwar-hubdurp.fr" : "http://localhost:3000";

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
      console.log(`User boosted the server: ${newMember.user.tag}`);
    }
    if (newMember.premiumSince && !oldMember.premiumSince) {
      boosted = false;
      console.log(`User removed boost from the server: ${newMember.user.tag}`);
    }

    try {
      await fetch(`${API_URL}/api/guildMemberBoostUpdate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: newMember.id, boosted: boosted }),
      });
    } catch (error) {
      console.error("Failed to notify API about guild member removal:", error);
    }
  },
};

export default guildMemberRemoveEvent;
