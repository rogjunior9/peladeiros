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
      
      return true;
    },
    async session({ session, user }) {
      if (session.user) {
        const adminEmails = getAdminEmails();
        
        // Auto-promote admin se email estiver na lista
        if (session.user.email && adminEmails.includes(session.user.email)) {
          const dbUser = await prisma.user.findUnique({ 
            where: { id: user.id },
            select: { role: true }
          });
          
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
            isActive: true,
          },
        });

        // Se usuário está inativo, invalidar sessão
        if (dbUser?.isActive === false) {
          throw new Error("Usuário inativo");
        }

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
