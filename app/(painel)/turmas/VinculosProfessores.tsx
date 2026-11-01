
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Professor = {
  id: string;
  nome_completo: string;
};

type Turma = {
  id: string;
  nome: string;
  serie: string;
  ano_letivo: number;
};

type Disciplina = {
  id: string;
  nome: string;
};

type Vinculo = {
  id: string;
  professor_id: string;
  turma_id: string;
  disciplina_id: string;
};

const supabase = createClient();

export default function VinculosProfessores() {
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [vinculos, setVinculos] = useState<Vinculo[]>([]);

  const [professorId, setProfessorId] = useState("");
  const [turmaId, setTurmaId] = useState("");
  const [disciplinaId, setDisciplinaId] = useState("");

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [removendoId, setRemovendoId] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  async function carregarDados() {
    setCarregando(true);
    setErro("");

    const [
      resultadoProfessores,
      resultadoTurmas,
      resultadoDisciplinas,
      resultadoVinculos,
    ] = await Promise.all([
      supabase
        .from("professores")
        .select("id,nome_completo")
        .eq("status", "ativo")
        .order("nome_completo"),

      supabase
        .from("turmas")
        .select("id,nome,serie,ano_letivo")
        .eq("status", "ativa")
        .order("nome"),

      supabase
        .from("disciplinas")
        .select("id,nome")
        .eq("status", "ativa")
        .order("nome"),

      supabase
        .from("professor_turmas")
        .select("id,professor_id,turma_id,disciplina_id"),
    ]);

    const falha = [
      resultadoProfessores.error,
      resultadoTurmas.error,
      resultadoDisciplinas.error,
      resultadoVinculos.error,
    ].find(Boolean);

    if (falha) {
      setErro("Erro ao carregar vínculos: " + falha.message);
    } else {
      setProfessores(resultadoProfessores.data ?? []);
      setTurmas(resultadoTurmas.data ?? []);
      setDisciplinas(resultadoDisciplinas.data ?? []);
      setVinculos(resultadoVinculos.data ?? []);
    }

    setCarregando(false);
  }

  useEffect(() => {
    void carregarDados();
  }, []);

  async function salvarVinculo() {
    setErro("");
    setMensagem("");

    if (!professorId || !turmaId || !disciplinaId) {
      setErro("Selecione professor, turma e disciplina.");
      return;
    }

    const jaExiste = vinculos.some(
      (vinculo) =>
        vinculo.professor_id === professorId &&
        vinculo.turma_id === turmaId &&
        vinculo.disciplina_id === disciplinaId
    );

    if (jaExiste) {
      setErro("Esse vínculo já está cadastrado.");
      return;
    }

    setSalvando(true);

    const { data, error } = await supabase
      .from("professor_turmas")
      .insert({
        professor_id: professorId,
        turma_id: turmaId,
        disciplina_id: disciplinaId,
      })
      .select("id");

    if (error) {
      setErro("Erro ao vincular professor: " + error.message);
    } else if (!data?.length) {
      setErro("O vínculo não foi salvo. Verifique suas permissões.");
    } else {
      setProfessorId("");
      setDisciplinaId("");
      await carregarDados();
      setMensagem("Professor vinculado à turma com sucesso!");
    }

    setSalvando(false);
  }

  async function removerVinculo(vinculo: Vinculo) {
    if (
      !window.confirm(
        "Deseja remover o vínculo deste professor com a turma?"
      )
    ) {
      return;
    }

    setErro("");
    setMensagem("");
    setRemovendoId(vinculo.id);

    const { data, error } = await supabase
      .from("professor_turmas")
      .delete()
      .eq("id", vinculo.id)
      .select("id");

    if (error) {
      setErro("Erro ao remover vínculo: " + error.message);
    } else if (!data?.length) {
      setErro("Não foi possível remover o vínculo.");
    } else {
      await carregarDados();
      setMensagem("Vínculo removido com sucesso!");
    }

    setRemovendoId(null);
  }

  function nomeProfessor(id: string) {
    return (
      professores.find((item) => item.id === id)?.nome_completo ??
      "Professor não encontrado ou inativo"
    );
  }

  function nomeTurma(id: string) {
    const turma = turmas.find((item) => item.id === id);

    return turma
      ? `${turma.serie} - ${turma.nome} (${turma.ano_letivo})`
      : "Turma não encontrada ou inativa";
  }

  function nomeDisciplina(id: string) {
    return (
      disciplinas.find((item) => item.id === id)?.nome ??
      "Disciplina não encontrada ou inativa"
    );
  }

  const classeInput =
    "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500";

  return (
    <section className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 text-white">
      <div>
        <h2 className="text-xl font-semibold">
          Professores e disciplinas por turma
        </h2>

        <p className="mt-2 text-sm text-slate-400">
          Defina quais professores lecionam cada disciplina nas turmas.
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

      <div className="grid gap-4 md:grid-cols-3">
        <label className="space-y-2">
          <span className="block text-sm text-slate-300">
            Professor
          </span>

          <select
            value={professorId}
            onChange={(e) => setProfessorId(e.target.value)}
            className={classeInput}
          >
            <option value="">Selecione o professor</option>
            {professores.map((professor) => (
              <option key={professor.id} value={professor.id}>
                {professor.nome_completo}
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
            onChange={(e) => setTurmaId(e.target.value)}
            className={classeInput}
          >
            <option value="">Selecione a turma</option>
            {turmas.map((turma) => (
              <option key={turma.id} value={turma.id}>
                {turma.serie} - {turma.nome} ({turma.ano_letivo})
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="block text-sm text-slate-300">
            Disciplina
          </span>

          <select
            value={disciplinaId}
            onChange={(e) => setDisciplinaId(e.target.value)}
            className={classeInput}
          >
            <option value="">Selecione a disciplina</option>
            {disciplinas.map((disciplina) => (
              <option key={disciplina.id} value={disciplina.id}>
                {disciplina.nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="button"
        onClick={salvarVinculo}
        disabled={salvando || carregando}
        className="rounded-xl bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-500 disabled:opacity-50"
      >
        {salvando ? "Salvando..." : "Vincular professor"}
      </button>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">
          Vínculos cadastrados ({vinculos.length})
        </h3>

        {carregando ? (
          <p className="text-slate-400">Carregando vínculos...</p>
        ) : vinculos.length === 0 ? (
          <p className="text-slate-400">
            Nenhum vínculo cadastrado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-700 text-slate-400">
                <tr>
                  <th className="p-3">Professor</th>
                  <th className="p-3">Turma</th>
                  <th className="p-3">Disciplina</th>
                  <th className="p-3">Ações</th>
                </tr>
              </thead>

              <tbody>
                {vinculos.map((vinculo) => (
                  <tr
                    key={vinculo.id}
                    className="border-b border-slate-800"
                  >
                    <td className="p-3">
                      {nomeProfessor(vinculo.professor_id)}
                    </td>

                    <td className="p-3">
                      {nomeTurma(vinculo.turma_id)}
                    </td>

                    <td className="p-3">
                      {nomeDisciplina(vinculo.disciplina_id)}
                    </td>

                    <td className="p-3">
                      <button
                        type="button"
                        disabled={removendoId !== null}
                        onClick={() => removerVinculo(vinculo)}
                        className="rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-red-300 hover:bg-red-900 disabled:opacity-50"
                      >
                        {removendoId === vinculo.id
                          ? "Removendo..."
                          : "Remover"}
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
