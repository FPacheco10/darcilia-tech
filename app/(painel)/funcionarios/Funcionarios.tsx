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

type Cadastro = {
  nome: string;
  email: string;
  senha: string;
  perfil: Perfil;
  ativo: boolean;
};

type RespostaCadastro = {
  erro?: string;
  mensagem?: string;
  funcionario?: Funcionario;
};

const nomesPerfis: Record<Perfil, string> = {
  administrador: "Administrador",
  ti: "TI",
  secretaria: "Secretaria",
  financeiro: "Financeiro",
  consulta: "Consulta",
};

const cadastroVazio: Cadastro = {
  nome: "",
  email: "",
  senha: "",
  perfil: "consulta",
  ativo: false,
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

  const [mostrarCadastro, setMostrarCadastro] = useState(false);
  const [cadastro, setCadastro] = useState<Cadastro>(cadastroVazio);

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

  function alterarCadastro<K extends keyof Cadastro>(
    campo: K,
    valor: Cadastro[K]
  ) {
    setCadastro((atual) => ({ ...atual, [campo]: valor }));
  }

  function abrirCadastro() {
    if (salvando) return;

    setErro("");
    setMensagem("");
    setSelecionado(null);
    setCadastro(cadastroVazio);
    setMostrarCadastro(true);
  }

  function fecharCadastro() {
    setMostrarCadastro(false);
    setCadastro(cadastroVazio);
  }

  async function cadastrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (salvando) return;

    setErro("");
    setMensagem("");

    const nome = cadastro.nome.trim();
    const email = cadastro.email.trim().toLowerCase();

    if (nome.length < 2 || nome.length > 150) {
      setErro("Informe um nome entre 2 e 150 caracteres.");
      return;
    }

    if (
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      setErro("Informe um e-mail válido.");
      return;
    }

    if (cadastro.senha.length < 12 || cadastro.senha.length > 128) {
      setErro("A senha deve ter entre 12 e 128 caracteres.");
      return;
    }

    setSalvando(true);

    try {
      const resposta = await fetch("/api/funcionarios", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome,
          email,
          senha: cadastro.senha,
          perfil: cadastro.perfil,
          ativo: cadastro.ativo,
        }),
      });

      const resultado =
        (await resposta.json()) as RespostaCadastro;

      if (!resposta.ok) {
        setErro(
          resultado.erro ??
            "Não foi possível cadastrar. Confira a lista antes de tentar novamente."
        );
        return;
      }

      const funcionario = resultado.funcionario;

      if (!funcionario) {
        setErro(
          "O servidor respondeu sem os dados da conta. Atualize a lista antes de tentar novamente."
        );
        return;
      }

      setFuncionarios((lista) =>
        [
          ...lista.filter((item) => item.id !== funcionario.id),
          funcionario,
        ].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
      );

      // Garante que a nova conta fique visível na lista.
      setPesquisa("");
      setFiltro("todos");
      fecharCadastro();
      setMensagem(
        funcionario.ativo
          ? "Funcionário cadastrado com acesso ativo!"
          : "Funcionário cadastrado. A conta está inativa."
      );
    } catch {
      setErro(
        "Não foi possível confirmar o cadastro. Atualize a lista e confira Authentication → Users no Supabase antes de tentar novamente."
      );
    } finally {
      // A senha não permanece no formulário após o envio.
      setCadastro((atual) => ({ ...atual, senha: "" }));
      setSalvando(false);
    }
  }

  function editar(funcionario: Funcionario) {
    if (funcionario.id === usuarioAtualId || salvando) return;

    setErro("");
    setMensagem("");
    fecharCadastro();
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

  const cancelar =
    "rounded-lg border border-slate-700 px-5 py-3 hover:bg-slate-800";

  return (
    <main className="mx-auto max-w-7xl">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-blue-400">
            DARCILIA TECH / FUNCIONÁRIOS
          </p>
          <h1 className="mt-2 text-3xl font-bold">
            Gestão de Funcionários
          </h1>
          <p className="mt-2 text-slate-400">
            Cadastre contas e gerencie seus perfis de acesso.
          </p>
        </div>

        <button
          type="button"
          onClick={abrirCadastro}
          disabled={salvando || carregando}
          className={botao}
        >
          + Novo funcionário
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

      {mostrarCadastro && (
        <form
          onSubmit={cadastrar}
          className="mb-8 rounded-xl border border-slate-800 bg-slate-900 p-6"
        >
          <h2 className="mb-5 text-xl font-bold">
            Cadastrar funcionário
          </h2>

          <fieldset disabled={salvando} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm">Nome completo</span>
                <input
                  required
                  minLength={2}
                  maxLength={150}
                  autoComplete="name"
                  value={cadastro.nome}
                  onChange={(event) =>
                    alterarCadastro("nome", event.target.value)
                  }
                  className={input}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm">E-mail de acesso</span>
                <input
                  required
                  type="email"
                  maxLength={254}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={cadastro.email}
                  onChange={(event) =>
                    alterarCadastro("email", event.target.value)
                  }
                  className={input}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm">Senha</span>
                <input
                  required
                  type="password"
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                  value={cadastro.senha}
                  onChange={(event) =>
                    alterarCadastro("senha", event.target.value)
                  }
                  className={input}
                />
                <p className="text-xs text-slate-400">
                  Use entre 12 e 128 caracteres.
                </p>
              </label>

              <label className="block space-y-2">
                <span className="text-sm">Perfil de acesso</span>
                <select
                  value={cadastro.perfil}
                  onChange={(event) =>
                    alterarCadastro("perfil", event.target.value as Perfil)
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
                  value={cadastro.ativo ? "ativo" : "inativo"}
                  onChange={(event) =>
                    alterarCadastro("ativo", event.target.value === "ativo")
                  }
                  className={input}
                >
                  <option value="inativo">Inativo</option>
                  <option value="ativo">Ativo</option>
                </select>
              </label>
            </div>

            <p className="text-sm text-slate-400">
              O e-mail será confirmado administrativamente. A conta
              ativa poderá acessar o sistema com a senha definida.
              Nenhum e-mail será enviado por esse cadastro.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={salvando}
                className={botao}
              >
                {salvando ? "Cadastrando..." : "Cadastrar funcionário"}
              </button>

              <button
                type="button"
                onClick={fecharCadastro}
                className={cancelar}
              >
                Cancelar
              </button>
            </div>
          </fieldset>
        </form>
      )}

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
                className={cancelar}
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