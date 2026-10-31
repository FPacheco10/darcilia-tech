"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";


type Livro = {
  id: string;
  codigo: string;
  titulo: string;
  status: string;
};

type Emprestimo = {
  id: string;
  livro_id: string;
  nome_leitor: string;
  turma_setor: string;
  retirado_em: string;
  previsto_para: string;
  devolvido_em: string | null;
  observacoes: string | null;
};

type Formulario = {
  livro_id: string;
  nome_leitor: string;
  turma_setor: string;
  previsto_para: string;
  observacoes: string;
};

const vazio: Formulario = {
  livro_id: "",
  nome_leitor: "",
  turma_setor: "",
  previsto_para: "",
  observacoes: "",
};

const campos =
  "id, livro_id, nome_leitor, turma_setor, retirado_em, previsto_para, devolvido_em, observacoes";

function formatarData(valor: string) {
  return new Date(valor).toLocaleString("pt-BR");
}

export default function EmprestimosLivros() {
  const [supabase] = useState(() => createClient());

  const [livros, setLivros] = useState<Livro[]>([]);
  const [emprestimos, setEmprestimos] = useState<Emprestimo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [formulario, setFormulario] = useState<Formulario>(vazio);
  const [pesquisa, setPesquisa] = useState("");
  const [filtro, setFiltro] = useState("abertos");
  const [agora, setAgora] = useState<number | null>(null);

  const carregarDados = useCallback(async () => {
    const [resultadoLivros, resultadoEmprestimos] = await Promise.all([
      supabase
        .from("livros")
        .select("id, codigo, titulo, status")
        .order("titulo"),

      supabase
        .from("emprestimos_livros")
        .select(campos)
        .order("retirado_em", { ascending: false }),
    ]);

    if (resultadoLivros.error) {
      throw new Error(resultadoLivros.error.message);
    }

    if (resultadoEmprestimos.error) {
      throw new Error(resultadoEmprestimos.error.message);
    }

    return {
      livros: (resultadoLivros.data ?? []) as Livro[],
      emprestimos: (resultadoEmprestimos.data ?? []) as Emprestimo[],
    };
  }, [supabase]);

  useEffect(() => {
    let ativo = true;

    async function iniciar() {
      try {
        const dados = await carregarDados();

        if (!ativo) return;

        setLivros(dados.livros);
        setEmprestimos(dados.emprestimos);
      } catch (error) {
        if (ativo) {
          setErro(
            error instanceof Error
              ? `Não foi possível carregar: ${error.message}`
              : "Falha de conexão."
          );
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    void iniciar();

    return () => {
      ativo = false;
    };
  }, [carregarDados]);

  useEffect(() => {
    setAgora(Date.now());

    const intervalo = window.setInterval(() => {
      setAgora(Date.now());
    }, 60000);

    return () => window.clearInterval(intervalo);
  }, []);

  function estaAtrasado(item: Emprestimo) {
    return (
      !item.devolvido_em &&
      agora !== null &&
      new Date(item.previsto_para).getTime() < agora
    );
  }

  const abertos = emprestimos.filter((item) => !item.devolvido_em);
  const livrosOcupados = new Set(abertos.map((item) => item.livro_id));

  const disponiveis = livros.filter(
    (livro) =>
      livro.status === "disponivel" && !livrosOcupados.has(livro.id)
  );

  function identificarLivro(id: string) {
    const livro = livros.find((item) => item.id === id);
    return livro ? `${livro.codigo} — ${livro.titulo}` : id;
  }

  function alterar<K extends keyof Formulario>(
    campo: K,
    valor: Formulario[K]
  ) {
    setFormulario((atual) => ({ ...atual, [campo]: valor }));
  }

  async function novaRetirada() {
    if (ocupado) return;

    setErro("");
    setMensagem("");
    setOcupado(true);

    try {
      const dados = await carregarDados();

      setLivros(dados.livros);
      setEmprestimos(dados.emprestimos);
      setFormulario(vazio);
      setMostrarFormulario(true);
    } catch (error) {
      setErro(
        error instanceof Error
          ? `Não foi possível atualizar o acervo: ${error.message}`
          : "Falha de conexão."
      );
    } finally {
      setOcupado(false);
    }
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (ocupado) return;

    setErro("");
    setMensagem("");

    const leitor = formulario.nome_leitor.trim();
    const turmaSetor = formulario.turma_setor.trim();
    const previsao = new Date(formulario.previsto_para);

    if (
      !formulario.livro_id ||
      !leitor ||
      !turmaSetor ||
      !Number.isFinite(previsao.getTime()) ||
      previsao.getTime() <= Date.now()
    ) {
      setErro("Preencha os campos e informe uma previsão futura.");
      return;
    }

    setOcupado(true);

    try {
      const { data, error } = await supabase
        .from("emprestimos_livros")
        .insert({
          livro_id: formulario.livro_id,
          nome_leitor: leitor,
          turma_setor: turmaSetor,
          previsto_para: previsao.toISOString(),
          observacoes: formulario.observacoes.trim() || null,
        })
        .select(campos)
        .single();

      if (error) {
        setErro(
          error.code === "23505"
            ? "Esse exemplar já tem empréstimo em aberto. Atualize a página."
            : `Não foi possível registrar: ${error.message}`
        );
        return;
      }

      const salvo = data as Emprestimo;

      setEmprestimos((lista) => [salvo, ...lista]);
      setLivros((lista) =>
        lista.map((livro) =>
          livro.id === salvo.livro_id
            ? { ...livro, status: "emprestado" }
            : livro
        )
      );

      setMostrarFormulario(false);
      setFormulario(vazio);
      setMensagem("Retirada registrada!");
    } catch {
      setErro(
        "Falha de conexão. Atualize a página para conferir se a retirada foi registrada antes de tentar novamente."
      );
    } finally {
      setOcupado(false);
    }
  }

  async function devolver(item: Emprestimo) {
    if (ocupado) return;

    if (
      !window.confirm(
        `Confirmar a devolução de ${identificarLivro(item.livro_id)}?`
      )
    ) {
      return;
    }

    setErro("");
    setMensagem("");
    setOcupado(true);

    try {
      const { data, error } = await supabase
        .from("emprestimos_livros")
        .update({ devolvido_em: new Date().toISOString() })
        .eq("id", item.id)
        .is("devolvido_em", null)
        .select(campos)
        .single();

      if (error) {
        setErro(
          `Não foi possível registrar a devolução. Atualize a página para conferir o estado atual. ${error.message}`
        );
        return;
      }

      setEmprestimos((lista) =>
        lista.map((atual) =>
          atual.id === item.id ? (data as Emprestimo) : atual
        )
      );

      setMensagem("Devolução registrada!");

      // Recarrega a situação real dos livros após o gatilho do banco.
      try {
        const dados = await carregarDados();
        setLivros(dados.livros);
        setEmprestimos(dados.emprestimos);
      } catch {
        setErro(
          "A devolução foi registrada, mas a lista não pôde ser atualizada. Atualize a página."
        );
      }
    } catch {
      setErro(
        "Falha de conexão. Atualize a página para conferir a devolução."
      );
    } finally {
      setOcupado(false);
    }
  }

  const termo = pesquisa.trim().toLocaleLowerCase("pt-BR");

  const filtrados = emprestimos.filter((item) => {
    const correspondeFiltro =
      filtro === "todos" ||
      (filtro === "abertos" && !item.devolvido_em) ||
      (filtro === "devolvidos" && !!item.devolvido_em) ||
      (filtro === "atrasados" && estaAtrasado(item));

    const correspondePesquisa = [
      item.nome_leitor,
      item.turma_setor,
      identificarLivro(item.livro_id),
    ].some((valor) => valor.toLocaleLowerCase("pt-BR").includes(termo));

    return correspondeFiltro && correspondePesquisa;
  });

  const indicadores = [
    { titulo: "Exemplares disponíveis", valor: disponiveis.length },
    { titulo: "Empréstimos em aberto", valor: abertos.length },
    {
      titulo: "Atrasados",
      valor: abertos.filter(estaAtrasado).length,
    },
  ];

  const input =
    "w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white focus:border-blue-500 focus:outline-none";

  const botao =
    "rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <main className="mx-auto max-w-7xl">
      <Link href="/biblioteca" className="text-sm text-blue-400 hover:underline">
        ← Voltar ao acervo
      </Link>

      <header className="my-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-blue-400">DARCILIA TECH / BIBLIOTECA</p>
          <h1 className="mt-2 text-3xl font-bold">Empréstimos de livros</h1>
          <p className="mt-2 text-slate-400">
            Registre retiradas, acompanhe prazos e confirme devoluções.
          </p>
        </div>

        <button
          type="button"
          disabled={ocupado || carregando}
          onClick={() => void novaRetirada()}
          className={botao}
        >
          + Nova retirada
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

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        {indicadores.map((item) => (
          <div
            key={item.titulo}
            className="rounded-xl border border-slate-800 bg-slate-900 p-6"
          >
            <p className="text-sm text-slate-400">{item.titulo}</p>
            <p className="mt-2 text-3xl font-bold text-blue-400">
              {carregando ? "—" : item.valor}
            </p>
          </div>
        ))}
      </section>

      {mostrarFormulario && (
        <form
          onSubmit={salvar}
          className="mb-8 rounded-xl border border-slate-800 bg-slate-900 p-6"
        >
          <h2 className="mb-5 text-xl font-bold">Registrar retirada</h2>

          {disponiveis.length === 0 && (
            <p className="mb-5 text-amber-300">
              Nenhum exemplar disponível. Confira o acervo.
            </p>
          )}

          <fieldset disabled={ocupado} className="space-y-5">
            <label className="block space-y-2">
              <span className="text-sm">Exemplar</span>
              <select
                required
                value={formulario.livro_id}
                onChange={(event) => alterar("livro_id", event.target.value)}
                className={input}
              >
                <option value="">Selecione o exemplar</option>
                {disponiveis.map((livro) => (
                  <option key={livro.id} value={livro.id}>
                    {livro.codigo} — {livro.titulo}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm">Nome do leitor</span>
                <input
                  required
                  value={formulario.nome_leitor}
                  onChange={(event) => alterar("nome_leitor", event.target.value)}
                  className={input}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm">Turma ou setor</span>
                <input
                  required
                  value={formulario.turma_setor}
                  onChange={(event) => alterar("turma_setor", event.target.value)}
                  className={input}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm">Previsão de devolução</span>
                <input
                  required
                  type="datetime-local"
                  value={formulario.previsto_para}
                  onChange={(event) => alterar("previsto_para", event.target.value)}
                  className={input}
                />
              </label>
            </div>

            <label className="block space-y-2">
              <span className="text-sm">Observações</span>
              <textarea
                rows={3}
                value={formulario.observacoes}
                onChange={(event) => alterar("observacoes", event.target.value)}
                className={input}
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={ocupado || disponiveis.length === 0}
                className={botao}
              >
                {ocupado ? "Registrando..." : "Confirmar retirada"}
              </button>

              <button
                type="button"
                onClick={() => setMostrarFormulario(false)}
                className="rounded-lg border border-slate-700 px-5 py-3"
              >
                Cancelar
              </button>
            </div>
          </fieldset>
        </form>
      )}

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="mb-5 text-xl font-bold">Histórico de empréstimos</h2>

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm text-slate-400">Pesquisar</span>
            <input
              value={pesquisa}
              onChange={(event) => setPesquisa(event.target.value)}
              placeholder="Leitor, turma, código ou título..."
              className={input}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm text-slate-400">Situação</span>
            <select
              value={filtro}
              onChange={(event) => setFiltro(event.target.value)}
              className={input}
            >
              <option value="abertos">Em aberto</option>
              <option value="atrasados">Atrasados</option>
              <option value="devolvidos">Devolvidos</option>
              <option value="todos">Todos</option>
            </select>
          </label>
        </div>

        {carregando ? (
          <p role="status" className="py-6 text-slate-400">
            Carregando empréstimos...
          </p>
        ) : filtrados.length === 0 ? (
          <p className="py-6 text-center text-slate-400">
            Nenhum empréstimo encontrado.
          </p>
        ) : (
          <div className="space-y-4">
            {filtrados.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-slate-700 p-5"
              >
                <div className="flex flex-wrap justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">
                      {identificarLivro(item.livro_id)}
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {item.nome_leitor} • {item.turma_setor}
                    </p>
                  </div>

                  <span
                    className={`self-start rounded-full px-3 py-1 text-xs ${
                      estaAtrasado(item)
                        ? "bg-red-950 text-red-200"
                        : "bg-blue-950 text-blue-200"
                    }`}
                  >
                    {item.devolvido_em
                      ? "Devolvido"
                      : estaAtrasado(item)
                        ? "Atrasado"
                        : "Em aberto"}
                  </span>
                </div>

                <dl className="mt-4 grid gap-4 text-sm md:grid-cols-3">
                  <div>
                    <dt className="text-slate-500">Retirada</dt>
                    <dd>{formatarData(item.retirado_em)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Previsão</dt>
                    <dd>{formatarData(item.previsto_para)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Devolução</dt>
                    <dd>
                      {item.devolvido_em
                        ? formatarData(item.devolvido_em)
                        : "Pendente"}
                    </dd>
                  </div>
                </dl>

                {item.observacoes && (
                  <p className="mt-4 whitespace-pre-wrap break-words text-sm text-slate-300">
                    {item.observacoes}
                  </p>
                )}

                {!item.devolvido_em && (
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => void devolver(item)}
                    className={`${botao} mt-5`}
                  >
                    Registrar devolução
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}