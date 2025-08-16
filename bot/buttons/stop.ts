import { ButtonInteraction } from 'discord.js';

const stopButton = {
  id: 'stop', // ID du bouton (correspond à interaction.customId)
  async execute(interaction: ButtonInteraction): Promise<void> {
   console.log('Stop button clicked', interaction.user.id);
  },
};

export default stopButton;
