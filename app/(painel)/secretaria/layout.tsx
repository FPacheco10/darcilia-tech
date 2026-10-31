import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { modulos, type Perfil } from "@/lib/config/modulos";

type Props = {
  children: ReactNode;
};

async function SecretariaProtegida({ children }: Props) {
  await connection();

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
    .select("perfil, ativo")
    .eq("id", user.id)
    .single();

  if (perfilError || !perfil || !perfil.ativo) {
    redirect("/acesso-negado");
  }

  const modulo = modulos.find((item) => item.id === "secretaria");

  if (!modulo || !modulo.perfis.includes(perfil.perfil as Perfil)) {
    redirect("/acesso-negado");
  }

  return <>{children}</>;
}

export default function SecretariaLayout({ children }: Props) {
  return (
    <Suspense
      fallback={
        <div role="status" className="p-8 text-slate-300">
          Verificando acesso à Secretaria...
        </div>
      }
    >
      <SecretariaProtegida>{children}</SecretariaProtegida>
    </Suspense>
  );
}