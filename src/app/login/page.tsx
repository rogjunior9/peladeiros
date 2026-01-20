"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push("/dashboard");
    }
  }, [session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[100px]" />
      </div>

      <Card className="w-full max-w-md bg-zinc-950 border border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative z-10 animate-in fade-in zoom-in duration-500">
        <CardHeader className="text-center space-y-4 pt-10">
          <div className="mx-auto mb-2 h-20 w-20 rounded-full bg-black border border-white/10 flex items-center justify-center shadow-[0_0_20px_rgba(197,160,89,0.2)]">
            <span className="font-display font-bold text-4xl text-white">P</span>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-4xl font-display font-bold text-white uppercase tracking-wide">
              Peladeiros
            </CardTitle>
            <CardDescription className="text-zinc-500 uppercase tracking-widest text-xs">
              Sistema de Gestão de Futebol
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-8 pb-10">
          <div className="text-center text-sm text-zinc-400 font-light leading-relaxed px-6">
            Acesse sua conta para organizar partidas, gerenciar pagamentos e confirmar presença.
          </div>

          <Button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="w-full h-12 bg-white hover:bg-zinc-200 text-black font-bold uppercase tracking-widest transition-transform hover:scale-[1.02]"
            size="lg"
          >
            <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Entrar com Google
          </Button>

          <p className="text-center text-[10px] text-zinc-600 uppercase tracking-widest mt-6">
            &copy; {new Date().getFullYear()} RogerioJunior Tech
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
