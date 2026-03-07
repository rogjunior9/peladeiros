import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { prisma } from "@/lib/prisma";
import type { PlayerType, UserRole } from "@prisma/client";

export type AppSessionUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: UserRole;
  playerType: PlayerType;
  phone: string | null;
  isActive: boolean;
};

export type AppSession = {
  user: AppSessionUser;
};

function getAdminEmails(): string[] {
  const envEmails =
    process.env.ADMIN_EMAILS?.split(",").map((email) => email.trim()) || [];

  if (process.env.LEGACY_ADMIN_EMAIL) {
    envEmails.push(process.env.LEGACY_ADMIN_EMAIL);
  }

  return envEmails.filter(Boolean);
}

function getAllowedEmailDomains(): string[] {
  return (
    process.env.ALLOWED_EMAIL_DOMAINS?.split(",")
      .map((domain) => domain.trim().toLowerCase())
      .filter(Boolean) || []
  );
}

function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  const cookieStore = cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // no-op in contexts where cookies are read-only
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options, maxAge: 0 });
        } catch {
          // no-op in contexts where cookies are read-only
        }
      },
    },
  });
}

async function buildAppSession(email: string, profile?: { name?: string | null; image?: string | null }) {
  const allowedDomains = getAllowedEmailDomains();
  if (allowedDomains.length > 0) {
    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain || !allowedDomains.includes(domain)) {
      return null;
    }
  }

  let dbUser = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      phone: true,
      role: true,
      playerType: true,
      isActive: true,
    },
  });

  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: {
        email,
        name: profile?.name || email.split("@")[0],
        image: profile?.image || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        phone: true,
        role: true,
        playerType: true,
        isActive: true,
      },
    });
  } else if (profile?.image && dbUser.image !== profile.image) {
    dbUser = await prisma.user.update({
      where: { id: dbUser.id },
      data: { image: profile.image },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        phone: true,
        role: true,
        playerType: true,
        isActive: true,
      },
    });
  }

  const adminEmails = getAdminEmails();
  if (adminEmails.includes(email) && dbUser.role !== "ADMIN") {
    dbUser = await prisma.user.update({
      where: { id: dbUser.id },
      data: { role: "ADMIN" },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        phone: true,
        role: true,
        playerType: true,
        isActive: true,
      },
    });
  }

  return {
    user: {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      image: dbUser.image,
      role: dbUser.role,
      playerType: dbUser.playerType,
      phone: dbUser.phone,
      isActive: dbUser.isActive !== false,
    },
  } satisfies AppSession;
}

export async function getServerSession(_options?: unknown): Promise<AppSession | null> {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user?.email) {
      return null;
    }

    return buildAppSession(user.email, {
      name:
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) ||
        null,
      image:
        (user.user_metadata?.picture as string | undefined) ||
        (user.user_metadata?.avatar_url as string | undefined) ||
        null,
    });
  } catch (error) {
    console.error("[SupabaseAuth] Failed to load session", error);
    return null;
  }
}
