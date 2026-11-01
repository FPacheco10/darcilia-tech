
import { Suspense } from "react";
import { connection } from "next/server";
import { verificarAcesso } from "@/lib/auth/verificarAcesso";
import Professores from "./Professores";

async function ConteudoProfessores() {
  await connection();
  await verificarAcesso("professores");

  return <Professores />;
}

export default function ProfessoresPage() {
  return (
    <Suspense
      fallback={
        <p className="p-8 text-slate-300">
          Carregando professores...
        </p>
      }
    >
      <ConteudoProfessores />
    </Suspense>
  );
}
