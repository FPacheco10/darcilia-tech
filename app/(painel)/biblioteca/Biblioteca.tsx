"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

const situacoes = {
  disponivel: "Disponível",
  emprestado: "Emprestado",
  manutencao: "Manutenção",
  inativo: "Inativo",
};

type Situacao = keyof typeof situacoes;

type Livro = {
  id: string;
  codigo: string;
  titulo: string;
  autor: string;
  isbn: string | null;
  editora: string | null;
  ano_publicacao: number | null;
  categoria: string | null;
  localizacao: string | null;
  status: Situacao;
  observacoes: string | null;
};

type Formulario = {
  codigo: string;
  titulo: string;
  autor: string;
  isbn: string;
  editora: string;
  ano_publicacao: string;
  categoria: string;
  localizacao: string;
  status: Situacao;
  observacoes: string;
};

const vazio: Formulario = {
  codigo: "",
  titulo: "",
  autor: "",
  isbn: "",
  editora: "",
  ano_publicacao: "",
  categoria: "",
  localizacao: "",
  status: "disponivel",
  observacoes: "",
};

const campos =
  "id, codigo, titulo, autor, isbn, editora, ano_publicacao, categoria, localizacao, status, observacoes";

export default function Biblioteca() {
  const [supabase] = useState(() => createClient());

  const [livros, setLivros] = useState<Livro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const [pesquisa, setPesquisa] = useState("");
  const [filtro, setFiltro] = useState<Situacao | "todos">("todos");

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [idEdicao, setIdEdicao] = useState<string | null>(null);
  const [formulario, setFormulario] = useState<Formulario>(vazio);

  const livroEmEdicao = livros.find((livro) => livro.id === idEdicao);
  const situacaoBloqueada = livroEmEdicao?.status === "emprestado";

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const { data, error } = await supabase
          .from("livros")
          .select(campos)
          .order("titulo");

        if (!ativo) return;

        if (error) {
          setErro(`Não foi possível carregar os livros: ${error.message}`);
          return;
        }

        setLivros((data ?? []) as Livro[]);
      } catch {
        if (ativo) {
          setErro("Falha de conexão. Atualize a página.");
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    void carregar();

    return () => {
      ativo = false;
    };
  }, [supabase]);

  function alterar<K extends keyof Formulario>(
    campo: K,
    valor: Formulario[K]
  ) {
    setFormulario((atual) => ({ ...atual, [campo]: valor }));
  }

  function fecharFormulario() {
    setMostrarFormulario(false);
    setIdEdicao(null);
    setFormulario(vazio);
  }

  function novoLivro() {
    setErro("");
    setMensagem("");
    setIdEdicao(null);
    setFormulario(vazio);
    setMostrarFormulario(true);
  }

  function editarLivro(livro: Livro) {
    setErro("");
    setMensagem("");
    setIdEdicao(livro.id);

    setFormulario({
      codigo: livro.codigo,
      titulo: livro.titulo,
      autor: livro.autor,
      isbn: livro.isbn ?? "",
      editora: livro.editora ?? "",
      ano_publicacao: livro.ano_publicacao?.toString() ?? "",
      categoria: livro.categoria ?? "",
      localizacao: livro.localizacao ?? "",
      status: livro.status,
      observacoes: livro.observacoes ?? "",
    });

    setMostrarFormulario(true);
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (ocupado) return;

    setErro("");
    setMensagem("");

    const codigo = formulario.codigo.trim().toUpperCase();
    const titulo = formulario.titulo.trim();
    const autor = formulario.autor.trim();
    const anoTexto = formulario.ano_publicacao.trim();
    const ano = anoTexto ? Number(anoTexto) : null;

    if (!codigo || !titulo || !autor) {
      setErro("Preencha código, título e autor.");
      return;
    }

    if (
      ano !== null &&
      (!Number.isInteger(ano) || ano < 1 || ano > 9999)
    ) {
      setErro("Informe um ano válido entre 1 e 9999.");
      return;
    }

    if (idEdicao && !livroEmEdicao) {
      setErro("Exemplar não encontrado. Atualize a página.");
      return;
    }

    const mudouSituacao =
      !!livroEmEdicao && formulario.status !== livroEmEdicao.status;

    if (
      (!idEdicao && formulario.status === "emprestado") ||
      (mudouSituacao &&
        (formulario.status === "emprestado" ||
          livroEmEdicao?.status === "emprestado"))
    ) {
      setErro(
        "Use a tela de Empréstimos e devoluções para retirar ou devolver um exemplar."
      );
      return;
    }

    const dados = {
      codigo,
      titulo,
      autor,
      isbn: formulario.isbn.trim() || null,
      editora: formulario.editora.trim() || null,
      ano_publicacao: ano,
      categoria: formulario.categoria.trim() || null,
      localizacao: formulario.localizacao.trim() || null,
      observacoes: formulario.observacoes.trim() || null,
    };

    setOcupado(true);

    try {
      const consulta = idEdicao
        ? supabase
            .from("livros")
            .update({
              ...dados,
              ...(mudouSituacao ? { status: formulario.status } : {}),
              updated_at: new Date().toISOString(),
            })
            .eq("id", idEdicao)
        : supabase.from("livros").insert({
            ...dados,
            status: formulario.status,
          });

      const { data, error } = await consulta.select(campos).single();

      if (error) {
        setErro(
          error.code === "23505"
            ? "Esse código de exemplar já está cadastrado."
            : `Não foi possível salvar: ${error.message}`
        );
        return;
      }

      const salvo = data as Livro;

      setLivros((lista) => {
        const atualizada = idEdicao
          ? lista.map((item) => (item.id === idEdicao ? salvo : item))
          : [...lista, salvo];

        return atualizada.sort((a, b) =>
          a.titulo.localeCompare(b.titulo, "pt-BR")
        );
      });

      setMensagem(idEdicao ? "Exemplar atualizado!" : "Exemplar cadastrado!");
      fecharFormulario();
    } catch {
      setErro(
        "Falha de conexão ao salvar. Atualize a página para conferir o resultado antes de tentar novamente."
      );
    } finally {
      setOcupado(false);
    }
  }

  async function excluirLivro(livro: Livro) {
    if (ocupado) return;

    if (livro.status === "emprestado") {
      setErro("Registre a devolução antes de excluir esse exemplar.");
      setMensagem("");
      return;
    }

    const confirmar = window.confirm(
      `Excluir o exemplar ${livro.codigo} — ${livro.titulo}?`
    );

    if (!confirmar) return;

    setErro("");
    setMensagem("");
    setOcupado(true);

    try {
      const { error } = await supabase
        .from("livros")
        .delete()
        .eq("id", livro.id)
        .neq("status", "emprestado")
        .select("id")
        .single();

      if (error) {
        setErro(
          error.code === "23503"
            ? "Este exemplar possui registros vinculados, como histórico de empréstimos. Altere a situação para Inativo em vez de excluí-lo."
            : `Não foi possível excluir. Atualize a página para conferir a situação do exemplar. ${error.message}`
        );
        return;
      }

      setLivros((lista) => lista.filter((item) => item.id !== livro.id));

      if (idEdicao === livro.id) fecharFormulario();

      setMensagem("Exemplar excluído!");
    } catch {
      setErro(
        "Falha de conexão ao excluir. Atualize a página para conferir o resultado."
      );
    } finally {
      setOcupado(false);
    }
  }

  const termo = pesquisa.trim().toLocaleLowerCase("pt-BR");

  const filtrados = livros.filter((livro) => {
    const correspondeStatus =
      filtro === "todos" || livro.status === filtro;

    const correspondePesquisa = [
      livro.codigo,
      livro.titulo,
      livro.autor,
      livro.isbn ?? "",
      livro.categoria ?? "",
      livro.localizacao ?? "",
    ].some((valor) => valor.toLocaleLowerCase("pt-BR").includes(termo));

    return correspondeStatus && correspondePesquisa;
  });

  const indicadores = [
    { titulo: "Exemplares cadastrados", valor: livros.length },
    {
      titulo: "Disponíveis",
      valor: livros.filter((livro) => livro.status === "disponivel").length,
    },
    {
      titulo: "Emprestados",
      valor: livros.filter((livro) => livro.status === "emprestado").length,
    },
    {
      titulo: "Manutenção",
      valor: livros.filter((livro) => livro.status === "manutencao").length,
    },
  ];

  const camposTexto = [
    { campo: "codigo", titulo: "Código do exemplar", obrigatorio: true },
    { campo: "titulo", titulo: "Título", obrigatorio: true },
    { campo: "autor", titulo: "Autor", obrigatorio: true },
    { campo: "isbn", titulo: "ISBN", obrigatorio: false },
    { campo: "editora", titulo: "Editora", obrigatorio: false },
    { campo: "categoria", titulo: "Categoria", obrigatorio: false },
    {
      campo: "localizacao",
      titulo: "Localização / prateleira",
      obrigatorio: false,
    },
  ] as const;

  const input =
    "w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white focus:border-blue-500 focus:outline-none";

  const botao =
    "rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <main className="mx-auto max-w-7xl">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-blue-400">
            DARCILIA TECH / BIBLIOTECA
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Acervo da Biblioteca
          </h1>

          <p className="mt-2 text-slate-400">
            Cadastro e acompanhamento dos exemplares.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/biblioteca/emprestimos"
            className="rounded-lg border border-slate-700 px-5 py-3 font-semibold text-white hover:bg-slate-800"
          >
            Empréstimos e devoluções
          </Link>

          <button
            type="button"
            onClick={novoLivro}
            disabled={ocupado || carregando}
            className={botao}
          >
            + Novo exemplar
          </button>
        </div>
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

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
          <h2 className="mb-5 text-xl font-bold">
            {idEdicao ? "Editar exemplar" : "Cadastrar exemplar"}
          </h2>

          <fieldset disabled={ocupado} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              {camposTexto.map((item) => (
                <label key={item.campo} className="block space-y-2">
                  <span className="text-sm">
                    {item.titulo}{item.obrigatorio ? " *" : ""}
                  </span>

                  <input
                    required={item.obrigatorio}
                    value={formulario[item.campo]}
                    onChange={(event) =>
                      alterar(item.campo, event.target.value)
                    }
                    className={input}
                  />
                </label>
              ))}

              <label className="block space-y-2">
                <span className="text-sm">Ano de publicação</span>
                <input
                  type="number"
                  min={1}
                  max={9999}
                  step={1}
                  value={formulario.ano_publicacao}
                  onChange={(event) =>
                    alterar("ano_publicacao", event.target.value)
                  }
                  className={input}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm">Situação</span>

                <select
                  disabled={situacaoBloqueada}
                  value={formulario.status}
                  onChange={(event) =>
                    alterar("status", event.target.value as Situacao)
                  }
                  className={`${input} disabled:opacity-60`}
                >
                  {situacaoBloqueada ? (
                    <option value="emprestado">Emprestado</option>
                  ) : (
                    Object.entries(situacoes)
                      .filter(([valor]) => valor !== "emprestado")
                      .map(([valor, titulo]) => (
                        <option key={valor} value={valor}>
                          {titulo}
                        </option>
                      ))
                  )}
                </select>

                <p className="text-xs text-slate-400">
                  {situacaoBloqueada
                    ? "Registre a devolução em Empréstimos e devoluções para liberar o exemplar."
                    : "A situação Emprestado é definida ao registrar uma retirada."}
                </p>
              </label>
            </div>

            <label className="block space-y-2">
              <span className="text-sm">Observações</span>
              <textarea
                rows={3}
                value={formulario.observacoes}
                onChange={(event) =>
                  alterar("observacoes", event.target.value)
                }
                className={input}
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={ocupado}
                className={botao}
              >
                {ocupado ? "Salvando..." : "Salvar exemplar"}
              </button>

              <button
                type="button"
                onClick={fecharFormulario}
                className="rounded-lg border border-slate-700 px-5 py-3"
              >
                Cancelar
              </button>
            </div>
          </fieldset>
        </form>
      )}

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="mb-5 text-xl font-bold">Exemplares cadastrados</h2>

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm text-slate-400">Pesquisar</span>
            <input
              value={pesquisa}
              onChange={(event) => setPesquisa(event.target.value)}
              placeholder="Título, autor, código, ISBN..."
              className={input}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm text-slate-400">Situação</span>
            <select
              value={filtro}
              onChange={(event) =>
                setFiltro(event.target.value as Situacao | "todos")
              }
              className={input}
            >
              <option value="todos">Todas</option>

              {Object.entries(situacoes).map(([valor, titulo]) => (
                <option key={valor} value={valor}>
                  {titulo}
                </option>
              ))}
            </select>
          </label>
        </div>

        {carregando ? (
          <p role="status" className="py-6 text-slate-400">
            Carregando acervo...
          </p>
        ) : filtrados.length === 0 ? (
          <p className="py-6 text-center text-slate-400">
            Nenhum exemplar encontrado.
          </p>
        ) : (
          <div className="space-y-4">
            {filtrados.map((livro) => (
              <article
                key={livro.id}
                className="rounded-xl border border-slate-700 p-5"
              >
                <div className="flex flex-wrap justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-blue-400">
                      {livro.codigo}
                    </p>

                    <h3 className="mt-1 text-lg font-semibold">
                      {livro.titulo}
                    </h3>

                    <p className="mt-1 text-sm text-slate-400">
                      {livro.autor}
                    </p>
                  </div>

                  <span className="self-start rounded-full bg-blue-950 px-3 py-1 text-xs text-blue-200">
                    {situacoes[livro.status]}
                  </span>
                </div>

                <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <dt className="text-slate-500">ISBN</dt>
                    <dd>{livro.isbn || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Editora</dt>
                    <dd>{livro.editora || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Ano</dt>
                    <dd>{livro.ano_publicacao ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Categoria</dt>
                    <dd>{livro.categoria || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Localização</dt>
                    <dd>{livro.localizacao || "—"}</dd>
                  </div>
                </dl>

                {livro.observacoes && (
                  <p className="mt-4 whitespace-pre-wrap break-words text-sm text-slate-300">
                    {livro.observacoes}
                  </p>
                )}

                <div className="mt-5 flex gap-4">
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => editarLivro(livro)}
                    className="text-sm text-blue-400 hover:underline disabled:opacity-50"
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    disabled={ocupado || livro.status === "emprestado"}
                    onClick={() => void excluirLivro(livro)}
                    className="text-sm text-red-400 hover:underline disabled:opacity-50"
                  >
                    Excluir
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}