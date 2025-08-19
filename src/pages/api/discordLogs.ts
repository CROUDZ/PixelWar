import type { NextApiRequest, NextApiResponse } from "next";

const DISCORD_LOGGER_URL = "http://127.0.0.1:3001/api/logs";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message, status = "info" } = req.body;

  if (!message) {
    return res.status(400).json({ error: "The 'message' field is required." });
  }

  try {
    const response = await fetch(DISCORD_LOGGER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, status }),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error("[DiscordLogs API] Error:", error);
    return res.status(500).json({
      error: "Failed to send log to Discord bot.",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
