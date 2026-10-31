import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { modulos, type Perfil } from "@/lib/config/modulos";

type Indicador = {
  titulo: string;
  icone: string;
  valor: number | string;
  descricao: string;
};

export default async function IndicadoresDashboard() {
  await connection();

  const supabase = await createClient();

  let totalAlunos: number | string = "—";
  let descricaoAlunos = "Sem permissão";

  let totalChamados: number | string = "—";
  let descricaoChamados = "Sem permissão";

  let totalEquipamentos: number | string = "—";
  let descricaoEquipamentos = "Sem permissão";

  let totalEmprestimos: number | string = "—";
  let descricaoEmprestimos = "Sem permissão";

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    descricaoAlunos = "Sessão não disponível";
    descricaoChamados = "Sessão não disponível";
    descricaoEquipamentos = "Sessão não disponível";
    descricaoEmprestimos = "Sessão não disponível";
  } else {
    const { data: perfil, error: perfilError } = await supabase
      .from("perfis")
      .select("perfil, ativo")
      .eq("id", user.id)
      .single();

    if (perfilError || !perfil) {
      descricaoAlunos = "Não foi possível verificar o acesso";
      descricaoChamados = "Não foi possível verificar o acesso";
      descricaoEquipamentos = "Não foi possível verificar o acesso";
      descricaoEmprestimos = "Não foi possível verificar o acesso";
    } else if (perfil.ativo) {
      const podeAcessar = (moduloId: string) =>
        modulos
          .find((modulo) => modulo.id === moduloId)
          ?.perfis.includes(perfil.perfil as Perfil) === true;

      const [
        resultadoAlunos,
        resultadoChamados,
        resultadoEquipamentos,
        resultadoEmprestimos,
      ] = await Promise.all([
        podeAcessar("secretaria")
          ? supabase
              .from("alunos")
              .select("id", { count: "exact", head: true })
          : Promise.resolve(null),

        podeAcessar("ti")
          ? supabase
              .from("chamados")
              .select("id", { count: "exact", head: true })
          : Promise.resolve(null),

        podeAcessar("equipamentos")
          ? supabase
              .from("equipamentos")
              .select("id", { count: "exact", head: true })
          : Promise.resolve(null),

        podeAcessar("chromebooks")
          ? supabase
              .from("emprestimos")
              .select("id", { count: "exact", head: true })
              .is("devolvido_em", null)
          : Promise.resolve(null),
      ]);

      if (resultadoAlunos) {
        if (resultadoAlunos.error || resultadoAlunos.count === null) {
          descricaoAlunos = "Não foi possível carregar o total";
        } else {
          totalAlunos = resultadoAlunos.count;
          descricaoAlunos = "Alunos cadastrados";
        }
      }

      if (resultadoChamados) {
        if (resultadoChamados.error || resultadoChamados.count === null) {
          descricaoChamados = "Não foi possível carregar o total";
        } else {
          totalChamados = resultadoChamados.count;
          descricaoChamados = "Total de chamados";
        }
      }

      if (resultadoEquipamentos) {
        if (
          resultadoEquipamentos.error ||
          resultadoEquipamentos.count === null
        ) {
          descricaoEquipamentos = "Não foi possível carregar o total";
        } else {
          totalEquipamentos = resultadoEquipamentos.count;
          descricaoEquipamentos = "Equipamentos cadastrados";
        }
      }

      if (resultadoEmprestimos) {
        if (
          resultadoEmprestimos.error ||
          resultadoEmprestimos.count === null
        ) {
          descricaoEmprestimos = "Não foi possível carregar o total";
        } else {
          totalEmprestimos = resultadoEmprestimos.count;
          descricaoEmprestimos = "Empréstimos em aberto";
        }
      }
    }
  }

  const indicadores: Indicador[] = [
    {
      titulo: "Chamados de TI",
      icone: "🎫",
      valor: totalChamados,
      descricao: descricaoChamados,
    },
    {
      titulo: "Equipamentos",
      icone: "💻",
      valor: totalEquipamentos,
      descricao: descricaoEquipamentos,
    },
    {
      titulo: "Alunos",
      icone: "🎓",
      valor: totalAlunos,
      descricao: descricaoAlunos,
    },
    {
      titulo: "Empréstimos",
      icone: "📚",
      valor: totalEmprestimos,
      descricao: descricaoEmprestimos,
    },
  ];

  return (
    <section className="mt-8">
      <h2 className="mb-5 text-xl font-bold text-white">
        Visão geral
      </h2>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {indicadores.map((item) => (
          <div
            key={item.titulo}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
          >
            <div aria-hidden="true" className="mb-4 text-3xl">
              {item.icone}
            </div>

            <p className="text-sm text-slate-400">
              {item.titulo}
            </p>

            <p className="mt-3 text-3xl font-bold text-white">
              {item.valor}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              {item.descricao}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}