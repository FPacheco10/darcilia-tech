import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Perfil } from "@/lib/config/modulos";
import MenuLateral from "@/app/components/MenuLateral";

const perfisValidos: Perfil[] = [
  "administrador",
  "ti",
  "secretaria",
  "financeiro",
  "consulta",
];

type Props = {
  children: ReactNode;
};

async function PainelAutenticado({ children }: Props) {
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
    .select("nome, perfil, ativo, foto_url")
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

  let fotoUrl: string | null = null;

  const caminhoFoto = perfil.foto_url;

  if (
    typeof caminhoFoto === "string" &&
    caminhoFoto.startsWith(`${user.id}/`) &&
    !caminhoFoto.includes("://")
  ) {
    try {
      const { data, error } = await supabase.storage
        .from("fotos-perfil")
        .createSignedUrl(caminhoFoto, 3600);

      if (!error && data?.signedUrl) {
        fotoUrl = data.signedUrl;
      }
    } catch {
      // Se a foto não carregar, o menu exibe a inicial do nome.
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <MenuLateral
        perfil={perfil.perfil as Perfil}
        nome={perfil.nome}
        fotoUrl={fotoUrl}
      />

      <div className="min-h-screen px-4 pb-8 pt-20 md:ml-64 md:p-8">
        {children}
      </div>
    </div>
  );
}

export default function PainelLayout({ children }: Props) {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300"
        >
          Carregando painel...
        </div>
      }
    >
      <PainelAutenticado>{children}</PainelAutenticado>
    </Suspense>
  );
}