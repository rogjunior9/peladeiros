"use client";

import { MonthlyChargePanel } from "@/components/MonthlyChargePanel";

export default function MonthlyPage() {
  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-end justify-between border-b border-white/5 pb-6">
        <div>
          <h1 className="text-4xl font-display font-bold text-white uppercase tracking-tight">Mensalistas</h1>
          <p className="text-zinc-500 mt-1">Gestão mensal de cobrança e status dos mensalistas</p>
        </div>
      </div>

      <MonthlyChargePanel />
    </div>
  );
}
