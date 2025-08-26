// bot/buttons/link.ts
import { ButtonInteraction } from "discord.js";
import { Redis } from "ioredis";

const redis = new Redis();

redis.on("connect", () => console.log("[Redis] Connexion réussie (bot)"));
redis.on("error", (e) => console.error("[Redis] erreur (bot) :", e));

const linkButton = {
  id: "link",
  async execute(interaction: ButtonInteraction): Promise<void> {
    const userId = interaction.user.id;
    console.log("[Bouton Cliqué] userId :", userId);
    try {
      const count = await redis.publish(
        "link",
        JSON.stringify({ userId, ts: Date.now() }),
      );
      console.log("[Redis] Message publié, abonnés :", count);
      console.log(
        "[DEBUG] (FR) Publication Redis effectuée pour l'utilisateur :",
        userId,
      );
    } catch (e) {
      console.error("[Redis] Erreur lors de la publication :", e);
    }
    await interaction.reply({
      content: "Demande de liaison envoyée.",
      ephemeral: true,
    });
    console.log(
      "[DEBUG] (FR) Réponse envoyée à l'utilisateur Discord :",
      userId,
    );
  },
};

export default linkButton;
