const DISCORD_LOGGER_URL = "http://127.0.0.1:3001/api/logs";

type LogStatus = "info" | "warning" | "error";

export default async function sendDiscordLog(
  message: string,
  status: LogStatus = "info",
) {
  if (!message) {
    console.error("[sendDiscordLog] Message is required.");
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000); // Abort after 5 seconds

  try {
    const response = await fetch(DISCORD_LOGGER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, status }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error(
        "[useDiscordLog] Failed to send log:",
        await response.text(),
      );
    }
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      console.error("[useDiscordLog] Request timed out.");
    } else {
      console.error("[useDiscordLog] Error sending log:", error);
    }
  }
}
