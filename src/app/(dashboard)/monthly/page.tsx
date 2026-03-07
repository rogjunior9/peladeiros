"use client";

import { MonthlyChargePanel } from "@/components/MonthlyChargePanel";

export default function MonthlyPage() {
  return (
    <div className="space-y-5 md:space-y-8 pb-8 md:pb-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between border-b border-white/5 pb-4 md:pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white uppercase tracking-tight">Mensalistas</h1>
          <p className="text-zinc-500 mt-1 text-sm md:text-base">Gestão mensal de cobrança e status dos mensalistas</p>
        </div>
      </div>

      <MonthlyChargePanel />
    </div>
  );
}
