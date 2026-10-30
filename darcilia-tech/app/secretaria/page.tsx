
"use client";

import { useState } from "react";

type Aluno = {
  id: number;
  nome: string;
  turma: string;
  responsavel: string;
  telefone: string;
};

const alunosIniciais: Aluno[] = [
  {
    id: 1,
    nome: "Ana Oliveira",
    turma: "5º Ano A",
    responsavel: "Maria Oliveira",
    telefone: "(38) 99999-1111",
  },
  {
    id: 2,
    nome: "Pedro Santos",
    turma: "6º Ano B",
    responsavel: "João Santos",
    telefone: "(38) 99999-2222",
  },
];

export default function Secretaria() {
  const [alunos, setAlunos] = useState<Aluno[]>(alunosIniciais);
  const [pesquisa, setPesquisa] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [alunoSelecionado, setAlunoSelecionado] = useState<Aluno | null>(null);
  const [idEdicao, setIdEdicao] = useState<number | null>(null);

  const [nome, setNome] = useState("");
  const [turma, setTurma] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [telefone, setTelefone] = useState("");

  function limparFormulario() {
    setNome("");
    setTurma("");
    setResponsavel("");
    setTelefone("");
    setIdEdicao(null);
    setMostrarFormulario(false);
  }

  function salvarAluno(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (idEdicao !== null) {
      setAlunos((lista) =>
        lista.map((aluno) =>
          aluno.id === idEdicao
            ? { id: idEdicao, nome, turma, responsavel, telefone }
            : aluno
        )
      );
    } else {
      const novoAluno: Aluno = {
        id: Date.now(),
        nome,
        turma,
        responsavel,
        telefone,
      };

      setAlunos((lista) => [...lista, novoAluno]);
    }

    limparFormulario();
  }

  function editarAluno(aluno: Aluno) {
    setIdEdicao(aluno.id);
    setNome(aluno.nome);
    setTurma(aluno.turma);
    setResponsavel(aluno.responsavel);
    setTelefone(aluno.telefone);
    setAlunoSelecionado(null);
    setMostrarFormulario(true);
  }

  function excluirAluno(id: number) {
    const confirmar = window.confirm(
      "Tem certeza de que deseja excluir este aluno?"
    );

    if (confirmar) {
      setAlunos((lista) => lista.filter((aluno) => aluno.id !== id));
      setAlunoSelecionado(null);
    }
  }

  const alunosFiltrados = alunos.filter((aluno) =>
    aluno.nome.toLowerCase().includes(pesquisa.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-slate-100 p-5 md:p-8">
      <div className="mx-auto max-w-7xl">

        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-blue-600">
              DARCI LIA TECH / SECRETARIA
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Gestão de Alunos
            </h1>
            <p className="mt-2 text-slate-500">
              Cadastro e acompanhamento de alunos.
            </p>
          </div>

          <button
            onClick={() => {
              limparFormulario();
              setMostrarFormulario(true);
            }}
            className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
          >
            + Novo aluno
          </button>
        </header>

        <section className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Alunos cadastrados</p>
            <h2 className="mt-2 text-3xl font-bold text-blue-700">
              {alunos.length}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Resultados da pesquisa</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-800">
              {alunosFiltrados.length}
            </h2>
          </div>
        </section>

        {mostrarFormulario && (
          <form
            onSubmit={salvarAluno}
            className="mb-8 rounded-xl bg-white p-6 shadow-sm"
          >
            <h2 className="mb-5 text-xl font-bold text-slate-800">
              {idEdicao !== null ? "Editar aluno" : "Cadastrar novo aluno"}
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input
                required
                placeholder="Nome completo do aluno"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="rounded-lg border p-3"
              />

              <input
                required
                placeholder="Turma"
                value={turma}
                onChange={(e) => setTurma(e.target.value)}
                className="rounded-lg border p-3"
              />

              <input
                required
                placeholder="Nome do responsável"
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                className="rounded-lg border p-3"
              />

              <input
                required
                placeholder="Telefone do responsável"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="rounded-lg border p-3"
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="submit"
                className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white"
              >
                {idEdicao !== null ? "Salvar alterações" : "Cadastrar aluno"}
              </button>

              <button
                type="button"
                onClick={limparFormulario}
                className="rounded-lg border px-5 py-3"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800">
            Alunos cadastrados
          </h2>

          <input
            placeholder="Pesquisar aluno pelo nome..."
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
            className="mt-4 mb-5 w-full rounded-lg border p-3 md:max-w-md"
          />

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="p-4">Aluno</th>
                  <th className="p-4">Turma</th>
                  <th className="p-4">Responsável</th>
                  <th className="p-4">Telefone</th>
                  <th className="p-4">Ações</th>
                </tr>
              </thead>

              <tbody>
                {alunosFiltrados.map((aluno) => (
                  <tr key={aluno.id} className="border-b">
                    <td className="p-4 font-semibold">{aluno.nome}</td>
                    <td className="p-4">{aluno.turma}</td>
                    <td className="p-4">{aluno.responsavel}</td>
                    <td className="p-4">{aluno.telefone}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setAlunoSelecionado(aluno)}
                          className="text-blue-700 hover:underline"
                        >
                          Ver
                        </button>

                        <button
                          onClick={() => editarAluno(aluno)}
                          className="text-emerald-700 hover:underline"
                        >
                          Editar
                        </button>

                        <button
                          onClick={() => excluirAluno(aluno.id)}
                          className="text-red-600 hover:underline"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {alunosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500">
                      Nenhum aluno encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {alunoSelecionado && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">
                  Ficha do aluno
                </h2>

                <button
                  onClick={() => setAlunoSelecionado(null)}
                  className="text-slate-500 hover:text-slate-900"
                >
                  Fechar
                </button>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <p className="text-sm text-slate-500">Nome</p>
                  <p className="font-semibold">{alunoSelecionado.nome}</p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Turma</p>
                  <p className="font-semibold">{alunoSelecionado.turma}</p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Responsável</p>
                  <p className="font-semibold">{alunoSelecionado.responsavel}</p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Telefone</p>
                  <p className="font-semibold">{alunoSelecionado.telefone}</p>
                </div>
              </div>

              <button
                onClick={() => editarAluno(alunoSelecionado)}
                className="mt-7 w-full rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white"
              >
                Editar cadastro
              </button>
            </div>
          </div>
        )}

        <p className="mt-5 text-center text-xs text-slate-400">
          Darcilia Tech — Módulo de Secretaria
        </p>
      </div>
    </main>
  );
}
