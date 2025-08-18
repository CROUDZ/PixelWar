import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const name = "eventMode";
  try {
    if (req.method === "POST") {
      // Update or create EventMode
      const { startDate, endDate, active } = req.body;
      // Assuming a fixed name for the event mode

      if (!startDate || !endDate || active === undefined) {
        return res.status(400).json({ error: "All fields are required." });
      }

      const updatedEvent = await prisma.eventMode.upsert({
        where: { name }, // Use name as unique identifier
        update: {
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          active,
        },
        create: {
          name,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          active,
        },
      });

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
