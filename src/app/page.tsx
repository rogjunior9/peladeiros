"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Loader } from "@/components/ui/loader";
import { Trophy, Wallet, BarChart3, Users, PlayCircle, ShieldCheck } from "lucide-react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push("/dashboard");
    }
  }, [session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#09090B]">
        <Loader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-accent/30 selection:text-white">
      {/* Background Decor */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[800px] h-[800px] bg-accent/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-900/5 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <header className="fixed w-full top-0 z-50 border-b border-white/5 bg-black/50 backdrop-blur-md">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-accent to-yellow-600 flex items-center justify-center shadow-lg shadow-accent/20">
              <Trophy className="h-5 w-5 text-black fill-black/20" />
            </div>
            <span className="text-xl font-display font-bold text-white tracking-wide">
              PELADEIROS<span className="text-accent">.PRO</span>
            </span>
          </div>
          <Link href="/login">
            <Button variant="outline" className="border-accent/50 text-accent hover:bg-accent hover:text-black font-bold uppercase tracking-wider text-xs h-10 px-6 transition-all">
              Acessar Sistema
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative pt-32 pb-20 container mx-auto px-6 z-10">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-8">

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-400 text-xs uppercase tracking-widest font-medium mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            Gestão Profissional de Futebol Amador
          </div>

          <h1 className="text-5xl md:text-7xl font-display font-bold text-white uppercase leading-[0.9] tracking-tighter animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            Gerencie suas <span className="text-accent">Peladas</span><br />
            Como um <span className="text-stroke-1 text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-500">Profissional</span>
          </h1>

          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            Organize jogos, escale times, controle pagamentos via PIX e gere relatórios financeiros.
            A plataforma definitiva para quem leva a resenha a sério.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <Link href="/login">
              <Button size="lg" className="h-14 px-8 bg-accent hover:bg-white text-black font-display font-bold text-lg uppercase tracking-wider shadow-[0_0_30px_rgba(197,160,89,0.3)] hover:shadow-[0_0_40px_rgba(197,160,89,0.5)] transition-all">
                Começar Agora
              </Button>
            </Link>
            {/* <Button variant="outline" size="lg" className="h-14 px-8 border-white/10 text-white hover:bg-white/5 font-display font-bold text-lg uppercase tracking-wider">
              <PlayCircle className="mr-2 h-5 w-5 text-zinc-500" /> Demo
            </Button> */}
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mt-32 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
          {[
            {
              icon: Users,
              title: "Gestão de Elenco",
              desc: "Cadastre mensalistas, avulsos e goleiros. Controle de presença automatizado e listas de espera inteligentes."
            },
            {
              icon: Wallet,
              title: "Financeiro Automático",
              desc: "Controle quem pagou, quem deve e os custos do campo. Integração para baixa automática (em breve)."
            },
            {
              icon: BarChart3,
              title: "Dashboard & Stats",
              desc: "Métricas detalhadas de arrecadação, frequência e performance dos jogos em tempo real."
            }
          ].map((feature, i) => (
            <div key={i} className="group bg-[#0A0A0A] border border-white/5 hover:border-accent/30 p-8 rounded-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="h-12 w-12 rounded-lg bg-zinc-900 border border-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="h-6 w-6 text-zinc-500 group-hover:text-accent transition-colors" />
              </div>
              <h3 className="text-xl font-display font-bold text-white uppercase mb-3">{feature.title}</h3>
              <p className="text-zinc-500 leading-relaxed text-sm">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Trust Section */}
        <div className="mt-32 pt-16 border-t border-white/5 text-center">
          <p className="text-zinc-600 text-sm uppercase tracking-widest font-bold mb-8">Confiado por organizadores em todo o Brasil</p>
          <div className="flex justify-center items-center gap-12 opacity-30 grayscale mix-blend-screen">
            <ShieldCheck className="h-12 w-12" />
            <Trophy className="h-10 w-10" />
            <Users className="h-14 w-14" />
            <Wallet className="h-10 w-10" />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-black py-12">
        <div className="container mx-auto px-6 flex flex-col items-center gap-6 text-center">
          <div className="flex flex-col gap-2 text-zinc-600 text-sm">
            <p>Rogério Júnior - CNPJ 57.419.052/0001-14</p>
          </div>
          <div className="flex gap-6 text-sm font-bold uppercase tracking-wider">
            <a href="https://rogeriojunior.com.br/termos" target="_blank" rel="noopener noreferrer" className="text-accent hover:text-white transition-colors">Termos e Condições</a>
            <span className="text-zinc-700">|</span>
            <a href="https://rogeriojunior.com.br/politica-privacidade" target="_blank" rel="noopener noreferrer" className="text-accent hover:text-white transition-colors">Política de Privacidade</a>
          </div>
          <span className="text-zinc-600 text-xs mt-4">© 2026 Peladeiros Pro. Todos os direitos reservados.</span>
        </div>
      </footer>
    </div>
  );
}
