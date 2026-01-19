"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
        <div className="animate-pulse text-green-600">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-10 w-10 rounded-full bg-green-600 flex items-center justify-center">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <span className="text-xl font-bold text-green-800">Peladeiros</span>
          </div>
          <Link href="/login">
            <Button variant="outline" className="border-green-600 text-green-600 hover:bg-green-50">
              Entrar
            </Button>
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold text-green-800 mb-6">
            Gerencie suas Peladas com Facilidade
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-8">
            Organize jogos, gerencie jogadores, controle financas e muito mais.
            A solucao completa para quem organiza peladas de futebol.
          </p>
          <Link href="/login">
            <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg">
              Comecar Agora
            </Button>
          </Link>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Gestao de Jogadores</h3>
            <p className="text-gray-600">
              Cadastre mensalistas, avulsos e goleiros. Gerencie presencas e confirmasoes.
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Controle Financeiro</h3>
            <p className="text-gray-600">
              Receba via PIX ou cartao. Controle entradas, saidas e pagamentos em dinheiro.
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Dashboard Completo</h3>
            <p className="text-gray-600">
              Visualize metricas, acompanhe presencas e tenha controle total da sua pelada.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-16 border-t">
        <p className="text-center text-gray-500 text-sm">
          2024 Peladeiros. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}
