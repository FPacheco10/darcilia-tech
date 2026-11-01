
import { Suspense } from "react";
import { connection } from "next/server";
import { verificarAcesso } from "@/lib/auth/verificarAcesso";
import Relatorios from "./Relatorios";

async function ConteudoRelatorios() {
  await connection();
  await verificarAcesso("relatorios");

  return <Relatorios />;
}

export default function RelatoriosPage() {
  return (
    <Suspense
      fallback={
        <p className="p-8 text-slate-300">
          Carregando relatórios...
        </p>
      }
    >
      <ConteudoRelatorios />
    </Suspense>
  );
}
