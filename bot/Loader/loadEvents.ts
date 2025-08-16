import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { Client } from "discord.js";

// Reconstruction de __dirname pour ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface EventFile {
  default: {
    name: string;
    execute: (client: Client, ...args: unknown[]) => Promise<void> | void;
  };
}

/**
 * Charge tous les événements depuis le dossier src/events ou dist/events
 */
const loadEvents = async (client: Client): Promise<void> => {
  const eventsDir = path.join(__dirname, "../events");
  const subdirs = fs.readdirSync(eventsDir);

  for (const subdir of subdirs) {
    const subdirPath = path.join(eventsDir, subdir);
    if (!fs.lstatSync(subdirPath).isDirectory()) continue;

    const files = fs
      .readdirSync(subdirPath)
      // Charge les fichiers .js et .ts (selon environnement)
      .filter((file) => file === "index.ts" || file === "index.js");

    for (const file of files) {
      const fullPath = path.join(subdirPath, file);
      try {
        const imported = (await import(
          pathToFileURL(fullPath).toString()
        )) as EventFile;
        const { default: event } = imported;

        if (!event.name || !event.execute) {
          console.error(
            `[ERREUR] Le fichier d'événement ${file} ne définit pas 'name' ou 'execute'`,
          );
          continue;
        }

        client.on(event.name, (...args: unknown[]) =>
          event.execute(client, ...args),
        );
        console.log(`✅ Événement chargé: ${event.name}`);
      } catch (error) {
        console.error(`❌ Impossible de charger l'événement ${file}:`, error);
      }
    }
  }

  console.log("🎉 Tous les événements ont été chargés !");
};

export default loadEvents;
