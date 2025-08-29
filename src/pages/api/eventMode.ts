import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { createClient } from "redis";

const prisma = new PrismaClient();

type EventModeUpdateData = {
  startDate?: Date;
  endDate?: Date;
  active?: boolean;
  width?: number;
  height?: number;
};

type EventModeCreateData = {
  name: string;
  startDate: Date;
  endDate: Date;
  active: boolean;
  width: number;
  height: number;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const name = "eventMode";
  const redisClient = createClient(
    process.env.REDIS_URL ? { url: process.env.REDIS_URL } : {},
  );
  try {
    if (req.method === "POST") {
      // Update or create EventMode
      const { startDate, endDate, active, width, height } = req.body;
      console.log("Received EventMode data:", req.body);
      // Assuming a fixed name for the event mode

      const updateData: EventModeUpdateData = {};
      if (startDate !== undefined) updateData.startDate = new Date(startDate);
      if (endDate !== undefined) updateData.endDate = new Date(endDate);
      if (active !== undefined) updateData.active = active;
      if (width !== undefined) updateData.width = width;
      if (height !== undefined) updateData.height = height;

      const createData: EventModeCreateData = {
        name,
        startDate: startDate !== undefined ? new Date(startDate) : new Date(),
        endDate:
          endDate !== undefined
            ? new Date(endDate)
            : new Date(Date.now() + 24 * 60 * 60 * 1000), // Default to 24 hours from now
        active: active !== undefined ? active : false,
        width: width !== undefined ? width : 100, // Default width
        height: height !== undefined ? height : 100, // Default height
      };

      const updatedEvent = await prisma.eventMode.upsert({
        where: { name }, // Use name as unique identifier
        update: updateData,
        create: createData,
      });

      // If width/height provided, publish to Redis so WS server reloads grid size
      if ((width !== undefined || height !== undefined)) {
        try {
          if (!redisClient.isOpen) await redisClient.connect();
          const newW = width ?? updatedEvent.width;
          const newH = height ?? updatedEvent.height;
          await redisClient.publish(
            "grid-size-changed",
            JSON.stringify({ width: newW, height: newH, ts: Date.now() }),
          );
          console.log("Published grid-size-changed to Redis:", {
            width: newW,
            height: newH,
          });
        } catch (e) {
          console.warn("Failed to publish grid-size-changed:", e);
        } finally {
          try { await redisClient.quit(); } catch {}
        }
      }

      return res.status(200).json(updatedEvent);
    } else if (req.method === "GET") {
      const event = await prisma.eventMode.findUnique({
        where: { name },
      });

      if (!event) {
        return res.status(404).json({ error: "Event not found." });
      }

      return res.status(200).json(event);
    } else {
      res.setHeader("Allow", ["POST", "GET"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} not allowed.` });
    }
  } catch (error) {
    console.error("Error handling EventMode API:", error);
    return res.status(500).json({ error: "Internal server error." });
  } finally {
    await prisma.$disconnect();
  }
}
