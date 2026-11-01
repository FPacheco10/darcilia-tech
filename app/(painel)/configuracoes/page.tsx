
import { Suspense } from "react";
import { connection } from "next/server";
import { verificarAcesso } from "@/lib/auth/verificarAcesso";
import Configuracoes from "./Configuracoes";

async function ConteudoConfiguracoes() {
  await connection();
  await verificarAcesso("configuracoes");

  return <Configuracoes />;
}

export default function ConfiguracoesPage() {
  return (
    <Suspense
      fallback={
        <p className="p-8 text-slate-300">
          Carregando configurações...
        </p>
      }
    >
      <ConteudoConfiguracoes />
    </Suspense>
  );
}
