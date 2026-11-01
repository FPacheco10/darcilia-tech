
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import VinculosProfessores from "./VinculosProfessores";
import MatriculasAlunos from "./MatriculasAlunos";

type Turma = {
  id: string;
  nome: string;
  serie: string;
  turno: "matutino" | "vespertino" | "noturno" | "integral";
  ano_letivo: number;
  capacidade: number;
  status: "ativa" | "inativa";
};

type Formulario = {
  nome: string;
  serie: string;
  turno: Turma["turno"];
  ano_letivo: string;
  capacidade: string;
};

const formularioInicial: Formulario = {
  nome: "",
  serie: "",
  turno: "matutino",
  ano_letivo: String(new Date().getFullYear()),
  capacidade: "30",
};

const supabase = createClient();

const classeInput =
  "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500";

export default function Turmas() {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [formulario, setFormulario] = useState<Formulario>({
    ...formularioInicial,
  });

  const [busca, setBusca] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [alterandoId, setAlterandoId] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  async function carregarTurmas() {
    setCarregando(true);

    const { data, error } = await supabase
      .from("turmas")
      .select(
        "id,nome,serie,turno,ano_letivo,capacidade,status"
      )
      .order("ano_letivo", { ascending: false })
      .order("nome", { ascending: true });

    if (error) {
      setErro("Erro ao carregar turmas: " + error.message);
    } else {
      setTurmas((data ?? []) as Turma[]);
    }

    setCarregando(false);
  }

  useEffect(() => {
    void carregarTurmas();
  }, []);

  function atualizarCampo(
    campo: keyof Formulario,
    valor: string
  ) {
    setFormulario((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  }

  function limparFormulario() {
    setFormulario({ ...formularioInicial });
    setEditandoId(null);
  }

  function editarTurma(turma: Turma) {
    setFormulario({
      nome: turma.nome,
      serie: turma.serie,
      turno: turma.turno,
      ano_letivo: String(turma.ano_letivo),
      capacidade: String(turma.capacidade),
    });

    setEditandoId(turma.id);
    setErro("");
    setMensagem("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function salvarTurma(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();

    setErro("");
    setMensagem("");

    const ano = Number(formulario.ano_letivo);
    const capacidade = Number(formulario.capacidade);

    if (
      !formulario.nome.trim() ||
      !formulario.serie.trim()
    ) {
      setErro("Preencha o nome e a série da turma.");
      return;
    }

    if (
      !Number.isInteger(ano) ||
      ano < 2020 ||
      ano > 2100
    ) {
      setErro("Informe um ano letivo entre 2020 e 2100.");
      return;
    }

    if (
      !Number.isInteger(capacidade) ||
      capacidade <= 0
    ) {
      setErro(
        "A capacidade deve ser um número inteiro maior que zero."
      );
      return;
    }

    setSalvando(true);

    const dados = {
      nome: formulario.nome.trim(),
      serie: formulario.serie.trim(),
      turno: formulario.turno,
      ano_letivo: ano,
      capacidade,
      updated_at: new Date().toISOString(),
    };

    const resultado = editandoId
      ? await supabase
          .from("turmas")
          .update(dados)
          .eq("id", editandoId)
          .select("id")
      : await supabase
          .from("turmas")
          .insert(dados)
          .select("id");

    if (resultado.error) {
      setErro(
        "Erro ao salvar turma: " + resultado.error.message
      );
    } else if (!resultado.data?.length) {
      setErro(
        "A operação não foi permitida. Verifique suas permissões."
      );
    } else {
      const estavaEditando = Boolean(editandoId);

      limparFormulario();
      await carregarTurmas();

      setMensagem(
        estavaEditando
          ? "Turma atualizada com sucesso!"
          : "Turma cadastrada com sucesso!"
      );
    }

    setSalvando(false);
  }

  async function alterarStatus(turma: Turma) {
    const novoStatus =
      turma.status === "ativa" ? "inativa" : "ativa";

    const confirmado = window.confirm(
      `Deseja ${
        novoStatus === "ativa" ? "ativar" : "desativar"
      } a turma "${turma.nome}"?`
    );

    if (!confirmado) return;

    setAlterandoId(turma.id);
    setErro("");
    setMensagem("");

    try {
      const { data, error } = await supabase
        .from("turmas")
        .update({
          status: novoStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", turma.id)
        .select("id");

      if (error) throw error;

      if (!data?.length) {
        throw new Error(
          "A alteração não foi permitida."
        );
      }

      await carregarTurmas();

      setMensagem(
        `Turma ${
          novoStatus === "ativa" ? "ativada" : "desativada"
        } com sucesso!`
      );
    } catch (error) {
      setErro(
        "Erro ao alterar situação: " +
          (error instanceof Error
            ? error.message
            : String(error))
      );
    } finally {
      setAlterandoId(null);
    }
  }

  async function excluirTurma(turma: Turma) {
    const confirmado = window.confirm(
      `ATENÇÃO!\n\nDeseja excluir permanentemente a turma "${turma.nome}" (${turma.serie} - ${turma.ano_letivo})?\n\nEssa ação não poderá ser desfeita.`
    );

    if (!confirmado) return;

    setAlterandoId(turma.id);
    setErro("");
    setMensagem("");

    try {
      // Verifica se existem alunos vinculados.
      const {
        count: totalAlunos,
        error: erroAlunos,
      } = await supabase
        .from("aluno_turmas")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("turma_id", turma.id);

      if (erroAlunos) throw erroAlunos;

      if ((totalAlunos ?? 0) > 0) {
        setErro(
          "Não é possível excluir uma turma com alunos vinculados. Utilize a opção Desativar."
        );
        return;
      }

      // Verifica se existem professores vinculados.
      const {
        count: totalProfessores,
        error: erroProfessores,
      } = await supabase
        .from("professor_turmas")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("turma_id", turma.id);

      if (erroProfessores) throw erroProfessores;

      if ((totalProfessores ?? 0) > 0) {
        setErro(
          "Não é possível excluir uma turma com professores vinculados. Utilize a opção Desativar."
        );
        return;
      }

      // Exclui somente se não houver vínculos.
      const { data, error } = await supabase
        .from("turmas")
        .delete()
        .eq("id", turma.id)
        .select("id");

      if (error) throw error;

      if (!data?.length) {
        throw new Error(
          "A turma não foi excluída. Verifique suas permissões."
        );
      }

      if (editandoId === turma.id) {
        limparFormulario();
      }

      await carregarTurmas();

      setMensagem("Turma excluída com sucesso!");
    } catch (error) {
      setErro(
        "Erro ao excluir turma: " +
          (error instanceof Error
            ? error.message
            : String(error))
      );
    } finally {
      setAlterandoId(null);
    }
  }

  const turmasFiltradas = turmas.filter((turma) => {
    const termo = busca.toLocaleLowerCase("pt-BR");

    return [
      turma.nome,
      turma.serie,
      turma.turno,
      String(turma.ano_letivo),
    ].some((valor) =>
      valor.toLocaleLowerCase("pt-BR").includes(termo)
    );
  });

  const turmasAtivas = turmas.filter(
    (turma) => turma.status === "ativa"
  ).length;

  return (
    <div className="space-y-6 p-4 text-white md:p-8">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-3xl font-bold">
          Gestão de Turmas
        </h1>

        <p className="mt-2 text-slate-400">
          Cadastre, organize e gerencie as turmas da escola.
        </p>
      </div>

      {/* Indicadores */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Total de turmas", turmas.length],
          ["Turmas ativas", turmasAtivas],
          [
            "Turmas inativas",
            turmas.length - turmasAtivas,
          ],
        ].map(([titulo, quantidade]) => (
          <div
            key={titulo}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
          >
            <p className="text-sm text-slate-400">
              {titulo}
            </p>

            <p className="mt-2 text-3xl font-bold">
              {quantidade}
            </p>
          </div>
        ))}
      </div>

      {/* Mensagens */}
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

      {/* Formulário */}
      <form
        onSubmit={salvarTurma}
        className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-6"
      >
        <h2 className="text-xl font-semibold">
          {editandoId
            ? "Editar turma"
            : "Cadastrar turma"}
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="block text-sm text-slate-300">
              Nome da turma
            </span>

            <input
              required
              value={formulario.nome}
              onChange={(e) =>
                atualizarCampo("nome", e.target.value)
              }
              placeholder="Ex.: Turma A"
              className={classeInput}
            />
          </label>

          <label className="space-y-2">
            <span className="block text-sm text-slate-300">
              Série / Ano escolar
            </span>

            <input
              required
              value={formulario.serie}
              onChange={(e) =>
                atualizarCampo("serie", e.target.value)
              }
              placeholder="Ex.: 6º Ano"
              className={classeInput}
            />
          </label>

          <label className="space-y-2">
            <span className="block text-sm text-slate-300">
              Turno
            </span>

            <select
              value={formulario.turno}
              onChange={(e) =>
                atualizarCampo("turno", e.target.value)
              }
              className={classeInput}
            >
              <option value="matutino">Matutino</option>
              <option value="vespertino">Vespertino</option>
              <option value="noturno">Noturno</option>
              <option value="integral">Integral</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="block text-sm text-slate-300">
              Ano letivo
            </span>

            <input
              required
              type="number"
              min={2020}
              max={2100}
              value={formulario.ano_letivo}
              onChange={(e) =>
                atualizarCampo(
                  "ano_letivo",
                  e.target.value
                )
              }
              className={classeInput}
            />
          </label>

          <label className="space-y-2">
            <span className="block text-sm text-slate-300">
              Capacidade de alunos
            </span>

            <input
              required
              type="number"
              min={1}
              value={formulario.capacidade}
              onChange={(e) =>
                atualizarCampo(
                  "capacidade",
                  e.target.value
                )
              }
              className={classeInput}
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={
              salvando || alterandoId !== null
            }
            className="rounded-xl bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-500 disabled:opacity-50"
          >
            {salvando
              ? "Salvando..."
              : editandoId
                ? "Salvar alterações"
                : "Cadastrar turma"}
          </button>

          {editandoId && (
            <button
              type="button"
              onClick={limparFormulario}
              className="rounded-xl border border-slate-700 px-6 py-3 hover:bg-slate-800"
            >
              Cancelar edição
            </button>
          )}
        </div>
      </form>

      {/* Listagem */}
      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <h2 className="text-xl font-semibold">
            Turmas cadastradas
          </h2>

          <input
            value={busca}
            onChange={(e) =>
              setBusca(e.target.value)
            }
            placeholder="Pesquisar turma, série, turno ou ano"
            aria-label="Pesquisar turmas"
            className={`${classeInput} md:max-w-sm`}
          />
        </div>

        {carregando ? (
          <p className="text-slate-400">
            Carregando turmas...
          </p>
        ) : turmasFiltradas.length === 0 ? (
          <p className="text-slate-400">
            Nenhuma turma encontrada.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-700 text-slate-400">
                <tr>
                  <th className="p-3">Turma</th>
                  <th className="p-3">Série</th>
                  <th className="p-3">Turno</th>
                  <th className="p-3">Ano</th>
                  <th className="p-3">Capacidade</th>
                  <th className="p-3">Situação</th>
                  <th className="p-3">Ações</th>
                </tr>
              </thead>

              <tbody>
                {turmasFiltradas.map((turma) => (
                  <tr
                    key={turma.id}
                    className="border-b border-slate-800"
                  >
                    <td className="p-3 font-medium">
                      {turma.nome}
                    </td>

                    <td className="p-3">
                      {turma.serie}
                    </td>

                    <td className="p-3 capitalize">
                      {turma.turno}
                    </td>

                    <td className="p-3">
                      {turma.ano_letivo}
                    </td>

                    <td className="p-3">
                      {turma.capacidade}
                    </td>

                    <td className="p-3">
                      <span
                        className={
                          turma.status === "ativa"
                            ? "rounded-lg bg-green-950 px-3 py-1 text-green-300"
                            : "rounded-lg bg-slate-800 px-3 py-1 text-slate-300"
                        }
                      >
                        {turma.status === "ativa"
                          ? "Ativa"
                          : "Inativa"}
                      </span>
                    </td>

                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={
                            alterandoId !== null ||
                            salvando
                          }
                          onClick={() =>
                            editarTurma(turma)
                          }
                          className="rounded-lg bg-slate-800 px-3 py-2 hover:bg-slate-700 disabled:opacity-50"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          disabled={
                            alterandoId !== null ||
                            salvando
                          }
                          onClick={() =>
                            alterarStatus(turma)
                          }
                          className="rounded-lg border border-slate-700 px-3 py-2 hover:bg-slate-800 disabled:opacity-50"
                        >
                          {alterandoId === turma.id
                            ? "Aguarde..."
                            : turma.status === "ativa"
                              ? "Desativar"
                              : "Ativar"}
                        </button>

                        <button
                          type="button"
                          disabled={
                            alterandoId !== null ||
                            salvando
                          }
                          onClick={() =>
                            excluirTurma(turma)
                          }
                          className="rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-red-300 hover:bg-red-900 disabled:opacity-50"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <VinculosProfessores />
        
        <MatriculasAlunos />
      </section>
    </div>
  );
}
