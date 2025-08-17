import {
  CommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} from "discord.js";

const linkCommand = {
  data: new SlashCommandBuilder()
    .setName("link_message")
    .setDescription("Envoie un message visible uniquement par les admins.")
    .setDefaultMemberPermissions(0),
  async execute(interaction: CommandInteraction) {
    if (!interaction.memberPermissions?.has("Administrator")) {
      await interaction.reply({
        content: "Vous n'avez pas la permission d'utiliser cette commande.",
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor("#acfaf5")
      .setTitle("Pour lier votre compte Discord à PixelWar")
      .setDescription(
        "Cliquez sur le bouton ci-dessous pour lier votre compte Discord à PixelWar.",
      )
      .setFooter({ text: "PixelWar - Lien de compte" });

    const button = new ButtonBuilder()
      .setCustomId("link")
      .setLabel("Lier mon compte")
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

    await interaction.reply({
      embeds: [embed],
      components: [row],
    });
  },
};
export default linkCommand;
