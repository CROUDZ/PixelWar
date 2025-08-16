import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { Client } from 'discord.js'; // Assurez-vous d'importer le type Client de discord.js

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const buttonsPath = path.join(__dirname, '../buttons');

interface Button {
  default: {
    id: string;
    execute: Function;
  };
}

export default (client: Client): void => {
  const items = fs.readdirSync(buttonsPath);

  for (const item of items) {
    const itemPath = path.join(buttonsPath, item);

    if (fs.lstatSync(itemPath).isDirectory()) {
      const buttonFiles = fs
        .readdirSync(itemPath)
        .filter((file) => file.endsWith('.ts') || file.endsWith('.js')); // Accepte les fichiers .ts et .js
      for (const file of buttonFiles) {
        const filePath = path.join(itemPath, file);
        import(pathToFileURL(filePath).toString()).then((button: Button) => {
          // Utilisation de toString() ici
          if (button.default?.id && button.default?.execute) {
            client.buttons.set(button.default.id, button.default);
          } else {
            console.error(
              `[WARNING] Button in ${filePath} is missing required "id" or "execute" properties`
            );
          }
        });
      }
    } else if (item.endsWith('.ts') || item.endsWith('.js')) {
      // Accepte les fichiers .ts et .js
      import(pathToFileURL(itemPath).toString()).then((button: Button) => {
        // Utilisation de toString() ici
        if (button.default?.id && button.default?.execute) {
          client.buttons.set(button.default.id, button.default);
        } else {
          console.error(
            `[WARNING] Button in ${itemPath} is missing required "id" or "execute" properties`
          );
        }
      });
    }
  }
};
