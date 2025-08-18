import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { method } = req;

  if (method === "POST") {
    const { userId, action } = req.body;

    if (!userId || !["ban", "unban"].includes(action)) {
      return res.status(400).json({ error: "Invalid request parameters" });
    }

    const banned = action === "ban" ? true : action === "unban" ? false : null;
    if (banned === null) {
      return res.status(400).json({ error: "Invalid action" });
    }

    const response = await prisma.user.update({
      where: { id: userId },
      data: {
        banned,
      },
    });
    if (!response) {
      return res.status(404).json({ error: "User not found" });
    }

    return res
      .status(200)
      .json({ message: `User ${action}ned successfully`, user: response });
  } else {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${method} not allowed` });
  }
}
