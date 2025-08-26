import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { Client } from "discord.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const buttonsPath = path.join(__dirname, "../buttons");

// Nouvelle interface sans data
interface Button {
  default: {
    id: string;
    execute: (...args: unknown[]) => void;
  };
}

const loadButtons = (client: Client): void => {
  const items = fs.readdirSync(buttonsPath);

  for (const item of items) {
    const itemPath = path.join(buttonsPath, item);

    if (fs.lstatSync(itemPath).isDirectory()) {
      const buttonFiles = fs
        .readdirSync(itemPath)
        .filter((file) => file.endsWith(".ts") || file.endsWith(".js"));
      for (const file of buttonFiles) {
        const filePath = path.join(itemPath, file);
        import(pathToFileURL(filePath).toString()).then((button: Button) => {
          if (
            button.default?.id &&
            typeof button.default?.execute === "function"
          ) {
            client.buttons.set(button.default.id, button.default);
            console.log(
              `Bouton ${button.default.id} chargé depuis ${filePath}`,
            );
          } else {
            console.error(
              `[AVERTISSEMENT] Le bouton dans ${filePath} n'a pas les propriétés requises "id" ou "execute"`,
            );
          }
        });
      }
    } else if (item.endsWith(".ts") || item.endsWith(".js")) {
      import(pathToFileURL(itemPath).toString()).then((button: Button) => {
        if (
          button.default?.id &&
          typeof button.default?.execute === "function"
        ) {
          client.buttons.set(button.default.id, button.default);
          console.log(`Bouton ${button.default.id} chargé depuis ${itemPath}`);
        } else {
          console.error(
            `[AVERTISSEMENT] Le bouton dans ${itemPath} n'a pas les propriétés requises "id" ou "execute"`,
          );
        }
      });
    }
  }
};

export default loadButtons;
