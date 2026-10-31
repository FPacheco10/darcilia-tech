"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type Status =
  | "aberto"
  | "em_atendimento"
  | "aguardando"
  | "concluido"
  | "cancelado";

type Prioridade = "baixa" | "normal" | "alta" | "urgente";

type Chamado = {
  id: string;
  titulo: string;
  descricao: string;
  local: string;
  solicitante: string;
  prioridade: Prioridade;
  status: Status;
  created_at: string;
};

type Formulario = {
  titulo: string;
  descricao: string;
  local: string;
  solicitante: string;
  prioridade: Prioridade;
  status: Status;
};

const statusDisponiveis: Record<Status, string> = {
  aberto: "Aberto",
  em_atendimento: "Em atendimento",
  aguardando: "Aguardando",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const prioridades: Record<Prioridade, string> = {
  baixa: "Baixa",
  normal: "Normal",
  alta: "Alta",
  urgente: "Urgente",
};

const formularioVazio: Formulario = {
  titulo: "",
  descricao: "",
  local: "",
  solicitante: "",
  prioridade: "normal",
  status: "aberto",
};

const campos =
  "id, titulo, descricao, local, solicitante, prioridade, status, created_at";

export default function ChamadosTI() {
  const [supabase] = useState(() => createClient());

  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const [pesquisa, setPesquisa] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<Status | "todos">("todos");

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [idEdicao, setIdEdicao] = useState<string | null>(null);
  const [formulario, setFormulario] = useState<Formulario>(formularioVazio);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const { data, error } = await supabase
          .from("chamados")
          .select(campos)
          .order("created_at", { ascending: false });

        if (!ativo) return;

        if (error) {
          setErro(`Não foi possível carregar os chamados: ${error.message}`);
          return;
        }

        setChamados((data ?? []) as Chamado[]);
      } catch {
        if (ativo) {
          setErro("Falha de conexão. Atualize a página para tentar novamente.");
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

  function alterarCampo<K extends keyof Formulario>(
    campo: K,
    valor: Formulario[K]
  ) {
    setFormulario((atual) => ({ ...atual, [campo]: valor }));
  }

  function fecharFormulario() {
    setMostrarFormulario(false);
    setIdEdicao(null);
    setFormulario(formularioVazio);
  }

  function novoChamado() {
    setErro("");
    setMensagem("");
    setIdEdicao(null);
    setFormulario(formularioVazio);
    setMostrarFormulario(true);
  }

  function editarChamado(chamado: Chamado) {
    setErro("");
    setMensagem("");
    setIdEdicao(chamado.id);

    setFormulario({
      titulo: chamado.titulo,
      descricao: chamado.descricao,
      local: chamado.local,
      solicitante: chamado.solicitante,
      prioridade: chamado.prioridade,
      status: chamado.status,
    });

    setMostrarFormulario(true);
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (ocupado) return;

    setErro("");
    setMensagem("");

    const dados = {
      ...formulario,
      titulo: formulario.titulo.trim(),
      descricao: formulario.descricao.trim(),
      local: formulario.local.trim(),
      solicitante: formulario.solicitante.trim(),
    };

    if (
      !dados.titulo ||
      !dados.descricao ||
      !dados.local ||
      !dados.solicitante
    ) {
      setErro("Preencha todos os campos.");
      return;
    }

    setOcupado(true);

    try {
      const consulta = idEdicao
        ? supabase
            .from("chamados")
            .update({
              ...dados,
              updated_at: new Date().toISOString(),
            })
            .eq("id", idEdicao)
        : supabase.from("chamados").insert(dados);

      const { data, error } = await consulta.select(campos).single();

      if (error) {
        setErro(`Não foi possível salvar: ${error.message}`);
        return;
      }

      const salvo = data as Chamado;

      setChamados((lista) =>
        idEdicao
          ? lista.map((item) => (item.id === idEdicao ? salvo : item))
          : [salvo, ...lista]
      );

      setMensagem(idEdicao ? "Chamado atualizado!" : "Chamado cadastrado!");
      fecharFormulario();
    } catch {
      setErro(
        "Falha de conexão ao salvar. Atualize a página para conferir o resultado antes de tentar novamente."
      );
    } finally {
      setOcupado(false);
    }
  }

  async function excluir(chamado: Chamado) {
    if (ocupado) return;

    if (!window.confirm(`Excluir o chamado "${chamado.titulo}"?`)) {
      return;
    }

    setErro("");
    setMensagem("");
    setOcupado(true);

    try {
      const { error } = await supabase
        .from("chamados")
        .delete()
        .eq("id", chamado.id)
        .select("id")
        .single();

      if (error) {
        setErro(`Não foi possível excluir: ${error.message}`);
        return;
      }

      setChamados((lista) => lista.filter((item) => item.id !== chamado.id));

      if (idEdicao === chamado.id) fecharFormulario();

      setMensagem("Chamado excluído!");
    } catch {
      setErro(
        "Falha de conexão ao excluir. Atualize a página para conferir o resultado."
      );
    } finally {
      setOcupado(false);
    }
  }

  const termo = pesquisa.trim().toLocaleLowerCase("pt-BR");

  const filtrados = chamados.filter((chamado) => {
    const correspondeStatus =
      filtroStatus === "todos" || chamado.status === filtroStatus;

    const correspondePesquisa = [
      chamado.titulo,
      chamado.descricao,
      chamado.local,
      chamado.solicitante,
    ].some((valor) => valor.toLocaleLowerCase("pt-BR").includes(termo));

    return correspondeStatus && correspondePesquisa;
  });

  const indicadores = [
    { titulo: "Total", valor: chamados.length },
    {
      titulo: "Abertos",
      valor: chamados.filter((item) => item.status === "aberto").length,
    },
    {
      titulo: "Em atendimento",
      valor: chamados.filter((item) => item.status === "em_atendimento").length,
    },
    {
      titulo: "Concluídos",
      valor: chamados.filter((item) => item.status === "concluido").length,
    },
  ];

  const classeInput =
    "w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white focus:border-blue-500 focus:outline-none";

  const classeBotao =
    "rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <main className="mx-auto max-w-7xl">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-blue-400">
            DARCILIA TECH / GESTÃO DE TI
          </p>

          <h1 className="mt-2 text-3xl font-bold">Chamados de TI</h1>

          <p className="mt-2 text-slate-400">
            Registre e acompanhe os atendimentos da escola.
          </p>
        </div>

        <button
          type="button"
          disabled={ocupado || carregando}
          onClick={novoChamado}
          className={classeBotao}
        >
          + Novo chamado
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
            {idEdicao ? "Editar chamado" : "Cadastrar chamado"}
          </h2>

          <fieldset disabled={ocupado} className="space-y-5">
            <label className="block space-y-2">
              <span className="text-sm">Título</span>
              <input
                required
                value={formulario.titulo}
                onChange={(event) => alterarCampo("titulo", event.target.value)}
                className={classeInput}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm">Descrição do problema</span>
              <textarea
                required
                rows={4}
                value={formulario.descricao}
                onChange={(event) =>
                  alterarCampo("descricao", event.target.value)
                }
                className={classeInput}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm">Local ou sala</span>
                <input
                  required
                  value={formulario.local}
                  onChange={(event) => alterarCampo("local", event.target.value)}
                  className={classeInput}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm">Nome do solicitante</span>
                <input
                  required
                  value={formulario.solicitante}
                  onChange={(event) =>
                    alterarCampo("solicitante", event.target.value)
                  }
                  className={classeInput}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm">Prioridade</span>
                <select
                  value={formulario.prioridade}
                  onChange={(event) =>
                    alterarCampo("prioridade", event.target.value as Prioridade)
                  }
                  className={classeInput}
                >
                  {Object.entries(prioridades).map(([valor, nome]) => (
                    <option key={valor} value={valor}>{nome}</option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm">Status</span>
                <select
                  value={formulario.status}
                  onChange={(event) =>
                    alterarCampo("status", event.target.value as Status)
                  }
                  className={classeInput}
                >
                  {Object.entries(statusDisponiveis).map(([valor, nome]) => (
                    <option key={valor} value={valor}>{nome}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={ocupado} className={classeBotao}>
                {ocupado ? "Salvando..." : "Salvar chamado"}
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
        <h2 className="mb-5 text-xl font-bold">Lista de chamados</h2>

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm text-slate-400">Pesquisar</span>
            <input
              value={pesquisa}
              onChange={(event) => setPesquisa(event.target.value)}
              placeholder="Título, descrição, local ou solicitante..."
              className={classeInput}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm text-slate-400">Filtrar por status</span>
            <select
              value={filtroStatus}
              onChange={(event) =>
                setFiltroStatus(event.target.value as Status | "todos")
              }
              className={classeInput}
            >
              <option value="todos">Todos</option>
              {Object.entries(statusDisponiveis).map(([valor, nome]) => (
                <option key={valor} value={valor}>{nome}</option>
              ))}
            </select>
          </label>
        </div>

        {carregando ? (
          <p role="status" className="py-6 text-slate-400">
            Carregando chamados...
          </p>
        ) : filtrados.length === 0 ? (
          <p className="py-6 text-center text-slate-400">
            Nenhum chamado encontrado.
          </p>
        ) : (
          <div className="space-y-4">
            {filtrados.map((chamado) => (
              <article
                key={chamado.id}
                className="rounded-xl border border-slate-700 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">{chamado.titulo}</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {chamado.local} • {chamado.solicitante}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-blue-950 px-3 py-1 text-blue-200">
                      {statusDisponiveis[chamado.status]}
                    </span>
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-200">
                      Prioridade: {prioridades[chamado.prioridade]}
                    </span>
                  </div>
                </div>

                <p className="mt-4 whitespace-pre-wrap break-words text-sm text-slate-300">
                  {chamado.descricao}
                </p>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                  <p className="text-xs text-slate-500">
                    Criado em{" "}
                    {new Date(chamado.created_at).toLocaleString("pt-BR")}
                  </p>

                  <div className="flex gap-4">
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => editarChamado(chamado)}
                      className="text-sm text-blue-400 hover:underline disabled:opacity-50"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => void excluir(chamado)}
                      className="text-sm text-red-400 hover:underline disabled:opacity-50"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}