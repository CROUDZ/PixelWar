import { DefaultSession, DefaultUser } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface User extends DefaultUser {
    id: string; // ensure id always present (from Discord id)
    username?: string; // optional, if you want to keep it
    global_name?: string | null;
    accessToken?: string | null;
    refreshToken?: string | null;
    expires?: number | null;
  }

  interface Session {
    user: {
      id: string;
      username?: string; // optional, if you want to keep it
      global_name?: string | null;
      accessToken?: string | null;
      refreshToken?: string | null;
      expires?: number | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string;
    username?: string; // optional, if you want to keep it
    global_name?: string | null;
    accessToken?: string | null;
    refreshToken?: string | null;
    expires?: number | null;
  }
}
