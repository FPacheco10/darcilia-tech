import { Suspense } from "react";
import { connection } from "next/server";
import { verificarAcesso } from "@/lib/auth/verificarAcesso";
import Financeiro from "./Financeiro";

async function AreaFinanceiro() {
  await connection();

  const { perfil } = await verificarAcesso("financeiro");

  return <Financeiro nomeUsuario={perfil.nome} />;
}

export default function FinanceiroPage() {
  return (
    <Suspense
      fallback={
        <p role="status" className="p-8 text-slate-300">
          Carregando Financeiro...
        </p>
      }
    >
      <AreaFinanceiro />
    </Suspense>
  );
}