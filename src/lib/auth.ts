import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { Adapter } from "next-auth/adapters";

// Lista de emails administradores (do .env ou hardcoded para fallback)
const getAdminEmails = (): string[] => {
  const envEmails = process.env.ADMIN_EMAILS?.split(",").map(e => e.trim()) || [];
  // Manter compatibilidade com email anterior (temporário - remover após migrar)
  if (process.env.LEGACY_ADMIN_EMAIL) {
    envEmails.push(process.env.LEGACY_ADMIN_EMAIL);
  }
  return envEmails.filter(Boolean);
};

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Validar domínio de email se configurado
      const allowedDomains = process.env.ALLOWED_EMAIL_DOMAINS?.split(",").map(d => d.trim()) || [];
      
      if (allowedDomains.length > 0 && user.email) {
        const domain = user.email.split("@")[1];
        if (!allowedDomains.includes(domain)) {
          console.warn(`[Auth] Domínio não permitido: ${domain}`);
          return false;
        }
      }

      // Sincroniza avatar do Google no banco de usuários
      if (account?.provider === "google" && user.email) {
        const googlePicture = (profile as { picture?: string } | null)?.picture;
        if (googlePicture) {
          try {
            await prisma.user.updateMany({
              where: { email: user.email },
              data: { image: googlePicture },
            });
          } catch (error) {
            console.error("[Auth] Falha ao sincronizar avatar do Google:", error);
          }
        }
      }
      
      return true;
    },
    async session({ session, user }) {
      if (!session.user) return session;

      try {
        const adminEmails = getAdminEmails();

        // Auto-promote admin se email estiver na lista
        if (session.user.email && adminEmails.includes(session.user.email)) {
          const dbUserForRole = await prisma.user.findUnique({
            where: { id: user.id },
            select: { role: true },
          });

          if (dbUserForRole?.role !== "ADMIN") {
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
            isActive: true,
          },
        });

        session.user.id = user.id;
        session.user.role = dbUser?.role || "PLAYER";
        session.user.playerType = dbUser?.playerType || "CASUAL";
        session.user.phone = dbUser?.phone || null;
        (session.user as any).isActive = dbUser?.isActive !== false;

        return session;
      } catch (error) {
        console.error("[Auth] Erro no callback de sessão:", error);

        // Nunca quebrar o useSession() no cliente por erro de banco.
        session.user.id = user.id;
        session.user.role = (session.user as any).role || "PLAYER";
        session.user.playerType = (session.user as any).playerType || "CASUAL";
        session.user.phone = (session.user as any).phone || null;
        (session.user as any).isActive = true;

        return session;
      }
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" 
        ? "__Secure-next-auth.session-token" 
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
};
