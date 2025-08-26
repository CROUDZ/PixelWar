import { Events, Client, ApplicationCommandDataResolvable } from "discord.js";

const clientReadyEvent = {
  name: Events.ClientReady,
  async execute(client: Client) {
    await client.application?.commands.set(
      client.commands.map((command) =>
        (
          command.data as unknown as {
            toJSON: () => ApplicationCommandDataResolvable;
          }
        ).toJSON(),
      ) as ApplicationCommandDataResolvable[],
    );

    console.log(`Prêt ! Connecté en tant que ${client.user?.tag}`);
  },
};

export default clientReadyEvent;
