
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Aluno = {
  id: string;
  nome_completo: string;
  status: string;
};

type Professor = {
  id: string;
  nome_completo: string;
  status: string;
};

type Turma = {
  id: string;
  nome: string;
  serie: string;
  turno: string;
  ano_letivo: number;
  capacidade: number;
  status: string;
};

type Matricula = {
  id: string;
  aluno_id: string;
  turma_id: string;
};

type Vinculo = {
  id: string;
  professor_id: string;
  turma_id: string;
  disciplina_id: string;
};

type Disciplina = {
  id: string;
  nome: string;
};

const supabase = createClient();

export default function Relatorios() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [matriculas, setMatriculas] = useState<Matricula[]>([]);
  const [vinculos, setVinculos] = useState<Vinculo[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [anoFiltro, setAnoFiltro] = useState("todos");

  async function carregarDados() {
    setCarregando(true);
    setErro("");

    const [
      rAlunos,
      rProfessores,
      rTurmas,
      rMatriculas,
      rVinculos,
      rDisciplinas,
    ] = await Promise.all([
      supabase.from("alunos").select("id,nome_completo,status"),
      supabase.from("professores").select("id,nome_completo,status"),
      supabase
        .from("turmas")
        .select("id,nome,serie,turno,ano_letivo,capacidade,status"),
      supabase.from("aluno_turmas").select("id,aluno_id,turma_id"),
      supabase
        .from("professor_turmas")
        .select("id,professor_id,turma_id,disciplina_id"),
      supabase.from("disciplinas").select("id,nome"),
    ]);

    const falha = [
      rAlunos.error,
      rProfessores.error,
      rTurmas.error,
      rMatriculas.error,
      rVinculos.error,
      rDisciplinas.error,
    ].find(Boolean);

    if (falha) {
      setErro("Erro ao carregar relatórios: " + falha.message);
    } else {
      setAlunos(rAlunos.data ?? []);
      setProfessores(rProfessores.data ?? []);
      setTurmas(rTurmas.data ?? []);
      setMatriculas(rMatriculas.data ?? []);
      setVinculos(rVinculos.data ?? []);
      setDisciplinas(rDisciplinas.data ?? []);
    }

    setCarregando(false);
  }

  useEffect(() => {
    void carregarDados();
  }, []);

  const anos = Array.from(
    new Set(turmas.map((turma) => turma.ano_letivo))
  ).sort((a, b) => b - a);

  const turmasFiltradas = turmas.filter(
    (turma) =>
      anoFiltro === "todos" ||
      turma.ano_letivo === Number(anoFiltro)
  );

  const idsTurmas = new Set(turmasFiltradas.map((turma) => turma.id));

  const matriculasFiltradas = matriculas.filter(
    (matricula) => idsTurmas.has(matricula.turma_id)
  );

  const vinculosFiltrados = vinculos.filter(
    (vinculo) => idsTurmas.has(vinculo.turma_id)
  );

  const totalCapacidade = turmasFiltradas.reduce(
    (total, turma) => total + turma.capacidade,
    0
  );

  const totalMatriculas = matriculasFiltradas.length;

  const percentualOcupacao =
    totalCapacidade > 0
      ? Math.round((totalMatriculas / totalCapacidade) * 100)
      : 0;

  const alunosAtivos = alunos.filter(
    (aluno) => aluno.status === "ativo"
  ).length;

  const professoresAtivos = professores.filter(
    (professor) => professor.status === "ativo"
  ).length;

  function nomeAluno(id: string) {
    return (
      alunos.find((aluno) => aluno.id === id)?.nome_completo ??
      "Aluno não encontrado"
    );
  }

  function nomeProfessor(id: string) {
    return (
      professores.find((professor) => professor.id === id)
        ?.nome_completo ?? "Professor não encontrado"
    );
  }

  function nomeDisciplina(id: string) {
    return (
      disciplinas.find((disciplina) => disciplina.id === id)?.nome ??
      "Disciplina não encontrada"
    );
  }

  function nomeTurma(id: string) {
    const turma = turmas.find((item) => item.id === id);

    return turma
      ? `${turma.serie} - ${turma.nome} (${turma.ano_letivo})`
      : "Turma não encontrada";
  }

  function quantidadeAlunos(turmaId: string) {
    return matriculas.filter(
      (matricula) => matricula.turma_id === turmaId
    ).length;
  }

  function exportarCSV(
    nomeArquivo: string,
    cabecalhos: string[],
    linhas: (string | number)[][]
  ) {
    const escapar = (valor: string | number) =>
      `"${String(valor).replace(/"/g, '""')}"`;

    const conteudo = [
      cabecalhos.map(escapar).join(";"),
      ...linhas.map((linha) => linha.map(escapar).join(";")),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + conteudo], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  function exportarTurmas() {
    exportarCSV(
      "relatorio-turmas.csv",
      [
        "Turma",
        "Série",
        "Turno",
        "Ano letivo",
        "Capacidade",
        "Matriculados",
        "Situação",
      ],
      turmasFiltradas.map((turma) => [
        turma.nome,
        turma.serie,
        turma.turno,
        turma.ano_letivo,
        turma.capacidade,
        quantidadeAlunos(turma.id),
        turma.status,
      ])
    );
  }

  function exportarMatriculas() {
    exportarCSV(
      "relatorio-matriculas.csv",
      ["Aluno", "Turma"],
      matriculasFiltradas.map((matricula) => [
        nomeAluno(matricula.aluno_id),
        nomeTurma(matricula.turma_id),
      ])
    );
  }

  function exportarProfessores() {
    exportarCSV(
      "relatorio-professores-turmas.csv",
      ["Professor", "Turma", "Disciplina"],
      vinculosFiltrados.map((vinculo) => [
        nomeProfessor(vinculo.professor_id),
        nomeTurma(vinculo.turma_id),
        nomeDisciplina(vinculo.disciplina_id),
      ])
    );
  }

  const indicadores = [
    {
      titulo: "Alunos ativos",
      valor: alunosAtivos,
      icone: "🎓",
    },
    {
      titulo: "Professores ativos",
      valor: professoresAtivos,
      icone: "👨‍🏫",
    },
    {
      titulo: "Turmas",
      valor: turmasFiltradas.length,
      icone: "🏫",
    },
    {
      titulo: "Matrículas",
      valor: totalMatriculas,
      icone: "📚",
    },
  ];

  return (
    <div className="space-y-6 p-4 text-white md:p-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold">
            Relatórios escolares
          </h1>

          <p className="mt-2 text-slate-400">
            Indicadores e relatórios administrativos da escola.
          </p>
        </div>

        <button
          type="button"
          onClick={carregarDados}
          disabled={carregando}
          className="rounded-xl border border-slate-700 px-5 py-3 hover:bg-slate-800 disabled:opacity-50"
        >
          {carregando ? "Atualizando..." : "Atualizar dados"}
        </button>
      </div>

      {erro && (
        <p
          role="alert"
          className="rounded-xl border border-red-800 bg-red-950 p-4 text-red-300"
        >
          {erro}
        </p>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <label className="block max-w-sm space-y-2">
          <span className="block text-sm text-slate-300">
            Filtrar por ano letivo
          </span>

          <select
            value={anoFiltro}
            onChange={(e) => setAnoFiltro(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
          >
            <option value="todos">Todos os anos</option>

            {anos.map((ano) => (
              <option key={ano} value={ano}>
                {ano}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {indicadores.map((indicador) => (
          <div
            key={indicador.titulo}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
          >
            <span className="text-2xl">
              {indicador.icone}
            </span>

            <p className="mt-3 text-sm text-slate-400">
              {indicador.titulo}
            </p>

            <p className="mt-2 text-3xl font-bold">
              {carregando ? "..." : indicador.valor}
            </p>
          </div>
        ))}
      </div>

      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-xl font-semibold">
          Ocupação das turmas
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-slate-950 p-5">
            <p className="text-sm text-slate-400">
              Vagas disponíveis
            </p>

            <p className="mt-2 text-3xl font-bold">
              {Math.max(0, totalCapacidade - totalMatriculas)}
            </p>
          </div>

          <div className="rounded-xl bg-slate-950 p-5">
            <p className="text-sm text-slate-400">
              Capacidade total
            </p>

            <p className="mt-2 text-3xl font-bold">
              {totalCapacidade}
            </p>
          </div>

          <div className="rounded-xl bg-slate-950 p-5">
            <p className="text-sm text-slate-400">
              Taxa de ocupação
            </p>

            <p className="mt-2 text-3xl font-bold">
              {percentualOcupacao}%
            </p>
          </div>
        </div>

        <div className="h-4 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-blue-600"
            style={{
              width: `${Math.min(100, percentualOcupacao)}%`,
            }}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-700 text-slate-400">
              <tr>
                <th className="p-3">Turma</th>
                <th className="p-3">Ano</th>
                <th className="p-3">Matriculados</th>
                <th className="p-3">Capacidade</th>
                <th className="p-3">Ocupação</th>
              </tr>
            </thead>

            <tbody>
              {turmasFiltradas.map((turma) => {
                const matriculados = quantidadeAlunos(turma.id);

                const percentual =
                  turma.capacidade > 0
                    ? Math.round(
                        (matriculados / turma.capacidade) * 100
                      )
                    : 0;

                return (
                  <tr
                    key={turma.id}
                    className="border-b border-slate-800"
                  >
                    <td className="p-3">
                      {turma.serie} - {turma.nome}
                    </td>

                    <td className="p-3">
                      {turma.ano_letivo}
                    </td>

                    <td className="p-3">
                      {matriculados}
                    </td>

                    <td className="p-3">
                      {turma.capacidade}
                    </td>

                    <td className="p-3">
                      {percentual}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!carregando && turmasFiltradas.length === 0 && (
            <p className="py-5 text-slate-400">
              Nenhuma turma encontrada para o período selecionado.
            </p>
          )}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-xl font-semibold">
          Exportar relatórios
        </h2>

        <p className="text-sm text-slate-400">
          Baixe os dados em CSV, compatível com o Excel.
          O filtro de ano letivo também será aplicado aos arquivos.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={carregando || Boolean(erro)}
            onClick={exportarTurmas}
            className="rounded-xl bg-blue-600 px-5 py-3 font-medium hover:bg-blue-500 disabled:opacity-50"
          >
            Exportar turmas
          </button>

          <button
            type="button"
            disabled={carregando || Boolean(erro)}
            onClick={exportarMatriculas}
            className="rounded-xl bg-blue-600 px-5 py-3 font-medium hover:bg-blue-500 disabled:opacity-50"
          >
            Exportar matrículas
          </button>

          <button
            type="button"
            disabled={carregando || Boolean(erro)}
            onClick={exportarProfessores}
            className="rounded-xl bg-blue-600 px-5 py-3 font-medium hover:bg-blue-500 disabled:opacity-50"
          >
            Exportar professores
          </button>
        </div>
      </section>
    </div>
  );
}
