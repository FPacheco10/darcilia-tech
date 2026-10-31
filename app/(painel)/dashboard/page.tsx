import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BotaoSair from "@/app/components/BotaoSair";
import IndicadoresDashboard from "@/app/components/IndicadoresDashboard";
import { connection } from "next/server";

export default async function DashboardPage() {
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
    .select("nome, perfil, ativo")
    .eq("id", user.id)
    .single();

  if (perfilError || !perfil || !perfil.ativo) {
    redirect("/acesso-negado");
  }

  return (
    <main>
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Darcilia Tech</h1>

            <p className="mt-2 text-slate-400">
              Sistema Integrado de Gestão Escolar
            </p>
          </div>

          <BotaoSair />
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <h2 className="text-2xl font-semibold">
            Bem-vindo, {perfil.nome}!
          </h2>

          <p className="mt-3 text-slate-300">
            Seu perfil de acesso:
            <span className="ml-2 font-semibold capitalize text-blue-400">
              {perfil.perfil}
            </span>
          </p>

          <p className="mt-6 text-sm text-slate-400">
            Os módulos disponíveis serão exibidos conforme as
            permissões do seu perfil.
          </p>

          <div className="mt-6">
            <IndicadoresDashboard />
          </div>
        </section>
      </div>
    </main>
  );
}