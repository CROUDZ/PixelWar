import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  Client,
} from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong!"),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply(
      `Ping : \`${(interaction.client as Client).ws.ping}\`ms`,
    );
  },
};
