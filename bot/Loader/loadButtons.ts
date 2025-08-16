import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { Client } from "discord.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const buttonsPath = path.join(__dirname, "../buttons");

// Explicitly type the execute function and add the required data property
interface Button {
  default: {
    id: string;
    execute: (...args: unknown[]) => void;
    data: {
      label: string;
      style: string;
    };
  };
}

// Assign the arrow function to a variable before exporting
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
            typeof button.default?.execute === "function" &&
            button.default?.data
          ) {
            client.buttons.set(button.default.id, button.default);
          } else {
            console.error(
              `[WARNING] Button in ${filePath} is missing required "id", "execute", or "data" properties`,
            );
          }
        });
      }
    } else if (item.endsWith(".ts") || item.endsWith(".js")) {
      import(pathToFileURL(itemPath).toString()).then((button: Button) => {
        if (
          button.default?.id &&
          typeof button.default?.execute === "function" &&
          button.default?.data
        ) {
          client.buttons.set(button.default.id, button.default);
        } else {
          console.error(
            `[WARNING] Button in ${itemPath} is missing required "id", "execute", or "data" properties`,
          );
        }
      });
    }
  }
};

export default loadButtons;
