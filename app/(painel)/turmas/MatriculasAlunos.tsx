
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Aluno = {
  id: string;
  nome_completo: string;
};

type Turma = {
  id: string;
  nome: string;
  serie: string;
  turno: string;
  ano_letivo: number;
  capacidade: number;
};

type Matricula = {
  id: string;
  aluno_id: string;
  turma_id: string;
};

const supabase = createClient();

const classeInput =
  "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500";

export default function MatriculasAlunos() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [matriculas, setMatriculas] = useState<Matricula[]>([]);

  const [alunoId, setAlunoId] = useState("");
  const [turmaId, setTurmaId] = useState("");
  const [filtroTurma, setFiltroTurma] = useState("");

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [removendoId, setRemovendoId] = useState<string | null>(null);

  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  async function carregarDados() {
    setCarregando(true);

    const [
      resultadoAlunos,
      resultadoTurmas,
      resultadoMatriculas,
    ] = await Promise.all([
      supabase
        .from("alunos")
        .select("id,nome_completo")
        .eq("status", "ativo")
        .order("nome_completo"),

      supabase
        .from("turmas")
        .select(
          "id,nome,serie,turno,ano_letivo,capacidade"
        )
        .eq("status", "ativa")
        .order("ano_letivo", { ascending: false })
        .order("nome"),

      supabase
        .from("aluno_turmas")
        .select("id,aluno_id,turma_id"),
    ]);

    const falha = [
      resultadoAlunos.error,
      resultadoTurmas.error,
      resultadoMatriculas.error,
    ].find(Boolean);

    if (falha) {
      setErro("Erro ao carregar dados: " + falha.message);
    } else {
      setAlunos(resultadoAlunos.data ?? []);
      setTurmas(resultadoTurmas.data ?? []);
      setMatriculas(resultadoMatriculas.data ?? []);
    }

    setCarregando(false);
  }

  useEffect(() => {
    void carregarDados();
  }, []);

  function nomeTurma(turma: Turma) {
    return `${turma.serie} - ${turma.nome} (${turma.ano_letivo})`;
  }

  function quantidadeMatriculados(id: string) {
    return matriculas.filter(
      (matricula) => matricula.turma_id === id
    ).length;
  }

  const turmaSelecionada = turmas.find(
    (turma) => turma.id === turmaId
  );

  const ocupacao = turmaSelecionada
    ? quantidadeMatriculados(turmaSelecionada.id)
    : 0;

  const alunosDisponiveis = alunos.filter(
    (aluno) =>
      !matriculas.some(
        (matricula) =>
          matricula.aluno_id === aluno.id &&
          matricula.turma_id === turmaId
      )
  );

  const matriculasFiltradas = matriculas.filter(
    (matricula) =>
      !filtroTurma || matricula.turma_id === filtroTurma
  );

  function nomeAluno(id: string) {
    return (
      alunos.find((aluno) => aluno.id === id)?.nome_completo ??
      "Aluno não encontrado ou inativo"
    );
  }

  function descricaoTurma(id: string) {
    const turma = turmas.find((item) => item.id === id);

    return turma
      ? nomeTurma(turma)
      : "Turma não encontrada ou inativa";
  }

  async function matricularAluno() {
    setErro("");
    setMensagem("");

    if (!alunoId || !turmaId) {
      setErro("Selecione um aluno e uma turma.");
      return;
    }

    if (!turmaSelecionada) {
      setErro("Selecione uma turma ativa.");
      return;
    }

    if (ocupacao >= turmaSelecionada.capacidade) {
      setErro("Esta turma atingiu sua capacidade máxima.");
      return;
    }

    const jaMatriculado = matriculas.some(
      (matricula) =>
        matricula.aluno_id === alunoId &&
        matricula.turma_id === turmaId
    );

    if (jaMatriculado) {
      setErro("Este aluno já está matriculado nesta turma.");
      return;
    }

    setSalvando(true);

    const { data, error } = await supabase
      .from("aluno_turmas")
      .insert({
        aluno_id: alunoId,
        turma_id: turmaId,
      })
      .select("id");

    if (error) {
      setErro("Erro ao matricular aluno: " + error.message);
    } else if (!data?.length) {
      setErro(
        "A matrícula não foi realizada. Verifique suas permissões."
      );
    } else {
      setAlunoId("");
      await carregarDados();
      setMensagem("Aluno matriculado com sucesso!");
    }

    setSalvando(false);
  }

  async function removerMatricula(matricula: Matricula) {
    const confirmado = window.confirm(
      "Deseja remover este aluno da turma? O cadastro do aluno será mantido."
    );

    if (!confirmado) return;

    setErro("");
    setMensagem("");
    setRemovendoId(matricula.id);

    const { data, error } = await supabase
      .from("aluno_turmas")
      .delete()
      .eq("id", matricula.id)
      .select("id");

    if (error) {
      setErro("Erro ao remover matrícula: " + error.message);
    } else if (!data?.length) {
      setErro("Não foi possível remover a matrícula.");
    } else {
      await carregarDados();
      setMensagem("Matrícula removida com sucesso!");
    }

    setRemovendoId(null);
  }

  return (
    <section className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 text-white">
      <div>
        <h2 className="text-xl font-semibold">
          Matrícula de alunos por turma
        </h2>

        <p className="mt-2 text-sm text-slate-400">
          Matricule alunos cadastrados na Secretaria,
          acompanhe a ocupação e gerencie os vínculos
          com as turmas.
        </p>
      </div>

      {erro && (
        <p
          role="alert"
          className="rounded-xl border border-red-800 bg-red-950 p-4 text-red-300"
        >
          {erro}
        </p>
      )}

      {mensagem && (
        <p
          role="status"
          className="rounded-xl border border-green-800 bg-green-950 p-4 text-green-300"
        >
          {mensagem}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="block text-sm text-slate-300">
            Aluno
          </span>

          <select
            value={alunoId}
            onChange={(e) => setAlunoId(e.target.value)}
            className={classeInput}
          >
            <option value="">Selecione o aluno</option>

            {alunosDisponiveis.map((aluno) => (
              <option key={aluno.id} value={aluno.id}>
                {aluno.nome_completo}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="block text-sm text-slate-300">
            Turma
          </span>

          <select
            value={turmaId}
            onChange={(e) => {
              setTurmaId(e.target.value);
              setAlunoId("");
            }}
            className={classeInput}
          >
            <option value="">Selecione a turma</option>

            {turmas.map((turma) => (
              <option key={turma.id} value={turma.id}>
                {nomeTurma(turma)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {turmaSelecionada && (
        <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
          <p className="font-medium">
            Ocupação da turma
          </p>

          <p className="mt-2 text-2xl font-bold">
            {ocupacao} / {turmaSelecionada.capacidade}
          </p>

          <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-blue-600"
              style={{
                width: `${Math.min(
                  100,
                  (ocupacao /
                    turmaSelecionada.capacidade) *
                    100
                )}%`,
              }}
            />
          </div>

          <p className="mt-2 text-sm text-slate-400">
            {turmaSelecionada.capacidade - ocupacao} vagas
            disponíveis
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={matricularAluno}
        disabled={salvando || carregando}
        className="rounded-xl bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-500 disabled:opacity-50"
      >
        {salvando ? "Matriculando..." : "Matricular aluno"}
      </button>

      <div className="space-y-4">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <h3 className="text-lg font-semibold">
            Alunos matriculados ({matriculasFiltradas.length})
          </h3>

          <select
            value={filtroTurma}
            onChange={(e) => setFiltroTurma(e.target.value)}
            className={`${classeInput} md:max-w-sm`}
            aria-label="Filtrar matrículas por turma"
          >
            <option value="">Todas as turmas</option>

            {turmas.map((turma) => (
              <option key={turma.id} value={turma.id}>
                {nomeTurma(turma)}
              </option>
            ))}
          </select>
        </div>

        {carregando ? (
          <p className="text-slate-400">
            Carregando matrículas...
          </p>
        ) : matriculasFiltradas.length === 0 ? (
          <p className="text-slate-400">
            Nenhuma matrícula encontrada.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-700 text-slate-400">
                <tr>
                  <th className="p-3">Aluno</th>
                  <th className="p-3">Turma</th>
                  <th className="p-3">Ações</th>
                </tr>
              </thead>

              <tbody>
                {matriculasFiltradas.map((matricula) => (
                  <tr
                    key={matricula.id}
                    className="border-b border-slate-800"
                  >
                    <td className="p-3">
                      {nomeAluno(matricula.aluno_id)}
                    </td>

                    <td className="p-3">
                      {descricaoTurma(matricula.turma_id)}
                    </td>

                    <td className="p-3">
                      <button
                        type="button"
                        disabled={removendoId !== null}
                        onClick={() =>
                          removerMatricula(matricula)
                        }
                        className="rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-red-300 hover:bg-red-900 disabled:opacity-50"
                      >
                        {removendoId === matricula.id
                          ? "Removendo..."
                          : "Remover matrícula"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
