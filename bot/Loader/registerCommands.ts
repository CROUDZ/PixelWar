import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const commandsPath = path.join(__dirname, '../commands');

// Modifier la structure pour stocker à la fois la commande et son chemin
const commands: { data: any; path: string }[] = [];

const loadCommands = async () => {
  const items = fs.readdirSync(commandsPath);

  for (const item of items) {
    const itemPath = path.join(commandsPath, item);

    if (fs.lstatSync(itemPath).isDirectory()) {
      const files = fs
        .readdirSync(itemPath)
        .filter((f) => f.endsWith('.js') || f.endsWith('.ts'));
      for (const file of files) {
        const filePath = path.join(itemPath, file);
        const command = await import(pathToFileURL(filePath).toString());
        if (command.default?.data) {
          commands.push({
            data: command.default.data.toJSON(),
            path: filePath,
          });
        }
      }
    } else if (item.endsWith('.js') || item.endsWith('.ts')) {
      const command = await import(pathToFileURL(itemPath).toString());
      if (command.default?.data) {
        commands.push({
          data: command.default.data.toJSON(),
          path: itemPath,
        });
      }
    }
  }
};

const main = async () => {
  await loadCommands();

  const rest = new REST().setToken(process.env.DISCORD_CLIENT_TOKEN!);
  const clientId = process.env.DISCORD_CLIENT_ID!;

  try {
    // Supprimer toutes les anciennes commandes globales
    const currentCommands: any = await rest.get(
      Routes.applicationCommands(clientId)
    );
    for (const cmd of currentCommands) {
      console.log(`[INFO] Suppression de la commande existante : ${cmd.name}`);
      await rest.delete(Routes.applicationCommand(clientId, cmd.id));
    }

    // Affichage des nouvelles commandes avec leurs chemins
    commands.forEach((cmdInfo) => {
      const cmd = cmdInfo.data;
      if (!cmd.name || !cmd.description) {
        console.error(
          `[ERROR] La commande ${cmd.name || 'inconnue'} est manquante ou invalide. Chemin: ${cmdInfo.path}`
        );
      } else {
        console.log(
          `[INFO] Commande ${cmd.name} prête à être enregistrée. Chemin: ${cmdInfo.path}`
        );
      }
    });

    // Enregistrement - extraire seulement les données de commande pour l'API
    const commandData = commands.map((cmd) => cmd.data);
    console.log(
      `[INFO] Enregistrement de ${commandData.length} commande(s) sur Discord...`
    );
    await rest.put(Routes.applicationCommands(clientId), { body: commandData });
    console.log('[✅] Commandes enregistrées avec succès.');
  } catch (err) {
    console.error('Erreur lors de la mise à jour des commandes :', err);
  }
};

main();
