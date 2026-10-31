"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

const categorias = {
  computador: "Computador",
  notebook: "Notebook",
  chromebook: "Chromebook",
  impressora: "Impressora",
  projetor: "Projetor",
  rede: "Rede",
  outro: "Outro",
};

const situacoes = {
  disponivel: "Disponível",
  em_uso: "Em uso",
  manutencao: "Manutenção",
  inativo: "Inativo",
};

type Categoria = keyof typeof categorias;
type Situacao = keyof typeof situacoes;

type Formulario = {
  patrimonio: string;
  nome: string;
  categoria: Categoria;
  marca: string;
  modelo: string;
  numero_serie: string;
  local: string;
  status: Situacao;
  observacoes: string;
};

type Equipamento = {
  id: string;
  patrimonio: string;
  nome: string;
  categoria: Categoria;
  marca: string | null;
  modelo: string | null;
  numero_serie: string | null;
  local: string;
  status: Situacao;
  observacoes: string | null;
};

const vazio: Formulario = {
  patrimonio: "",
  nome: "",
  categoria: "computador",
  marca: "",
  modelo: "",
  numero_serie: "",
  local: "",
  status: "disponivel",
  observacoes: "",
};

const campos =
  "id, patrimonio, nome, categoria, marca, modelo, numero_serie, local, status, observacoes";

export default function Equipamentos() {
  const [supabase] = useState(() => createClient());

  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const [pesquisa, setPesquisa] = useState("");
  const [filtro, setFiltro] = useState<Situacao | "todos">("todos");

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [idEdicao, setIdEdicao] = useState<string | null>(null);
  const [formulario, setFormulario] = useState<Formulario>(vazio);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const { data, error } = await supabase
          .from("equipamentos")
          .select(campos)
          .order("patrimonio");

        if (!ativo) return;

        if (error) {
          setErro(`Não foi possível carregar: ${error.message}`);
          return;
        }

        setEquipamentos((data ?? []) as Equipamento[]);
      } catch {
        if (ativo) setErro("Falha de conexão. Atualize a página.");
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

  function novo() {
    setErro("");
    setMensagem("");
    setIdEdicao(null);
    setFormulario(vazio);
    setMostrarFormulario(true);
  }

  function editar(item: Equipamento) {
    setErro("");
    setMensagem("");
    setIdEdicao(item.id);
    setFormulario({
      patrimonio: item.patrimonio,
      nome: item.nome,
      categoria: item.categoria,
      marca: item.marca ?? "",
      modelo: item.modelo ?? "",
      numero_serie: item.numero_serie ?? "",
      local: item.local,
      status: item.status,
      observacoes: item.observacoes ?? "",
    });
    setMostrarFormulario(true);
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (ocupado) return;

    setErro("");
    setMensagem("");

    const dados = {
      patrimonio: formulario.patrimonio.trim().toUpperCase(),
      nome: formulario.nome.trim(),
      categoria: formulario.categoria,
      marca: formulario.marca.trim() || null,
      modelo: formulario.modelo.trim() || null,
      numero_serie: formulario.numero_serie.trim() || null,
      local: formulario.local.trim(),
      status: formulario.status,
      observacoes: formulario.observacoes.trim() || null,
    };

    if (!dados.patrimonio || !dados.nome || !dados.local) {
      setErro("Preencha patrimônio, nome e local.");
      return;
    }

    setOcupado(true);

    try {
      const consulta = idEdicao
        ? supabase
            .from("equipamentos")
            .update({
              ...dados,
              updated_at: new Date().toISOString(),
            })
            .eq("id", idEdicao)
        : supabase.from("equipamentos").insert(dados);

      const { data, error } = await consulta.select(campos).single();

      if (error) {
        setErro(
          error.code === "23505"
            ? "Esse código de patrimônio já está cadastrado."
            : `Não foi possível salvar: ${error.message}`
        );
        return;
      }

      const salvo = data as Equipamento;

      setEquipamentos((lista) => {
        const atualizada = idEdicao
          ? lista.map((item) => (item.id === idEdicao ? salvo : item))
          : [...lista, salvo];

        return atualizada.sort((a, b) =>
          a.patrimonio.localeCompare(b.patrimonio, "pt-BR")
        );
      });

      setMensagem(
        idEdicao ? "Equipamento atualizado!" : "Equipamento cadastrado!"
      );

      fecharFormulario();
    } catch {
      setErro(
        "Falha de conexão ao salvar. Atualize a página para conferir o resultado antes de tentar novamente."
      );
    } finally {
      setOcupado(false);
    }
  }

  async function excluir(item: Equipamento) {
    if (ocupado) return;

    if (!window.confirm(`Excluir ${item.patrimonio} — ${item.nome}?`)) {
      return;
    }

    setErro("");
    setMensagem("");
    setOcupado(true);

    try {
      const { error } = await supabase
        .from("equipamentos")
        .delete()
        .eq("id", item.id)
        .select("id")
        .single();

      if (error) {
        setErro(`Não foi possível excluir: ${error.message}`);
        return;
      }

      setEquipamentos((lista) =>
        lista.filter((equipamento) => equipamento.id !== item.id)
      );

      if (idEdicao === item.id) fecharFormulario();

      setMensagem("Equipamento excluído!");
    } catch {
      setErro(
        "Falha de conexão ao excluir. Atualize a página para conferir o resultado."
      );
    } finally {
      setOcupado(false);
    }
  }

  const termo = pesquisa.trim().toLocaleLowerCase("pt-BR");

  const filtrados = equipamentos.filter((item) => {
    const correspondeStatus = filtro === "todos" || item.status === filtro;

    const correspondePesquisa = [
      item.patrimonio,
      item.nome,
      item.local,
      item.marca ?? "",
      item.modelo ?? "",
      item.numero_serie ?? "",
      categorias[item.categoria],
    ].some((valor) => valor.toLocaleLowerCase("pt-BR").includes(termo));

    return correspondeStatus && correspondePesquisa;
  });

  const indicadores = [
    { titulo: "Total", valor: equipamentos.length },
    {
      titulo: "Disponíveis",
      valor: equipamentos.filter((item) => item.status === "disponivel").length,
    },
    {
      titulo: "Em uso",
      valor: equipamentos.filter((item) => item.status === "em_uso").length,
    },
    {
      titulo: "Em manutenção",
      valor: equipamentos.filter((item) => item.status === "manutencao").length,
    },
  ];

  const input =
    "w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white focus:border-blue-500 focus:outline-none";

  const botao =
    "rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";

  const camposTexto = [
    { campo: "patrimonio", titulo: "Patrimônio", obrigatorio: true },
    { campo: "nome", titulo: "Nome do equipamento", obrigatorio: true },
    { campo: "marca", titulo: "Marca", obrigatorio: false },
    { campo: "modelo", titulo: "Modelo", obrigatorio: false },
    { campo: "numero_serie", titulo: "Número de série", obrigatorio: false },
    { campo: "local", titulo: "Local ou sala", obrigatorio: true },
  ] as const;

  return (
    <main className="mx-auto max-w-7xl">
      <Link href="/ti" className="text-sm text-blue-400 hover:underline">
        ← Chamados de TI
      </Link>

      <header className="my-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-blue-400">DARCILIA TECH / TI</p>
          <h1 className="mt-2 text-3xl font-bold">Equipamentos</h1>
          <p className="mt-2 text-slate-400">
            Controle de patrimônio, localização e situação.
          </p>
        </div>

        <button
          type="button"
          onClick={novo}
          disabled={ocupado || carregando}
          className={botao}
        >
          + Novo equipamento
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
            {idEdicao ? "Editar equipamento" : "Cadastrar equipamento"}
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
                <span className="text-sm">Categoria</span>
                <select
                  value={formulario.categoria}
                  onChange={(event) =>
                    alterar("categoria", event.target.value as Categoria)
                  }
                  className={input}
                >
                  {Object.entries(categorias).map(([valor, titulo]) => (
                    <option key={valor} value={valor}>{titulo}</option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm">Situação</span>
                <select
                  value={formulario.status}
                  onChange={(event) =>
                    alterar("status", event.target.value as Situacao)
                  }
                  className={input}
                >
                  {Object.entries(situacoes).map(([valor, titulo]) => (
                    <option key={valor} value={valor}>{titulo}</option>
                  ))}
                </select>
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
              <button type="submit" disabled={ocupado} className={botao}>
                {ocupado ? "Salvando..." : "Salvar equipamento"}
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
        <h2 className="mb-5 text-xl font-bold">Equipamentos cadastrados</h2>

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm text-slate-400">Pesquisar</span>
            <input
              value={pesquisa}
              onChange={(event) => setPesquisa(event.target.value)}
              placeholder="Patrimônio, nome, local, marca..."
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
                <option key={valor} value={valor}>{titulo}</option>
              ))}
            </select>
          </label>
        </div>

        {carregando ? (
          <p role="status" className="py-6 text-slate-400">
            Carregando equipamentos...
          </p>
        ) : filtrados.length === 0 ? (
          <p className="py-6 text-center text-slate-400">
            Nenhum equipamento encontrado.
          </p>
        ) : (
          <div className="space-y-4">
            {filtrados.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-slate-700 p-5"
              >
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {item.patrimonio} — {item.nome}
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {categorias[item.categoria]} • {item.local}
                    </p>
                  </div>
                  <span className="self-start rounded-full bg-blue-950 px-3 py-1 text-xs text-blue-200">
                    {situacoes[item.status]}
                  </span>
                </div>

                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-slate-500">Marca</dt>
                    <dd>{item.marca || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Modelo</dt>
                    <dd>{item.modelo || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Número de série</dt>
                    <dd className="break-words">{item.numero_serie || "—"}</dd>
                  </div>
                </dl>

                {item.observacoes && (
                  <p className="mt-4 whitespace-pre-wrap break-words text-sm text-slate-300">
                    {item.observacoes}
                  </p>
                )}

                <div className="mt-5 flex gap-4">
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => editar(item)}
                    className="text-sm text-blue-400 hover:underline disabled:opacity-50"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => void excluir(item)}
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