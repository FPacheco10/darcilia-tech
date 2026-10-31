import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MeuPerfil from "./MeuPerfil";

async function AreaPerfil() {
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
    .select("nome, perfil, ativo, foto_url")
    .eq("id", user.id)
    .single();

  if (error || !perfil?.ativo) {
    redirect("/acesso-negado");
  }

  return (
    <MeuPerfil
      usuarioId={user.id}
      email={user.email ?? ""}
      nomeInicial={perfil.nome}
      perfilAcesso={perfil.perfil}
      caminhoInicial={perfil.foto_url}
    />
  );
}

export default function PerfilPage() {
  return (
    <Suspense
      fallback={
        <p role="status" className="p-8 text-slate-300">
          Carregando perfil...
        </p>
      }
    >
      <AreaPerfil />
    </Suspense>
  );
}