import {
  Events,
  MessageFlags,
  Interaction,
  Client,
  CommandInteraction,
  ButtonInteraction,
} from 'discord.js';

const interactionCreateEvent = {
  name: Events.InteractionCreate,
  async execute(client: Client, interaction: Interaction) {
    // Gestion des commandes slash
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        console.error(
          `No command matching ${interaction.commandName} was found.`
        );
        return;
      }
      try {
        // Exemple d'utilisation des options avec assertion de type :
        const options = (command as { options?: unknown }).options;
        await command.execute(
          interaction as CommandInteraction,
          options
        );
      } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: 'There was an error while executing this command!',
            flags: MessageFlags.Ephemeral,
          });
        } else {
          await interaction.reply({
            content: 'There was an error while executing this command!',
            flags: MessageFlags.Ephemeral,
          });
        }
      }
    }
    // Gestion des boutons
    else if (interaction.isButton()) {
      console.log(interaction.customId);
      const button = interaction.client.buttons.get(interaction.customId);
      if (!button) {
        console.error(`No button matching ${interaction.customId} was found.`);
        return;
      }
      try {
        await button.execute(interaction as ButtonInteraction);
      } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: 'There was an error while executing this button!',
            flags: MessageFlags.Ephemeral,
          });
        } else {
          await interaction.reply({
            content: 'There was an error while executing this button!',
            flags: MessageFlags.Ephemeral,
          });
        }
      }
    }
    // Vous pouvez gérer ici d'autres types d'interactions (menus, modals, etc.)
  },
};

export default interactionCreateEvent;
