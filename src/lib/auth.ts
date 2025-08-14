import NextAuth from 'next-auth';
import type { NextAuthOptions, Account, Profile, Session, User } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import prisma from './prisma';
import { PrismaClient } from '@prisma/client';
import { synchronize } from './synchronize';
import type { JWT } from 'next-auth/jwt';

interface DiscordProfile {
  id: string;
  username: string;
  email: string;
  global_name?: string;
  avatar?: string;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "database" }, // Stocke les sessions en DB
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

/*export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma as unknown as PrismaClient),
  debug: process.env.NODE_DEBUG === 'true',
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'identify email guilds',
          prompt: 'consent',
        },
      },
      profile(profile: DiscordProfile) {
        return {
          id: profile.id,
          username: profile.username,
          email: profile.email,
          image: `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`,
          global_name: profile.global_name || null,
        };
      },
    }),
  ],
  session: { strategy: 'database' },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user, account }: { token: JWT; user?: User | null; account?: Account | null }) {
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
        token.global_name = user.global_name ?? null;
      }
      return token;
    },
    async signIn({ account, profile }: { account: Account | null; profile?: Profile }) {
      console.log('----- SignIn callback déclenché -----');
      console.log('SignIn account:', account);
      console.log('SignIn profile:', profile);
      try {
        if (!account || !profile) {
          console.error('Account ou profile manquant');
          return false;
        }

        const discordProfile = profile as unknown as DiscordProfile;
        console.log('DiscordProfile:', discordProfile);

        // Let NextAuth handle the user/account creation first
        // Only do the synchronization after the user is created
        if (account.access_token) {
          console.log('Synchronizing with Discord...');
          await synchronize({
            accessToken: account.access_token,
            refreshToken: account.refresh_token!,
            discordId: discordProfile.id,
          });

          // Update user with additional Discord data after NextAuth creates the base record
          console.log('Updating user in Prisma...');
          await prisma.user.update({
            where: { id: discordProfile.id },
            data: {
              username: discordProfile.username || null,
              global_name: discordProfile.global_name || null,
              accessToken: account.access_token ?? null,
              refreshToken: account.refresh_token ?? null,
              expires: account.expires_at || null,
            },
          });
        }

        console.log('SignIn callback completed successfully');
        return true;
      } catch (error) {
        console.error('Erreur dans signIn callback:', error);
        return false; // Return false instead of throwing to prevent NextAuth errors
      }
    },

    async session({ session, user }: { session: Session; user: User }) {
      if (user && session.user) {
        session.user.id = user.id;
        session.user.username = user.name ?? undefined;
        session.user.global_name = user.global_name ?? null;
        session.user.accessToken = user.accessToken ?? null;
        session.user.refreshToken = user.refreshToken ?? null;
        session.user.expires = user.expires ?? null;
      }
      return session;
    },
  },
};*/

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
