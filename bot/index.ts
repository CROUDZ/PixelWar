import { Client as DiscordClient, Collection } from "discord.js";
import loadCommands from "./Loader/loadCommands.js";
import loadEvents from "./Loader/loadEvents.js";
import loadButtons from "./Loader/loadButtons.js";
import express from "express";
import type { Application as ExpressApplication } from "express-serve-static-core"; // Renamed to avoid confusion
import loadMiddlewares from "./middlewares.js";

import "dotenv/config";

// Extend Client interface to add custom properties
declare module "discord.js" {
  interface Client {
    commands: Collection<
      string,
      {
        execute: (...args: unknown[]) => void;
        data: { name: string; description: string };
      }
    >;
    buttons: Collection<
      string,
      {
        execute: (...args: unknown[]) => void;
      }
    >;
    app: ExpressApplication; // Explicitly type this as `ExpressApplication`
  }
}

const app: ExpressApplication = express(); // Correct typing for Express app
loadMiddlewares(app);

const client: DiscordClient = new DiscordClient({ intents: 53608447 });
client.commands = new Collection();
client.buttons = new Collection();
client.app = app;

app.locals.discordClient = client;

(async () => {
  await loadCommands(client);
  await loadEvents(client);
  await loadButtons(client);
})();

app.listen(3001, "127.0.0.1", () => {
  console.log(`Server is running on port 3001`);
});

console.log("DISCORD_CLIENT_TOKEN:", process.env.DISCORD_CLIENT_TOKEN);

if (!process.env.DISCORD_CLIENT_TOKEN) {
  console.error(
    "Error: DISCORD_CLIENT_TOKEN is not set in environment variables.",
  );
  process.exit(1);
}

client.login(process.env.DISCORD_CLIENT_TOKEN);

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});
