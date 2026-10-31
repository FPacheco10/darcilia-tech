"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type Tipo = "receita" | "despesa";
type Status = "pendente" | "pago" | "cancelado";

type Lancamento = {
  id: string;
  tipo: Tipo;
  descricao: string;
  categoria: string;
  valor: number | string;
  vencimento: string;
  status: Status;
  data_pagamento: string | null;
  observacoes: string | null;
};

type Formulario = {
  tipo: Tipo;
  descricao: string;
  categoria: string;
  valor: string;
  vencimento: string;
  status: Status;
  data_pagamento: string;
  observacoes: string;
};

const nomesStatus: Record<Status, string> = {
  pendente: "Pendente",
  pago: "Liquidado",
  cancelado: "Cancelado",
};

const vazio: Formulario = {
  tipo: "receita",
  descricao: "",
  categoria: "",
  valor: "",
  vencimento: "",
  status: "pendente",
  data_pagamento: "",
  observacoes: "",
};

const campos =
  "id, tipo, descricao, categoria, valor, vencimento, status, data_pagamento, observacoes";

function moeda(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function centavosDoBanco(valor: number | string) {
  return Math.round(Number(valor) * 100);
}

function converterValor(texto: string): number | null {
  const normalizado = texto.trim().replace(",", ".");

  // Aceita 1500,50 ou 1500.50, sem separador de milhar.
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(normalizado)) {
    return null;
  }

  const [inteiros, decimais = ""] = normalizado.split(".");
  const centavos =
    Number(inteiros) * 100 +
    Number(decimais.padEnd(2, "0"));

  return centavos > 0 && centavos <= 999999999999
    ? centavos
    : null;
}

function formatarData(valor: string) {
  const [ano, mes, dia] = valor.split("-");
  return `${dia}/${mes}/${ano}`;
}

function dataLocalAtual() {
  const data = new Date();

  return [
    data.getFullYear(),
    String(data.getMonth() + 1).padStart(2, "0"),
    String(data.getDate()).padStart(2, "0"),
  ].join("-");
}

export default function Financeiro({
  nomeUsuario,
}: {
  nomeUsuario: string;
}) {
  const [supabase] = useState(() => createClient());

  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [hoje, setHoje] = useState("");

  const [pesquisa, setPesquisa] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<Tipo | "todos">("todos");
  const [statusFiltro, setStatusFiltro] = useState<Status | "todos">("todos");
  const [mesFiltro, setMesFiltro] = useState("");

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [idEdicao, setIdEdicao] = useState<string | null>(null);
  const [formulario, setFormulario] = useState<Formulario>(vazio);

  useEffect(() => {
    setHoje(dataLocalAtual());

    const intervalo = window.setInterval(() => {
      setHoje(dataLocalAtual());
    }, 60000);

    return () => window.clearInterval(intervalo);
  }, []);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const { data, error } = await supabase
          .from("lancamentos_financeiros")
          .select(campos)
          .order("vencimento", { ascending: false });

        if (!ativo) return;

        if (error) {
          setErro(`Não foi possível carregar: ${error.message}`);
          return;
        }

        setLancamentos((data ?? []) as Lancamento[]);
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

  function novoLancamento() {
    setErro("");
    setMensagem("");
    setIdEdicao(null);
    setFormulario(vazio);
    setMostrarFormulario(true);
  }

  function editar(item: Lancamento) {
    if (salvando) return;

    setErro("");
    setMensagem("");
    setIdEdicao(item.id);
    setFormulario({
      tipo: item.tipo,
      descricao: item.descricao,
      categoria: item.categoria,
      valor: (centavosDoBanco(item.valor) / 100)
        .toFixed(2)
        .replace(".", ","),
      vencimento: item.vencimento,
      status: item.status,
      data_pagamento: item.data_pagamento ?? "",
      observacoes: item.observacoes ?? "",
    });
    setMostrarFormulario(true);
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (salvando) return;

    setErro("");
    setMensagem("");

    const descricao = formulario.descricao.trim();
    const categoria = formulario.categoria.trim();
    const centavos = converterValor(formulario.valor);

    if (!descricao || !categoria || !formulario.vencimento) {
      setErro("Preencha descrição, categoria e vencimento.");
      return;
    }

    if (centavos === null) {
      setErro(
        "Informe um valor positivo, com até duas casas decimais e sem separador de milhar. Exemplo: 1500,50."
      );
      return;
    }

    if (formulario.status === "pago" && !formulario.data_pagamento) {
      setErro("Informe a data de recebimento ou pagamento.");
      return;
    }

    const dados = {
      tipo: formulario.tipo,
      descricao,
      categoria,
      valor: (centavos / 100).toFixed(2),
      vencimento: formulario.vencimento,
      status: formulario.status,
      data_pagamento:
        formulario.status === "pago"
          ? formulario.data_pagamento
          : null,
      observacoes: formulario.observacoes.trim() || null,
    };

    setSalvando(true);

    try {
      const consulta = idEdicao
        ? supabase
            .from("lancamentos_financeiros")
            .update({
              ...dados,
              updated_at: new Date().toISOString(),
            })
            .eq("id", idEdicao)
        : supabase.from("lancamentos_financeiros").insert(dados);

      const { data, error } = await consulta.select(campos).single();

      if (error) {
        setErro(`Não foi possível salvar: ${error.message}`);
        return;
      }

      const salvo = data as Lancamento;

      setLancamentos((lista) => {
        const atualizada = idEdicao
          ? lista.map((item) => (item.id === idEdicao ? salvo : item))
          : [salvo, ...lista];

        return atualizada.sort((a, b) =>
          b.vencimento.localeCompare(a.vencimento)
        );
      });

      setMensagem(
        idEdicao ? "Lançamento atualizado!" : "Lançamento cadastrado!"
      );
      fecharFormulario();
    } catch {
      setErro(
        "Falha de conexão ao salvar. Atualize a página para conferir o resultado antes de tentar novamente."
      );
    } finally {
      setSalvando(false);
    }
  }

  const termo = pesquisa.trim().toLocaleLowerCase("pt-BR");

  const filtrados = lancamentos.filter((item) => {
    const correspondePesquisa = [
      item.descricao,
      item.categoria,
      item.observacoes ?? "",
    ].some((valor) => valor.toLocaleLowerCase("pt-BR").includes(termo));

    return (
      correspondePesquisa &&
      (tipoFiltro === "todos" || item.tipo === tipoFiltro) &&
      (statusFiltro === "todos" || item.status === statusFiltro) &&
      (!mesFiltro || item.vencimento.startsWith(mesFiltro))
    );
  });

  function somar(tipo: Tipo, status: Status) {
    return filtrados
      .filter((item) => item.tipo === tipo && item.status === status)
      .reduce((total, item) => total + centavosDoBanco(item.valor), 0);
  }

  const recebido = somar("receita", "pago");
  const pago = somar("despesa", "pago");

  const indicadores = [
    {
      titulo: "Receitas recebidas",
      valor: recebido,
      cor: "text-emerald-400",
    },
    {
      titulo: "Despesas pagas",
      valor: pago,
      cor: "text-rose-400",
    },
    {
      titulo: "Saldo realizado",
      valor: recebido - pago,
      cor: "text-blue-400",
    },
    {
      titulo: "A receber",
      valor: somar("receita", "pendente"),
      cor: "text-amber-400",
    },
    {
      titulo: "A pagar",
      valor: somar("despesa", "pendente"),
      cor: "text-orange-400",
    },
  ];

  const input =
    "w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white focus:border-blue-500 focus:outline-none";

  const botao =
    "rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <main className="mx-auto max-w-7xl">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-blue-400">
            DARCILIA TECH / FINANCEIRO
          </p>
          <h1 className="mt-2 text-3xl font-bold">Gestão Financeira</h1>
          <p className="mt-2 text-slate-400">
            Bem-vindo, {nomeUsuario}! Controle receitas e despesas.
          </p>
        </div>

        <button
          type="button"
          onClick={novoLancamento}
          disabled={salvando || carregando}
          className={botao}
        >
          + Novo lançamento
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

      {mostrarFormulario && (
        <form
          onSubmit={salvar}
          className="mb-8 rounded-xl border border-slate-800 bg-slate-900 p-6"
        >
          <h2 className="mb-5 text-xl font-bold">
            {idEdicao ? "Editar lançamento" : "Cadastrar lançamento"}
          </h2>

          <fieldset disabled={salvando} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm">Tipo</span>
                <select
                  value={formulario.tipo}
                  onChange={(event) =>
                    alterar("tipo", event.target.value as Tipo)
                  }
                  className={input}
                >
                  <option value="receita">Receita</option>
                  <option value="despesa">Despesa</option>
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm">Descrição</span>
                <input
                  required
                  value={formulario.descricao}
                  onChange={(event) =>
                    alterar("descricao", event.target.value)
                  }
                  className={input}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm">Categoria</span>
                <input
                  required
                  placeholder="Mensalidade, material, manutenção..."
                  value={formulario.categoria}
                  onChange={(event) =>
                    alterar("categoria", event.target.value)
                  }
                  className={input}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm">Valor em reais</span>
                <input
                  required
                  inputMode="decimal"
                  placeholder="1500,50"
                  value={formulario.valor}
                  onChange={(event) => alterar("valor", event.target.value)}
                  className={input}
                />
                <p className="text-xs text-slate-400">
                  Sem separador de milhar. Exemplo: 1500,50.
                </p>
              </label>

              <label className="block space-y-2">
                <span className="text-sm">Vencimento</span>
                <input
                  required
                  type="date"
                  value={formulario.vencimento}
                  onChange={(event) =>
                    alterar("vencimento", event.target.value)
                  }
                  className={input}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm">Situação</span>
                <select
                  value={formulario.status}
                  onChange={(event) => {
                    const status = event.target.value as Status;

                    setFormulario((atual) => ({
                      ...atual,
                      status,
                      data_pagamento:
                        status === "pago" ? atual.data_pagamento : "",
                    }));
                  }}
                  className={input}
                >
                  <option value="pendente">Pendente</option>
                  <option value="pago">
                    {formulario.tipo === "receita" ? "Recebido" : "Pago"}
                  </option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </label>

              {formulario.status === "pago" && (
                <label className="block space-y-2">
                  <span className="text-sm">
                    {formulario.tipo === "receita"
                      ? "Data de recebimento"
                      : "Data de pagamento"}
                  </span>
                  <input
                    required
                    type="date"
                    value={formulario.data_pagamento}
                    onChange={(event) =>
                      alterar("data_pagamento", event.target.value)
                    }
                    className={input}
                  />
                </label>
              )}
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
                disabled={salvando}
                className={botao}
              >
                {salvando ? "Salvando..." : "Salvar lançamento"}
              </button>

              <button
                type="button"
                onClick={fecharFormulario}
                className="rounded-lg border border-slate-700 px-5 py-3"
              >
                Cancelar edição
              </button>
            </div>
          </fieldset>
        </form>
      )}

      <section className="mb-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="mb-5 text-xl font-bold">Filtros</h2>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="block space-y-2">
            <span className="text-sm text-slate-400">Pesquisar</span>
            <input
              value={pesquisa}
              onChange={(event) => setPesquisa(event.target.value)}
              placeholder="Descrição ou categoria..."
              className={input}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm text-slate-400">Tipo</span>
            <select
              value={tipoFiltro}
              onChange={(event) =>
                setTipoFiltro(event.target.value as Tipo | "todos")
              }
              className={input}
            >
              <option value="todos">Todos</option>
              <option value="receita">Receitas</option>
              <option value="despesa">Despesas</option>
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm text-slate-400">Situação</span>
            <select
              value={statusFiltro}
              onChange={(event) =>
                setStatusFiltro(event.target.value as Status | "todos")
              }
              className={input}
            >
              <option value="todos">Todas</option>
              {Object.entries(nomesStatus).map(([valor, nome]) => (
                <option key={valor} value={valor}>{nome}</option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm text-slate-400">
              Mês do vencimento
            </span>
            <input
              type="month"
              value={mesFiltro}
              onChange={(event) => setMesFiltro(event.target.value)}
              className={input}
            />
          </label>
        </div>

        <button
          type="button"
          onClick={() => {
            setPesquisa("");
            setTipoFiltro("todos");
            setStatusFiltro("todos");
            setMesFiltro("");
          }}
          className="mt-4 text-sm text-blue-400 hover:underline"
        >
          Limpar filtros
        </button>
      </section>

      <p className="mb-4 text-sm text-slate-400">
        Os totais abaixo seguem os filtros e excluem lançamentos
        cancelados. O mês considera o vencimento, não a data de pagamento.
        O saldo realizado é a diferença entre receitas recebidas e
        despesas pagas, sem saldo inicial.
      </p>

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {indicadores.map((item) => (
          <div
            key={item.titulo}
            className="rounded-xl border border-slate-800 bg-slate-900 p-6"
          >
            <p className="text-sm text-slate-400">{item.titulo}</p>
            <p className={`mt-2 text-2xl font-bold ${item.cor}`}>
              {carregando ? "—" : moeda(item.valor)}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="mb-5 text-xl font-bold">Lançamentos</h2>

        {carregando ? (
          <p role="status" className="py-6 text-slate-400">
            Carregando lançamentos...
          </p>
        ) : filtrados.length === 0 ? (
          <p className="py-6 text-center text-slate-400">
            Nenhum lançamento encontrado.
          </p>
        ) : (
          <div className="space-y-4">
            {filtrados.map((item) => {
              const vencido =
                item.status === "pendente" &&
                !!hoje &&
                item.vencimento < hoje;

              const situacao =
                item.status === "pago"
                  ? item.tipo === "receita" ? "Recebido" : "Pago"
                  : vencido ? "Pendente · Vencido" : nomesStatus[item.status];

              return (
                <article
                  key={item.id}
                  className="rounded-xl border border-slate-700 p-5"
                >
                  <div className="flex flex-wrap justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase text-slate-400">
                        {item.tipo === "receita" ? "Receita" : "Despesa"}
                        {" • "}
                        {item.categoria}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold">
                        {item.descricao}
                      </h3>
                    </div>

                    <p
                      className={`text-xl font-bold ${
                        item.tipo === "receita"
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }`}
                    >
                      {moeda(centavosDoBanco(item.valor))}
                    </p>
                  </div>

                  <dl className="mt-4 grid gap-4 text-sm md:grid-cols-3">
                    <div>
                      <dt className="text-slate-500">Vencimento</dt>
                      <dd>{formatarData(item.vencimento)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Situação</dt>
                      <dd className={vencido ? "text-amber-400" : ""}>
                        {situacao}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">
                        {item.tipo === "receita"
                          ? "Recebimento"
                          : "Pagamento"}
                      </dt>
                      <dd>
                        {item.data_pagamento
                          ? formatarData(item.data_pagamento)
                          : "—"}
                      </dd>
                    </div>
                  </dl>

                  {item.observacoes && (
                    <p className="mt-4 whitespace-pre-wrap break-words text-sm text-slate-300">
                      {item.observacoes}
                    </p>
                  )}

                  <button
                    type="button"
                    disabled={salvando}
                    onClick={() => editar(item)}
                    className="mt-5 text-sm text-blue-400 hover:underline disabled:opacity-50"
                  >
                    Editar / alterar situação
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}