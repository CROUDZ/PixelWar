// bot/buttons/link.ts
import { ButtonInteraction } from "discord.js";
import { Redis } from "ioredis";

const redis = new Redis();

redis.on("connect", () => console.log("[Redis] Connected successfully (bot)"));
redis.on("error", (e) => console.error("[Redis] error (bot):", e));

const linkButton = {
  id: "link",
  async execute(interaction: ButtonInteraction): Promise<void> {
    const userId = interaction.user.id;
    console.log("[Button Click] userId:", userId);
    try {
      const count = await redis.publish(
        "link",
        JSON.stringify({ userId, ts: Date.now() }),
      );
      console.log("[Redis] Published message, subscribers:", count);
    } catch (e) {
      console.error("[Redis] Publish error:", e);
    }
    await interaction.reply({
      content: "Demande de liaison envoyée.",
      ephemeral: true,
    });
  },
};

export default linkButton;
