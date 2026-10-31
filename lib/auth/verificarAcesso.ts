
import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { modulos, type Perfil } from "@/lib/config/modulos";

const perfisValidos: Perfil[] = [
  "administrador",
  "ti",
  "secretaria",
  "financeiro",
  "consulta",
];

export async function verificarAcesso(moduloId: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const { data: perfil, error: perfilError } = await supabase
    .from("perfis")
    .select("nome, perfil, ativo")
    .eq("id", user.id)
    .single();

  if (
    perfilError ||
    !perfil ||
    !perfil.ativo ||
    !perfisValidos.includes(perfil.perfil as Perfil)
  ) {
    redirect("/acesso-negado");
  }

  const modulo = modulos.find((item) => item.id === moduloId);

  if (
    !modulo ||
    !modulo.perfis.includes(perfil.perfil as Perfil)
  ) {
    redirect("/acesso-negado");
  }

  return {
    usuario: user,
    perfil: {
      nome: perfil.nome,
      perfil: perfil.perfil as Perfil,
      ativo: perfil.ativo,
    },
  };
}
