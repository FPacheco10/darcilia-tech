"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type Aluno = {
  id: string;
  nome_completo: string;
  turma: string | null;
  responsavel: string | null;
  telefone: string | null;
};

const campos = "id, nome_completo, turma, responsavel, telefone";

export default function Secretaria() {
  const [supabase] = useState(() => createClient());

  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [pesquisa, setPesquisa] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [alunoSelecionado, setAlunoSelecionado] = useState<Aluno | null>(null);
  const [idEdicao, setIdEdicao] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [turma, setTurma] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [telefone, setTelefone] = useState("");

  useEffect(() => {
    let ativo = true;

    async function carregarAlunos() {
      try {
        const { data, error } = await supabase
          .from("alunos")
          .select(campos)
          .order("nome_completo");

        if (!ativo) return;

        if (error) {
          setErro(`Não foi possível carregar os alunos: ${error.message}`);
          return;
        }

        setAlunos(data ?? []);
      } catch {
        if (ativo) {
          setErro("Falha de conexão ao carregar os alunos. Atualize a página.");
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    void carregarAlunos();

    return () => {
      ativo = false;
    };
  }, [supabase]);

  function limparFormulario() {
    setNome("");
    setTurma("");
    setResponsavel("");
    setTelefone("");
    setIdEdicao(null);
    setMostrarFormulario(false);
  }

  function novoAluno() {
    limparFormulario();
    setAlunoSelecionado(null);
    setErro("");
    setMensagem("");
    setMostrarFormulario(true);
  }

  function editarAluno(aluno: Aluno) {
    setIdEdicao(aluno.id);
    setNome(aluno.nome_completo);
    setTurma(aluno.turma ?? "");
    setResponsavel(aluno.responsavel ?? "");
    setTelefone(aluno.telefone ?? "");
    setAlunoSelecionado(null);
    setErro("");
    setMensagem("");
    setMostrarFormulario(true);
  }

  async function salvarAluno(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (salvando) return;

    setErro("");
    setMensagem("");

    const dados = {
      nome_completo: nome.trim(),
      turma: turma.trim(),
      responsavel: responsavel.trim(),
      telefone: telefone.trim(),
    };

    if (Object.values(dados).some((valor) => !valor)) {
      setErro("Preencha todos os campos do formulário.");
      return;
    }

    setSalvando(true);

    try {
      const consulta =
        idEdicao !== null
          ? supabase
              .from("alunos")
              .update({
                ...dados,
                updated_at: new Date().toISOString(),
              })
              .eq("id", idEdicao)
          : supabase.from("alunos").insert(dados);

      const { data, error } = await consulta.select(campos).single();

      if (error) {
        setErro(`Não foi possível salvar o aluno: ${error.message}`);
        return;
      }

      setAlunos((lista) => {
        const atualizada = idEdicao
          ? lista.map((aluno) => (aluno.id === idEdicao ? data : aluno))
          : [...lista, data];

        return atualizada.sort((a, b) =>
          a.nome_completo.localeCompare(b.nome_completo, "pt-BR")
        );
      });

      setMensagem(
        idEdicao ? "Cadastro atualizado!" : "Aluno cadastrado!"
      );

      limparFormulario();
    } catch {
      setErro(
        "Falha de conexão ao salvar. Atualize a página para conferir se o cadastro foi gravado antes de tentar novamente."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function excluirAluno(aluno: Aluno) {
    if (excluindo !== null || salvando) return;

    const confirmar = window.confirm(
      `Deseja excluir o cadastro de ${aluno.nome_completo}?`
    );

    if (!confirmar) return;

    setErro("");
    setMensagem("");
    setExcluindo(aluno.id);

    try {
      const { data, error } = await supabase
        .from("alunos")
        .delete()
        .eq("id", aluno.id)
        .select("id")
        .single();

      if (error || !data) {
        setErro(
          `Não foi possível excluir o aluno: ${
            error?.message ?? "Nenhum cadastro foi excluído."
          }`
        );
        return;
      }

      setAlunos((lista) => lista.filter((item) => item.id !== aluno.id));
      setAlunoSelecionado(null);

      if (idEdicao === aluno.id) limparFormulario();

      setMensagem("Aluno excluído!");
    } catch {
      setErro(
        "Falha de conexão ao excluir. Atualize a página para conferir o resultado."
      );
    } finally {
      setExcluindo(null);
    }
  }

  const alunosFiltrados = alunos.filter((aluno) =>
    aluno.nome_completo
      .toLocaleLowerCase("pt-BR")
      .includes(pesquisa.trim().toLocaleLowerCase("pt-BR"))
  );

  const ocupado = salvando || excluindo !== null;

  const classeInput =
    "w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none";

  const classeBotao =
    "rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <main className="mx-auto max-w-7xl">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-blue-400">
            DARCILIA TECH / SECRETARIA
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Gestão de Alunos
          </h1>

          <p className="mt-2 text-slate-400">
            Cadastro e acompanhamento de alunos.
          </p>
        </div>

        <button
          type="button"
          onClick={novoAluno}
          disabled={ocupado || carregando}
          className={classeBotao}
        >
          + Novo aluno
        </button>
      </header>

      {erro && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-red-800 bg-red-950 p-4 text-red-200"
        >
          {erro}
        </div>
      )}

      {mensagem && (
        <div
          role="status"
          className="mb-6 rounded-lg border border-emerald-800 bg-emerald-950 p-4 text-emerald-200"
        >
          {mensagem}
        </div>
      )}

      <section className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm text-slate-400">Alunos cadastrados</p>
          <p className="mt-2 text-3xl font-bold text-blue-400">
            {carregando ? "—" : alunos.length}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm text-slate-400">Resultados da pesquisa</p>
          <p className="mt-2 text-3xl font-bold">
            {carregando ? "—" : alunosFiltrados.length}
          </p>
        </div>
      </section>

      {mostrarFormulario && (
        <form
          onSubmit={salvarAluno}
          className="mb-8 rounded-xl border border-slate-800 bg-slate-900 p-6"
        >
          <h2 className="mb-5 text-xl font-bold">
            {idEdicao ? "Editar aluno" : "Cadastrar novo aluno"}
          </h2>

          <fieldset disabled={ocupado} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span>Nome completo do aluno</span>
                <input
                  required
                  value={nome}
                  onChange={(event) => setNome(event.target.value)}
                  className={classeInput}
                />
              </label>

              <label className="space-y-2 text-sm">
                <span>Turma</span>
                <input
                  required
                  value={turma}
                  onChange={(event) => setTurma(event.target.value)}
                  className={classeInput}
                />
              </label>

              <label className="space-y-2 text-sm">
                <span>Nome do responsável</span>
                <input
                  required
                  value={responsavel}
                  onChange={(event) => setResponsavel(event.target.value)}
                  className={classeInput}
                />
              </label>

              <label className="space-y-2 text-sm">
                <span>Telefone do responsável</span>
                <input
                  required
                  type="tel"
                  value={telefone}
                  onChange={(event) => setTelefone(event.target.value)}
                  className={classeInput}
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={ocupado}
                className={classeBotao}
              >
                {salvando
                  ? "Salvando..."
                  : idEdicao
                    ? "Salvar alterações"
                    : "Cadastrar aluno"}
              </button>

              <button
                type="button"
                onClick={limparFormulario}
                className="rounded-lg border border-slate-700 px-5 py-3"
              >
                Cancelar
              </button>
            </div>
          </fieldset>
        </form>
      )}

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-xl font-bold">Alunos cadastrados</h2>

        <label className="mt-4 mb-5 block md:max-w-md">
          <span className="sr-only">Pesquisar aluno pelo nome</span>
          <input
            placeholder="Pesquisar aluno pelo nome..."
            value={pesquisa}
            onChange={(event) => setPesquisa(event.target.value)}
            className={classeInput}
          />
        </label>

        {carregando ? (
          <p role="status" className="py-8 text-slate-400">
            Carregando alunos...
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800 text-slate-300">
                <tr>
                  <th scope="col" className="p-4">Aluno</th>
                  <th scope="col" className="p-4">Turma</th>
                  <th scope="col" className="p-4">Responsável</th>
                  <th scope="col" className="p-4">Telefone</th>
                  <th scope="col" className="p-4">Ações</th>
                </tr>
              </thead>

              <tbody>
                {alunosFiltrados.map((aluno) => (
                  <tr key={aluno.id} className="border-b border-slate-800">
                    <td className="p-4 font-semibold">
                      {aluno.nome_completo}
                    </td>
                    <td className="p-4">{aluno.turma || "—"}</td>
                    <td className="p-4">{aluno.responsavel || "—"}</td>
                    <td className="p-4">{aluno.telefone || "—"}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => setAlunoSelecionado(aluno)}
                          className="text-blue-400 hover:underline"
                        >
                          Ver
                        </button>

                        <button
                          type="button"
                          disabled={ocupado}
                          onClick={() => editarAluno(aluno)}
                          className="text-emerald-400 hover:underline disabled:opacity-50"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          disabled={ocupado}
                          onClick={() => void excluirAluno(aluno)}
                          className="text-red-400 hover:underline disabled:opacity-50"
                        >
                          {excluindo === aluno.id ? "Excluindo..." : "Excluir"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {alunosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400">
                      Nenhum aluno encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {alunoSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-ficha"
            className="my-auto w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 id="titulo-ficha" className="text-xl font-bold">
                Ficha do aluno
              </h2>

              <button
                type="button"
                autoFocus
                onClick={() => setAlunoSelecionado(null)}
                className="text-slate-400 hover:text-white"
              >
                Fechar
              </button>
            </div>

            <dl className="mt-6 space-y-4">
              <div>
                <dt className="text-sm text-slate-400">Nome</dt>
                <dd className="font-semibold">
                  {alunoSelecionado.nome_completo}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-slate-400">Turma</dt>
                <dd>{alunoSelecionado.turma || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-400">Responsável</dt>
                <dd>{alunoSelecionado.responsavel || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-400">Telefone</dt>
                <dd>{alunoSelecionado.telefone || "—"}</dd>
              </div>
            </dl>

            <button
              type="button"
              disabled={ocupado}
              onClick={() => editarAluno(alunoSelecionado)}
              className={`${classeBotao} mt-7 w-full`}
            >
              Editar cadastro
            </button>
          </section>
        </div>
      )}

      <p className="mt-5 text-center text-xs text-slate-500">
        Darcilia Tech — Módulo de Secretaria
      </p>
    </main>
  );
}