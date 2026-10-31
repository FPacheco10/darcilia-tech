
import { verificarAcesso } from "@/lib/auth/verificarAcesso";

export default async function FinanceiroPage() {
  const { perfil } = await verificarAcesso("financeiro");

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <h1 className="text-3xl font-bold">
        Gestão Financeira
      </h1>

      <p className="mt-4 text-slate-300">
        Bem-vindo, {perfil.nome}!
      </p>

      <p className="mt-2 text-slate-400">
        Módulo financeiro do Darcilia Tech.
      </p>
    </main>
  );
}
