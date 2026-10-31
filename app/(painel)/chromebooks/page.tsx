import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Emprestimos from "./Emprestimo";

async function AreaChromebooks() {
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
    !["administrador", "ti", "secretaria"].includes(perfil.perfil)
  ) {
    redirect("/acesso-negado");
  }

  return <Emprestimos />;
}

export default function ChromebooksPage() {
  return (
    <Suspense
      fallback={
        <p role="status" className="p-8 text-slate-300">
          Carregando Chromebooks...
        </p>
      }
    >
      <AreaChromebooks />
    </Suspense>
  );
}