
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type Professor = {
  id: string;
  nome_completo: string;
  email: string | null;
  telefone: string | null;
  matricula: string | null;
  formacao: string | null;
  especialidade: string | null;
  status: "ativo" | "inativo";
};

type Formulario = {
  nome_completo: string;
  email: string;
  telefone: string;
  matricula: string;
  formacao: string;
  especialidade: string;
};

const formularioVazio: Formulario = {
  nome_completo: "",
  email: "",
  telefone: "",
  matricula: "",
  formacao: "",
  especialidade: "",
};

const supabase = createClient();

export default function Professores() {
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [busca, setBusca] = useState("");
  const [formulario, setFormulario] = useState<Formulario>({
    ...formularioVazio,
  });

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [alterandoId, setAlterandoId] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  async function carregarProfessores() {
    setCarregando(true);

    const { data, error } = await supabase
      .from("professores")
      .select(
        "id,nome_completo,email,telefone,matricula,formacao,especialidade,status"
      )
      .order("nome_completo", { ascending: true });

    if (error) {
      setErro("Erro ao carregar professores: " + error.message);
    } else {
      setProfessores((data ?? []) as Professor[]);
    }

    setCarregando(false);
  }

  useEffect(() => {
    void carregarProfessores();
  }, []);

  function atualizarCampo(campo: keyof Formulario, valor: string) {
    setFormulario((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  }

  function limparFormulario() {
    setFormulario({ ...formularioVazio });
    setEditandoId(null);
  }

  function editarProfessor(professor: Professor) {
    setFormulario({
      nome_completo: professor.nome_completo,
      email: professor.email ?? "",
      telefone: professor.telefone ?? "",
      matricula: professor.matricula ?? "",
      formacao: professor.formacao ?? "",
      especialidade: professor.especialidade ?? "",
    });

    setEditandoId(professor.id);
    setMensagem("");
    setErro("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function salvarProfessor(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    setMensagem("");
    setErro("");

    if (!formulario.nome_completo.trim()) {
      setErro("Informe o nome completo do professor.");
      return;
    }

    setSalvando(true);

    const dados = {
      nome_completo: formulario.nome_completo.trim(),
      email: formulario.email.trim() || null,
      telefone: formulario.telefone.trim() || null,
      matricula: formulario.matricula.trim() || null,
      formacao: formulario.formacao.trim() || null,
      especialidade: formulario.especialidade.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const resultado = editandoId
      ? await supabase
          .from("professores")
          .update(dados)
          .eq("id", editandoId)
          .select("id")
      : await supabase
          .from("professores")
          .insert(dados)
          .select("id");

    if (resultado.error) {
      setErro("Não foi possível salvar: " + resultado.error.message);
    } else if (!resultado.data?.length) {
      setErro("Nenhum registro foi salvo. Verifique suas permissões.");
    } else {
      const estavaEditando = Boolean(editandoId);

      limparFormulario();

      await carregarProfessores();

      setMensagem(
        estavaEditando
          ? "Professor atualizado com sucesso!"
          : "Professor cadastrado com sucesso!"
      );
    }

    setSalvando(false);
  }

  async function alterarStatus(professor: Professor) {
    const novoStatus =
      professor.status === "ativo" ? "inativo" : "ativo";

    const confirmado = window.confirm(
      `Deseja ${novoStatus === "ativo" ? "ativar" : "desativar"} o professor "${professor.nome_completo}"?`
    );

    if (!confirmado) return;

    setErro("");
    setMensagem("");
    setAlterandoId(professor.id);

    const { data, error } = await supabase
      .from("professores")
      .update({
        status: novoStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", professor.id)
      .select("id");

    if (error) {
      setErro("Erro ao alterar situação: " + error.message);
    } else if (!data?.length) {
      setErro("A alteração não foi permitida.");
    } else {
      await carregarProfessores();

      setMensagem(
        `Professor ${novoStatus === "ativo" ? "ativado" : "desativado"} com sucesso!`
      );
    }

    setAlterandoId(null);
  }

  async function excluirProfessor(professor: Professor) {
    const confirmado = window.confirm(
      `ATENÇÃO!\n\nDeseja excluir permanentemente o professor "${professor.nome_completo}"?\n\nEssa ação não poderá ser desfeita.`
    );

    if (!confirmado) return;

    setErro("");
    setMensagem("");
    setAlterandoId(professor.id);

    const { data, error } = await supabase
      .from("professores")
      .delete()
      .eq("id", professor.id)
      .select("id");

    if (error) {
      setErro("Erro ao excluir professor: " + error.message);
    } else if (!data?.length) {
      setErro("O professor não foi excluído. Verifique suas permissões.");
    } else {
      if (editandoId === professor.id) {
        limparFormulario();
      }

      await carregarProfessores();

      setMensagem("Professor excluído com sucesso!");
    }

    setAlterandoId(null);
  }

  const professoresFiltrados = professores.filter((professor) => {
    const termo = busca.toLocaleLowerCase("pt-BR");

    return (
      professor.nome_completo.toLocaleLowerCase("pt-BR").includes(termo) ||
      (professor.matricula ?? "")
        .toLocaleLowerCase("pt-BR")
        .includes(termo) ||
      (professor.especialidade ?? "")
        .toLocaleLowerCase("pt-BR")
        .includes(termo)
    );
  });

  const ativos = professores.filter(
    (professor) => professor.status === "ativo"
  ).length;

  function campo(
    titulo: string,
    chave: keyof Formulario,
    tipo = "text"
  ) {
    return (
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-300">
          {titulo}
        </span>

        <input
          type={tipo}
          value={formulario[chave]}
          onChange={(evento) =>
            atualizarCampo(chave, evento.target.value)
          }
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
          placeholder={titulo}
        />
      </label>
    );
  }

  return (
    <div className="space-y-6 p-4 text-white md:p-8">
      <div>
        <h1 className="text-3xl font-bold">
          Gestão de Professores
        </h1>

        <p className="mt-2 text-slate-400">
          Cadastro, consulta e gerenciamento dos professores.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Total de professores", professores.length],
          ["Professores ativos", ativos],
          ["Professores inativos", professores.length - ativos],
        ].map(([titulo, quantidade]) => (
          <div
            key={titulo}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
          >
            <p className="text-sm text-slate-400">{titulo}</p>

            <p className="mt-2 text-3xl font-bold">
              {quantidade}
            </p>
          </div>
        ))}
      </div>

      {mensagem && (
        <p
          role="status"
          className="rounded-xl border border-green-800 bg-green-950 p-4 text-green-300"
        >
          {mensagem}
        </p>
      )}

      {erro && (
        <p
          role="alert"
          className="rounded-xl border border-red-800 bg-red-950 p-4 text-red-300"
        >
          {erro}
        </p>
      )}

      <form
        onSubmit={salvarProfessor}
        className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-6"
      >
        <h2 className="text-xl font-semibold">
          {editandoId ? "Editar professor" : "Cadastrar professor"}
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          {campo("Nome completo", "nome_completo")}
          {campo("Matrícula", "matricula")}
          {campo("E-mail", "email", "email")}
          {campo("Telefone", "telefone", "tel")}
          {campo("Formação", "formacao")}
          {campo("Especialidade / Disciplina", "especialidade")}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={salvando || alterandoId !== null}
            className="rounded-xl bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-500 disabled:opacity-50"
          >
            {salvando
              ? "Salvando..."
              : editandoId
                ? "Salvar alterações"
                : "Cadastrar professor"}
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

      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <h2 className="text-xl font-semibold">
            Professores cadastrados
          </h2>

          <input
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Pesquisar nome, matrícula ou disciplina"
            aria-label="Pesquisar professores"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500 md:max-w-sm"
          />
        </div>

        {carregando ? (
          <p className="text-slate-400">
            Carregando professores...
          </p>
        ) : professoresFiltrados.length === 0 ? (
          <p className="text-slate-400">
            Nenhum professor encontrado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-700 text-slate-400">
                <tr>
                  <th className="p-3">Professor</th>
                  <th className="p-3">Matrícula</th>
                  <th className="p-3">Especialidade</th>
                  <th className="p-3">Situação</th>
                  <th className="p-3">Ações</th>
                </tr>
              </thead>

              <tbody>
                {professoresFiltrados.map((professor) => (
                  <tr
                    key={professor.id}
                    className="border-b border-slate-800"
                  >
                    <td className="p-3">
                      <p className="font-medium">
                        {professor.nome_completo}
                      </p>

                      <p className="text-xs text-slate-400">
                        {professor.email || "Sem e-mail"}
                      </p>
                    </td>

                    <td className="p-3">
                      {professor.matricula || "—"}
                    </td>

                    <td className="p-3">
                      {professor.especialidade || "—"}
                    </td>

                    <td className="p-3">
                      <span
                        className={
                          professor.status === "ativo"
                            ? "rounded-lg bg-green-950 px-3 py-1 text-green-300"
                            : "rounded-lg bg-slate-800 px-3 py-1 text-slate-300"
                        }
                      >
                        {professor.status === "ativo"
                          ? "Ativo"
                          : "Inativo"}
                      </span>
                    </td>

                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={alterandoId !== null}
                          onClick={() => editarProfessor(professor)}
                          className="rounded-lg bg-slate-800 px-3 py-2 hover:bg-slate-700 disabled:opacity-50"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          disabled={alterandoId !== null}
                          onClick={() => alterarStatus(professor)}
                          className="rounded-lg border border-slate-700 px-3 py-2 hover:bg-slate-800 disabled:opacity-50"
                        >
                          {alterandoId === professor.id
                            ? "Aguarde..."
                            : professor.status === "ativo"
                              ? "Desativar"
                              : "Ativar"}
                        </button>

                        <button
                          type="button"
                          disabled={alterandoId !== null}
                          onClick={() => excluirProfessor(professor)}
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
      </section>
    </div>
  );
}
