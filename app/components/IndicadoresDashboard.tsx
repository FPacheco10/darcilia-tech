import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { modulos, type Perfil } from "@/lib/config/modulos";

type Indicador = {
  titulo: string;
  icone: string;
  valor: number | string;
  descricao: string;
};

type ResumoFinanceiro = {
  recebido: number;
  pago: number;
  aReceber: number;
  aPagar: number;
};

function moeda(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

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

  let mostrarFinanceiro = false;
  let erroFinanceiro = "";
  let resumoFinanceiro: ResumoFinanceiro | null = null;

  // Consulta em páginas para não limitar o resumo à primeira
  // página de resultados retornada pelo Supabase.
  async function carregarResumoFinanceiro(): Promise<ResumoFinanceiro> {
    const resumo: ResumoFinanceiro = {
      recebido: 0,
      pago: 0,
      aReceber: 0,
      aPagar: 0,
    };

    const tamanhoPagina = 500;
    let inicio = 0;

    while (true) {
      const { data, error } = await supabase
        .from("lancamentos_financeiros")
        .select("id, tipo, status, valor")
        .in("status", ["pendente", "pago"])
        .order("id")
        .range(inicio, inicio + tamanhoPagina - 1);

      if (error || !data) {
        throw new Error("Não foi possível consultar o Financeiro.");
      }

      for (const item of data) {
        const valor = Number(item.valor);

        if (!Number.isFinite(valor) || valor <= 0) {
          throw new Error("Valor financeiro inválido.");
        }

        const centavos = Math.round(valor * 100);

        if (item.tipo === "receita" && item.status === "pago") {
          resumo.recebido += centavos;
        } else if (item.tipo === "despesa" && item.status === "pago") {
          resumo.pago += centavos;
        } else if (item.tipo === "receita" && item.status === "pendente") {
          resumo.aReceber += centavos;
        } else if (item.tipo === "despesa" && item.status === "pendente") {
          resumo.aPagar += centavos;
        }
      }

      if (data.length === 0) break;

      inicio += data.length;
    }

    return resumo;
  }

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

      mostrarFinanceiro =
        podeAcessar("financeiro") &&
        ["administrador", "financeiro"].includes(perfil.perfil);

      const [
        resultadoAlunos,
        resultadoChamados,
        resultadoEquipamentos,
        resultadoEmprestimos,
        resultadoFinanceiro,
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

        mostrarFinanceiro
          ? carregarResumoFinanceiro().catch(() => {
              erroFinanceiro = "Não foi possível carregar o resumo financeiro.";
              return null;
            })
          : Promise.resolve(null),
      ]);

      resumoFinanceiro = resultadoFinanceiro;

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
          descricaoEmprestimos = "Empréstimos de Chromebooks em aberto";
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

  const indicadoresFinanceiros = resumoFinanceiro
    ? [
        {
          titulo: "Receitas recebidas",
          valor: resumoFinanceiro.recebido,
          cor: "text-emerald-400",
        },
        {
          titulo: "Despesas pagas",
          valor: resumoFinanceiro.pago,
          cor: "text-rose-400",
        },
        {
          titulo: "Saldo realizado",
          valor: resumoFinanceiro.recebido - resumoFinanceiro.pago,
          cor: "text-blue-400",
        },
        {
          titulo: "A receber",
          valor: resumoFinanceiro.aReceber,
          cor: "text-amber-400",
        },
        {
          titulo: "A pagar",
          valor: resumoFinanceiro.aPagar,
          cor: "text-orange-400",
        },
      ]
    : [];

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

            <p className="text-sm text-slate-400">{item.titulo}</p>

            <p className="mt-3 text-3xl font-bold text-white">
              {item.valor}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              {item.descricao}
            </p>
          </div>
        ))}
      </div>

      {mostrarFinanceiro && (
        <section className="mt-10">
          <h3 className="text-xl font-bold text-white">
            Resumo financeiro
          </h3>

          <p className="mt-2 mb-5 text-sm text-slate-400">
            Todos os períodos, sem filtros. Cancelados não entram nos
            totais. O saldo realizado considera receitas recebidas menos
            despesas pagas, sem saldo inicial.
          </p>

          {erroFinanceiro ? (
            <p
              role="alert"
              className="rounded-lg border border-red-800 bg-red-950 p-4 text-red-200"
            >
              {erroFinanceiro}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {indicadoresFinanceiros.map((item) => (
                <div
                  key={item.titulo}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
                >
                  <p className="text-sm text-slate-400">
                    {item.titulo}
                  </p>

                  <p className={`mt-3 text-2xl font-bold ${item.cor}`}>
                    {moeda(item.valor)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </section>
  );
}