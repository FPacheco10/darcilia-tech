import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Funcionarios from "./Funcionarios";

async function AreaFuncionarios() {
  await connection();

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const { data: perfil, error } = await supabase
    .from("perfis")
    .select("perfil, ativo")
    .eq("id", user.id)
    .single();

  if (
    error ||
    !perfil?.ativo ||
    perfil.perfil !== "administrador"
  ) {
    redirect("/acesso-negado");
  }

  return <Funcionarios usuarioAtualId={user.id} />;
}

export default function FuncionariosPage() {
  return (
    <Suspense
      fallback={
        <p role="status" className="p-8 text-slate-300">
          Carregando funcionários...
        </p>
      }
    >
      <AreaFuncionarios />
    </Suspense>
  );
}