import NextAuth from "next-auth";
import type {
  NextAuthOptions,
  Account as NextAuthAccount,
  Session,
  User as NextAuthUser,
} from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { synchronize } from "@/lib/synchronize"; // nouvelle signature acceptant prismaUserId optionnel
import type { JWT } from "next-auth/jwt";
import type { DiscordProfile } from "@/types/discord"; // Assurez-vous que ce type est défini dans votre projet
import addUserToGuild from "@/lib/addUserToGuild"; // Import de la fonction pour ajouter l'utilisateur au serveur

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "identify email guilds guilds.join",
          prompt: "consent",
        },
      },
      profile(profile: DiscordProfile) {
        return {
          id: profile.id,
          name: profile.username,
          email: profile.email,
          image: profile.avatar
            ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
            : null,
        };
      },
    }),
  ],
  session: { strategy: "database" },
  secret: process.env.NEXTAUTH_SECRET,
  // utile pour débug
  debug: process.env.NODE_ENV === "development",
  callbacks: {
    async jwt({
      token,
      user,
      account,
    }: {
      token: JWT;
      user?: NextAuthUser | null;
      account?: NextAuthAccount | null;
    }) {
      if (account) {
        token.accessToken = account.access_token as string | undefined;
        token.refreshToken = account.refresh_token as string | undefined;
        token.expires = account.expires_at as number | undefined;
      }
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.image = user.image;
      }
      return token;
    },
    async session({ session, user }: { session: Session; user: NextAuthUser }) {
      if (user && session.user) {
        session.user.id = user.id;
        session.user.name = user.name ?? undefined;

        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            lastPixelPlaced: true,
            boosted: true,
            linked: true,
            role: true,
            twoFA: true,
          },
        });

        if (dbUser) {
          session.user.lastPixelPlaced = dbUser.lastPixelPlaced ?? false;
          session.user.boosted = dbUser.boosted ?? false;
          session.user.linked = dbUser.linked ?? false;
          session.user.role =
            dbUser.role === "USER" || dbUser.role === "ADMIN"
              ? dbUser.role
              : "USER";
          session.user.twoFA = !!dbUser.twoFA;
        }
      }
      return session;
    },
    async signIn({ account, profile }) {
      if (account?.access_token && profile) {
        try {
          await addUserToGuild(
            account.access_token,
            (profile as DiscordProfile).id,
          );

          const discordProfile = profile as DiscordProfile;

          await prisma.user.upsert({
            where: { id: discordProfile.id },
            update: {
              name: discordProfile.global_name || discordProfile.username,
              global_name: discordProfile.global_name || null,
              accessToken: account.access_token,
              refreshToken: account.refresh_token,
              expires: account.expires_at || null,
              image: discordProfile.avatar
                ? `https://cdn.discordapp.com/avatars/${discordProfile.id}/${discordProfile.avatar}.png`
                : null,
              joinGuild: true,
            } as Prisma.UserUpdateInput,
            create: {
              id: discordProfile.id,
              name: discordProfile.global_name || discordProfile.username,
              email: discordProfile.email,
              image: discordProfile.avatar
                ? `https://cdn.discordapp.com/avatars/${discordProfile.id}/${discordProfile.avatar}.png`
                : null,
              global_name: discordProfile.global_name || null,
              accessToken: account.access_token,
              refreshToken: account.refresh_token,
              expires: account.expires_at || null,
              joinGuild: true,
            } as Prisma.UserCreateInput,
          });
          await prisma.account.upsert({
            where: {
              provider_providerAccountId: {
                provider: "discord",
                providerAccountId: discordProfile.id,
              },
            },
            update: {
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              expires_at: account.expires_at,
            },
            create: {
              userId: discordProfile.id,
              type: "oauth",
              provider: "discord",
              providerAccountId: discordProfile.id,
              token_type: account.token_type,
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              expires_at: account.expires_at,
              scope: account.scope,
            },
          });
        } catch (error) {
          console.error(
            "Erreur lors de l'ajout de l'utilisateur au serveur Discord:",
            error,
          );
          return false; // Échec de la connexion si l'ajout échoue
        }
      }
      return true;
    },
  },
  events: {
    // event appelé quand un Account est lié à un User (après la création)
    async linkAccount({ account, user }) {
      try {
        if (!account || !user) return;
        if (account.provider !== "discord") return;

        // account.providerAccountId contient l'ID Discord
        const discordId = account.providerAccountId;
        const accessToken = account.access_token ?? undefined;
        const refreshToken = account.refresh_token ?? undefined;

        // On appelle la sync en passant l'id prisma du user pour mettre à jour la bonne ligne
        await synchronize({
          accessToken: accessToken ?? "",
          refreshToken: refreshToken ?? "",
          discordId,
          prismaUserId: user.id,
        });
      } catch (e) {
        console.error("Erreur dans events.linkAccount :", e);
      }
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
