import { Events, Client } from 'discord.js';

export default {
  name: Events.ClientReady,
  async execute(client: Client) {
    await client.application?.commands.set(
      client.commands.map((command) => command.data.toJSON())
    );

    console.log(`Ready! Logged in as ${client.user?.tag}`);
  },
};
