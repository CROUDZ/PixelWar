import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "GET") {
    try {
      // Set cache headers for better performance
      res.setHeader("Cache-Control", "s-maxage=10, stale-while-revalidate=30");

      const { limit, offset, userId, timeRange } = req.query;

      // Build where clause for filtering
      const where: {
        userId?: string;
        createdAt?: {
          gte: Date;
        };
      } = {};

      if (userId) {
        where.userId = userId as string;
      }

      if (timeRange) {
        const now = new Date();
        let startTime: Date;

        switch (timeRange) {
          case "1h":
            startTime = new Date(now.getTime() - 60 * 60 * 1000);
            break;
          case "6h":
            startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
            break;
          case "24h":
            startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case "7d":
            startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          default:
            startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        }

        where.createdAt = {
          gte: startTime,
        };
      }

      const pixelActions = await prisma.pixelAction.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          x: true,
          y: true,
          color: true,
          userId: true,
          createdAt: true,
          user: {
            select: {
              name: true,
              image: true,
            },
          },
        },
        take: limit ? parseInt(limit as string) : undefined,
        skip: offset ? parseInt(offset as string) : undefined,
      });

      // Transform data to include user name
      const transformedData = pixelActions.map((action) => ({
        id: action.id,
        x: action.x,
        y: action.y,
        color: action.color,
        userId: action.userId,
        createdAt: action.createdAt.toISOString(),
        userName: action.user?.name || null,
      }));

      res.status(200).json(transformedData);
    } catch (error) {
      console.error("Error fetching pixel actions:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
