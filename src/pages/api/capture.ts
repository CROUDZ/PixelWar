import { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import sendDiscordLog from "@/lib/sendDiscordLog";

const CAPTURE_DIR = path.join(process.cwd(), "images");

// Création du dossier si nécessaire
if (!fs.existsSync(CAPTURE_DIR)) {
  fs.mkdirSync(CAPTURE_DIR, { recursive: true });
}

// API route handler pour recevoir les données du canvas
interface SuccessResponse {
  message: string;
}

interface ErrorResponse {
  error: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>,
) {
  if (req.method === "POST") {
    try {
      const { imageData } = req.body;

      if (imageData) {
        // Sauvegarder l'image base64 reçue du client
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filePath = path.join(CAPTURE_DIR, `pixelwar-${timestamp}.png`);

        // Convertir base64 en buffer et sauvegarder
        const base64Data = imageData.replace(/^data:image\/png;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        fs.writeFileSync(filePath, buffer);

        console.log("Capture sauvegardée:", filePath);
        sendDiscordLog("Capture effectuée avec succès.", "info");
        res.status(200).json({ message: "Capture effectuée avec succès." });
      } else {
        // Fallback: utiliser puppeteer avec les bonnes options
        await captureCanvasWithPuppeteer();
        sendDiscordLog("Capture effectuée avec succès via Puppeteer.", "info");
        res.status(200).json({ message: "Capture effectuée avec succès." });
      }
    } catch (error) {
      console.error("Erreur lors de la capture:", error);
      sendDiscordLog("Erreur lors de la capture: " + error, "error");
      res.status(500).json({ error: "Erreur lors de la capture." });
    }
  } else {
    res.status(405).json({ error: "Méthode non autorisée." });
  }
}

async function captureCanvasWithPuppeteer() {
  const puppeteer = await import("puppeteer");

  const browser = await puppeteer.default.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
    ],
  });

  const page = await browser.newPage();
  await page.goto("http://localhost:3000");
  await page.waitForSelector("canvas", { timeout: 10000 });

  const canvas = await page.$("canvas");
  if (canvas) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filePath = path.join(CAPTURE_DIR, `pixelwar-${timestamp}.png`);
    await canvas.screenshot({ path: filePath as `${string}.png` });
    console.log("Capture sauvegardée:", filePath);
  }

  await browser.close();
}
