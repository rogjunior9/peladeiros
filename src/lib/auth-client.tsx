"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";
import type { AppSession } from "@/lib/supabase-auth";

type SessionStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  data: AppSession | null;
  status: SessionStatus;
  refreshSession: () => Promise<void>;
  update: (nextSession?: unknown) => Promise<AppSession | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchSession(): Promise<AppSession | null> {
  const response = await fetch("/api/auth/session", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  return payload.session ?? null;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppSession | null>(null);
  const [status, setStatus] = useState<SessionStatus>("loading");

  const refreshSession = useCallback(async () => {
    setStatus("loading");

    try {
      const session = await fetchSession();
      setData(session);
      setStatus(session ? "authenticated" : "unauthenticated");
    } catch {
      setData(null);
      setStatus("unauthenticated");
    }
  }, []);

  const update = useCallback(async (nextSession?: unknown) => {
    if (nextSession && typeof nextSession === "object") {
      const next = nextSession as Partial<AppSession>;
      if (next.user) {
        setData((previous) => {
          const merged = {
            ...(previous || {}),
            ...next,
            user: {
              ...(previous?.user || {}),
              ...next.user,
            },
          } as AppSession;
          return merged;
        });
      }
    }

    try {
      const session = await fetchSession();
      setData(session);
      setStatus(session ? "authenticated" : "unauthenticated");
      return session;
    } catch {
      setData(null);
      setStatus("unauthenticated");
      return null;
    }
  }, []);

  useEffect(() => {
    void refreshSession();

    const supabase = getSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refreshSession();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshSession]);

  const value = useMemo(
    () => ({ data, status, refreshSession, update }),
    [data, status, refreshSession, update]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useSession() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useSession must be used inside SessionProvider");
  }

  return context;
}

export async function signIn(
  provider: "google",
  options?: { callbackUrl?: string }
) {
  if (provider !== "google") {
    throw new Error("Only Google provider is supported");
  }

  const next = options?.callbackUrl || "/dashboard";
  const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const supabase = getSupabaseBrowserClient();
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
}

export async function signOut(options?: { callbackUrl?: string }) {
  const supabase = getSupabaseBrowserClient();
  const result = await supabase.auth.signOut();

  if (options?.callbackUrl) {
    window.location.assign(options.callbackUrl);
  }

  return result;
}
