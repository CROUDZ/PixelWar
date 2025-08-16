import { PrismaClient } from "@prisma/client";

// Étendre le type global pour inclure prisma
declare global {
  var prisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient({
    log: ["query", "error", "warn"],
  });
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      log: ["query", "error", "warn"],
    });
  }
  prisma = global.prisma!;
}

export default prisma;
