import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Equipamentos from "./Equipamentos";
async function AreaEquipamentos() {
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
    !["administrador", "ti"].includes(perfil.perfil)
  ) {
    redirect("/acesso-negado");
  }

  return <Equipamentos />;
}

export default function EquipamentosPage() {
  return (
    <Suspense
      fallback={
        <p role="status" className="p-8 text-slate-300">
          Carregando equipamentos...
        </p>
      }
    >
      <AreaEquipamentos />
    </Suspense>
  );
}