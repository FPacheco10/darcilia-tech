"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Perfil } from "@/lib/config/modulos";

type Funcionario = {
  id: string;
  nome: string;
  perfil: Perfil;
  ativo: boolean;
};

type Props = {
  usuarioAtualId: string;
};

const nomesPerfis: Record<Perfil, string> = {
  administrador: "Administrador",
  ti: "TI",
  secretaria: "Secretaria",
  financeiro: "Financeiro",
  consulta: "Consulta",
};

export default function Funcionarios({ usuarioAtualId }: Props) {
  const [supabase] = useState(() => createClient());

  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [pesquisa, setPesquisa] = useState("");
  const [filtro, setFiltro] = useState("todos");

  const [selecionado, setSelecionado] = useState<Funcionario | null>(null);
  const [novoPerfil, setNovoPerfil] = useState<Perfil>("consulta");
  const [novoAtivo, setNovoAtivo] = useState(false);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const { data, error } = await supabase.rpc("listar_funcionarios");

        if (!ativo) return;

        if (error) {
          setErro(`Não foi possível carregar: ${error.message}`);
          return;
        }

        setFuncionarios((data ?? []) as Funcionario[]);
      } catch {
        if (ativo) {
          setErro("Falha de conexão ao carregar os funcionários.");
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

  function editar(funcionario: Funcionario) {
    if (funcionario.id === usuarioAtualId || salvando) return;

    setErro("");
    setMensagem("");
    setSelecionado(funcionario);
    setNovoPerfil(funcionario.perfil);
    setNovoAtivo(funcionario.ativo);
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selecionado || salvando) return;

    if (selecionado.id === usuarioAtualId) {
      setErro("Você não pode alterar o próprio acesso.");
      return;
    }

    const confirmar = window.confirm(
      `Salvar o acesso de ${selecionado.nome}?\n\n` +
        `Perfil: ${nomesPerfis[novoPerfil]}\n` +
        `Situação: ${novoAtivo ? "Ativo" : "Inativo"}`
    );

    if (!confirmar) return;

    setErro("");
    setMensagem("");
    setSalvando(true);

    try {
      const { error } = await supabase.rpc(
        "atualizar_acesso_funcionario",
        {
          funcionario_id: selecionado.id,
          novo_perfil: novoPerfil,
          novo_ativo: novoAtivo,
        }
      );

      if (error) {
        setErro(`Não foi possível salvar: ${error.message}`);
        return;
      }

      setFuncionarios((lista) =>
        lista.map((item) =>
          item.id === selecionado.id
            ? { ...item, perfil: novoPerfil, ativo: novoAtivo }
            : item
        )
      );

      setSelecionado(null);
      setMensagem("Acesso do funcionário atualizado!");
    } catch {
      setErro(
        "Falha de conexão ao salvar. Atualize a página para conferir o resultado antes de tentar novamente."
      );
    } finally {
      setSalvando(false);
    }
  }

  const termo = pesquisa.trim().toLocaleLowerCase("pt-BR");

  const filtrados = funcionarios.filter((item) => {
    const correspondePesquisa = item.nome
      .toLocaleLowerCase("pt-BR")
      .includes(termo);

    const correspondeFiltro =
      filtro === "todos" ||
      (filtro === "ativos" && item.ativo) ||
      (filtro === "inativos" && !item.ativo);

    return correspondePesquisa && correspondeFiltro;
  });

  const indicadores = [
    { titulo: "Total de funcionários", valor: funcionarios.length },
    {
      titulo: "Ativos",
      valor: funcionarios.filter((item) => item.ativo).length,
    },
    {
      titulo: "Inativos",
      valor: funcionarios.filter((item) => !item.ativo).length,
    },
  ];

  const input =
    "w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white focus:border-blue-500 focus:outline-none";

  const botao =
    "rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <main className="mx-auto max-w-7xl">
      <header className="mb-8">
        <p className="text-sm text-blue-400">
          DARCILIA TECH / FUNCIONÁRIOS
        </p>
        <h1 className="mt-2 text-3xl font-bold">
          Gestão de Funcionários
        </h1>
        <p className="mt-2 text-slate-400">
          Consulte as contas e gerencie seus perfis de acesso.
        </p>
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

      {selecionado && (
        <form
          onSubmit={salvar}
          className="mb-8 rounded-xl border border-slate-800 bg-slate-900 p-6"
        >
          <h2 className="mb-5 text-xl font-bold">
            Alterar acesso: {selecionado.nome}
          </h2>

          <fieldset disabled={salvando} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm">Perfil de acesso</span>
                <select
                  value={novoPerfil}
                  onChange={(event) =>
                    setNovoPerfil(event.target.value as Perfil)
                  }
                  className={input}
                >
                  {Object.entries(nomesPerfis).map(([valor, nome]) => (
                    <option key={valor} value={valor}>
                      {nome}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm">Situação</span>
                <select
                  value={novoAtivo ? "ativo" : "inativo"}
                  onChange={(event) =>
                    setNovoAtivo(event.target.value === "ativo")
                  }
                  className={input}
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={salvando}
                className={botao}
              >
                {salvando ? "Salvando..." : "Salvar acesso"}
              </button>

              <button
                type="button"
                onClick={() => setSelecionado(null)}
                className="rounded-lg border border-slate-700 px-5 py-3"
              >
                Cancelar
              </button>
            </div>
          </fieldset>
        </form>
      )}

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="mb-5 text-xl font-bold">
          Funcionários cadastrados
        </h2>

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm text-slate-400">
              Pesquisar pelo nome
            </span>
            <input
              value={pesquisa}
              onChange={(event) => setPesquisa(event.target.value)}
              placeholder="Nome do funcionário..."
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
              <option value="todos">Todos</option>
              <option value="ativos">Ativos</option>
              <option value="inativos">Inativos</option>
            </select>
          </label>
        </div>

        {carregando ? (
          <p role="status" className="py-6 text-slate-400">
            Carregando funcionários...
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800 text-slate-300">
                <tr>
                  <th scope="col" className="p-4">Nome</th>
                  <th scope="col" className="p-4">Perfil</th>
                  <th scope="col" className="p-4">Situação</th>
                  <th scope="col" className="p-4">Ação</th>
                </tr>
              </thead>

              <tbody>
                {filtrados.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-800"
                  >
                    <td className="p-4 font-semibold">
                      {item.nome}
                      {item.id === usuarioAtualId && (
                        <span className="ml-2 text-xs text-blue-400">
                          (Você)
                        </span>
                      )}
                    </td>

                    <td className="p-4">
                      {nomesPerfis[item.perfil] ?? item.perfil}
                    </td>

                    <td className="p-4">
                      <span
                        className={
                          item.ativo
                            ? "text-emerald-400"
                            : "text-slate-400"
                        }
                      >
                        {item.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>

                    <td className="p-4">
                      {item.id === usuarioAtualId ? (
                        <span className="text-xs text-slate-500">
                          Próprio acesso protegido
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={salvando}
                          onClick={() => editar(item)}
                          className="text-blue-400 hover:underline disabled:opacity-50"
                        >
                          Alterar acesso
                        </button>
                      )}
                    </td>
                  </tr>
                ))}

                {filtrados.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-6 text-center text-slate-400"
                    >
                      Nenhum funcionário encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}