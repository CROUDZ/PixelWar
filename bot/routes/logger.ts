import express from "express";
import type { Request, Response } from "express-serve-static-core";
import { Client as DiscordClient } from "discord.js";
import "dotenv/config";

// Déclaration pour les globals
declare global {
  var discordClient: DiscordClient | undefined;
}

const LOG_CHANNEL_ID = process.env.DISCORD_LOG_CHANNEL_ID;

interface LogEntry {
  message: string;
  status: string;
  timestamp: number;
}

interface LogToDiscord {
  (message: string, status?: string): Promise<void>;
}

class DiscordLogger {
  private queue: LogEntry[] = [];
  private isProcessing = false;
  private maxBatchSize = 10;
  private flushInterval = 5000; // 5 secondes
  private rateLimitDelay = 1000; // 1 seconde entre les envois
  private maxRetries = 3;
  private client: DiscordClient;

  constructor(client: DiscordClient) {
    this.client = client;
    this.startProcessing();
  }

  async addLog(message: string, status = "info"): Promise<void> {
    // Limiter la taille de la queue pour éviter la surcharge mémoire
    if (this.queue.length > 1000) {
      this.queue.shift(); // Supprimer le plus ancien log
    }

    this.queue.push({
      message,
      status,
      timestamp: Date.now(),
    });
  }

  private startProcessing(): void {
    setInterval(() => {
      if (!this.isProcessing && this.queue.length > 0) {
        this.processQueue();
      }
    }, this.flushInterval);
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    try {
      // Prendre un batch de logs
      const batch = this.queue.splice(0, this.maxBatchSize);
      await this.sendBatch(batch);

      // Attendre avant le prochain envoi pour respecter le rate limit
      if (this.queue.length > 0) {
        await this.sleep(this.rateLimitDelay);
      }
    } catch (error) {
      console.error("[Logger] Erreur lors du traitement de la queue:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async sendBatch(logs: LogEntry[], retryCount = 0): Promise<void> {
    try {
      const channel = await this.client.channels.fetch(
        LOG_CHANNEL_ID as string,
      );
      if (!channel || !channel.isTextBased() || !("send" in channel)) {
        console.error("[Logger] Salon introuvable");
        return;
      }

      const statusEmojis: Record<string, string> = {
        info: "ℹ️",
        warning: "⚠️",
        error: "❌",
        erreur: "❌", // Support pour "erreur" utilisé dans le serveur
      };

      // Grouper les logs par statut pour optimiser l'affichage
      const groupedLogs = this.groupLogsByStatus(logs);

      for (const [status, statusLogs] of Object.entries(groupedLogs)) {
        const emoji = statusEmojis[status] || "ℹ️";

        if (statusLogs.length === 1) {
          // Un seul log
          await channel.send(`${emoji} ${statusLogs[0].message}`);
        } else {
          // Multiple logs - les regrouper
          const messages = statusLogs
            .map((log) => `• ${log.message}`)
            .join("\n");

          // Diviser en chunks si trop long (limite Discord: 2000 caractères)
          const chunks = this.splitMessage(messages, 1900); // Marge pour l'emoji et le formatage

          for (const chunk of chunks) {
            await channel.send(
              `${emoji} **${statusLogs.length} logs ${status}:**\n${chunk}`,
            );
            await this.sleep(100); // Petit délai entre les chunks
          }
        }

        await this.sleep(200); // Délai entre les différents statuts
      }
    } catch (error: unknown) {
      if (retryCount < this.maxRetries) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.warn(
          `[Logger] Retry ${retryCount + 1}/${this.maxRetries} après erreur:`,
          errorMessage,
        );
        await this.sleep(Math.pow(2, retryCount) * 1000); // Exponential backoff
        return this.sendBatch(logs, retryCount + 1);
      } else {
        console.error(
          "[Logger] Impossible d'envoyer les logs après",
          this.maxRetries,
          "tentatives:",
          error,
        );
        // Remettre les logs dans la queue pour retry plus tard
        this.queue.unshift(...logs);
      }
    }
  }

  private groupLogsByStatus(logs: LogEntry[]): Record<string, LogEntry[]> {
    return logs.reduce(
      (groups, log) => {
        if (!groups[log.status]) {
          groups[log.status] = [];
        }
        groups[log.status].push(log);
        return groups;
      },
      {} as Record<string, LogEntry[]>,
    );
  }

  private splitMessage(message: string, maxLength: number): string[] {
    const chunks: string[] = [];
    const lines = message.split("\n");
    let currentChunk = "";

    for (const line of lines) {
      if ((currentChunk + "\n" + line).length > maxLength) {
        if (currentChunk) {
          chunks.push(currentChunk);
          currentChunk = line;
        } else {
          // Ligne trop longue, la couper
          chunks.push(line.substring(0, maxLength));
        }
      } else {
        currentChunk = currentChunk ? currentChunk + "\n" + line : line;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Méthode pour forcer le flush (utile pour les arrêts gracieux)
  async flush(): Promise<void> {
    // Traiter la queue immédiatement
    while (this.queue.length > 0) {
      await this.processQueue();
      await this.sleep(100);
    }
  }

  // Getter pour accéder à la queue depuis l'extérieur
  get queueLength(): number {
    return this.queue.length;
  }
}

// Instance globale du logger
let discordLogger: DiscordLogger;

// Fonction pour initialiser le logger avec le client Discord
export const initializeLogger = (client: DiscordClient) => {
  global.discordClient = client;
  if (!discordLogger) {
    discordLogger = new DiscordLogger(client);
  }
};

// Fonction exportée pour utilisation directe
export const logToDiscord: LogToDiscord = async function (
  message,
  status = "info",
) {
  // Récupérer le client Discord depuis les globals
  const client = global.discordClient;

  if (!client) {
    console.error("[Logger] Client Discord non disponible");
    return;
  }

  // Initialiser le logger si ce n'est pas encore fait
  if (!discordLogger) {
    discordLogger = new DiscordLogger(client);
  }

  await discordLogger.addLog(message, status);
};

// Fonction pour forcer le flush des logs (utile pour l'arrêt gracieux)
export const flushLogs = async (): Promise<void> => {
  if (discordLogger) {
    await discordLogger.flush();
  }
};

// Router Express pour les logs
const loggerRouter = express.Router();

// Middleware pour parser le JSON
loggerRouter.use(express.json());

// Explicitly type the body of the request
interface LogRequestBody {
  message: string;
  status?: string;
}

// Route POST pour envoyer des logs
loggerRouter.post(
  "/",
  async (req: Request & { body: LogRequestBody }, res: Response) => {
    const { message, status = "info" } = req.body;

    if (!message) {
      return res.status(400).json({
        error: "Le champ 'message' est requis",
      });
    }

    // Valider le status
    const validStatuses = ["info", "warning", "error", "erreur"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Status invalide. Valeurs autorisées: ${validStatuses.join(", ")}`,
      });
    }

    await logToDiscord(message, status);

    return res.status(200).json({
      success: true,
      message: "Log envoyé avec succès",
      data: {
        message,
        status,
        timestamp: new Date().toISOString(),
      },
    });
  },
);

// Route GET pour obtenir le statut du logger
loggerRouter.get("/status", (req: Request, res: Response) => {
  const queueLength = discordLogger ? discordLogger.queueLength : 0;

  return res.status(200).json({
    success: true,
    data: {
      loggerInitialized: !!discordLogger,
      queueLength,
      timestamp: new Date().toISOString(),
    },
  });
});

// Route POST pour forcer le flush des logs
loggerRouter.post("/flush", async (req: Request, res: Response) => {
  try {
    await flushLogs();

    return res.status(200).json({
      success: true,
      message: "Flush des logs effectué avec succès",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Logger Flush] Erreur:", error);
    return res.status(500).json({
      error: "Erreur lors du flush des logs",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export default loggerRouter;
