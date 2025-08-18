import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { JWT } from "next-auth/jwt";

interface MiddlewareToken extends JWT {
  banned?: boolean;
}

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const token: MiddlewareToken | null = await getToken({ req });

  // Pas connecté → continue normalement
  if (!token) return NextResponse.next();

  // Vérifie si l'utilisateur est banni
  if (token.banned) {
    return NextResponse.redirect(new URL("/banned", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|static|favicon.ico).*)"], // applique sur toutes les pages sauf assets
};
