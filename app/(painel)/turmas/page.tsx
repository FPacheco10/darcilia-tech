
import { Suspense } from "react";
import { connection } from "next/server";
import { verificarAcesso } from "@/lib/auth/verificarAcesso";
import Turmas from "./Turmas";

async function ConteudoTurmas() {
  await connection();
  await verificarAcesso("turmas");

  return <Turmas />;
}

export default function TurmasPage() {
  return (
    <Suspense
      fallback={
        <p className="p-8 text-slate-300">
          Carregando turmas...
        </p>
      }
    >
      <ConteudoTurmas />
    </Suspense>
  );
}
