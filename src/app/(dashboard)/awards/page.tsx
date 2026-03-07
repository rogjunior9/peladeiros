"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Sparkles, Target } from "lucide-react";

export default function AwardsPage() {
  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-end justify-between border-b border-white/5 pb-6">
        <div>
          <h1 className="text-4xl font-display font-bold text-white uppercase tracking-tight">Premiações</h1>
          <p className="text-zinc-500 mt-1">Área dedicada a metas, rankings e premiações da pelada</p>
        </div>
        <Badge className="bg-accent/10 text-accent border-accent/20 uppercase tracking-widest text-[10px]">
          Em Planejamento
        </Badge>
      </div>

      <Card className="bg-zinc-950 border-white/5 overflow-hidden">
        <CardHeader className="border-b border-white/5 bg-zinc-950/50">
          <CardTitle className="text-xl font-display font-bold text-white uppercase tracking-tighter flex items-center gap-2">
            <Trophy className="h-5 w-5 text-accent" />
            Módulo em Construção
          </CardTitle>
          <CardDescription className="text-zinc-500">
            A estrutura da aba já está pronta. Próximo passo é definir as regras de premiação.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-white/10 bg-black/40 p-4">
              <div className="flex items-center gap-2 text-zinc-300 font-bold uppercase tracking-wider text-xs mb-2">
                <Sparkles className="h-4 w-4 text-accent" />
                Destaques
              </div>
              <p className="text-zinc-500 text-sm">Reservado para melhores do mês e reconhecimentos.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/40 p-4">
              <div className="flex items-center gap-2 text-zinc-300 font-bold uppercase tracking-wider text-xs mb-2">
                <Target className="h-4 w-4 text-accent" />
                Critérios
              </div>
              <p className="text-zinc-500 text-sm">Reservado para regras como presença, gols, assiduidade e fair play.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/40 p-4">
              <div className="flex items-center gap-2 text-zinc-300 font-bold uppercase tracking-wider text-xs mb-2">
                <Trophy className="h-4 w-4 text-accent" />
                Recompensas
              </div>
              <p className="text-zinc-500 text-sm">Reservado para prêmios financeiros, troféus ou benefícios no grupo.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
