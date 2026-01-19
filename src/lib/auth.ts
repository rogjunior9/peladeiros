import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { Adapter } from "next-auth/adapters";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        // Auto-promote admin
        if (session.user.email === "rogjunior9@gmail.com") {
          const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
          if (dbUser?.role !== "ADMIN") {
            await prisma.user.update({
              where: { id: user.id },
              data: { role: "ADMIN" },
            });
            session.user.role = "ADMIN";
          }
        }
        
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            id: true,
            role: true,
            playerType: true,
            phone: true,
          },
        });

        session.user.id = user.id;
        session.user.role = dbUser?.role || "PLAYER";
        session.user.playerType = dbUser?.playerType || "CASUAL";
        session.user.phone = dbUser?.phone || null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "database",
  },
};
