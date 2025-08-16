import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { Client } from "discord.js"; // Assurez-vous d'importer le type Client de discord.js

// Reconstruction de __dirname pour les modules ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const commandsPath = path.join(__dirname, "../commands");

interface Command {
  default: {
    data: {
      name: string;
      description: string;
    };
    execute: (...args: unknown[]) => void;
  };
}

const loadCommands = async (client: Client): Promise<void> => {
  console.log(`[INFO] Chargement des commandes...`);
  const items = fs.readdirSync(commandsPath);
  console.log(`[INFO] Chargement des commandes depuis ${commandsPath}`);

  const promises: Promise<void>[] = [];

  for (const item of items) {
    const itemPath = path.join(commandsPath, item);

    if (fs.lstatSync(itemPath).isDirectory()) {
      const commandFiles = fs
        .readdirSync(itemPath)
        .filter((file) => file.endsWith(".ts") || file.endsWith(".js"));

      for (const file of commandFiles) {
        const filePath = path.join(itemPath, file);
        const promise = import(pathToFileURL(filePath).toString())
          .then((command: Command) => {
            if (
              command.default?.data &&
              typeof command.default?.execute === "function"
            ) {
              client.commands.set(command.default.data.name, command.default);
            } else {
              console.error(
                `[WARNING] Commande dans ${filePath} manque "data" ou "execute"`,
              );
            }
          })
          .catch((err) =>
            console.error(`[ERROR] Impossible d'importer ${filePath}:`, err),
          );
        promises.push(promise);
      }
    } else if (item.endsWith(".ts") || item.endsWith(".js")) {
      const promise = import(pathToFileURL(itemPath).toString())
        .then((command: Command) => {
          if (
            command.default?.data &&
            typeof command.default?.execute === "function"
          ) {
            client.commands.set(command.default.data.name, command.default);
          } else {
            console.error(
              `[WARNING] Commande dans ${itemPath} manque "data" ou "execute"`,
            );
          }
        })
        .catch((err) =>
          console.error(`[ERROR] Impossible d'importer ${itemPath}:`, err),
        );
      promises.push(promise);
    }
  }

  await Promise.all(promises);

  console.log(`[INFO] ${client.commands.size} commandes chargées.`);
};

export default loadCommands;
