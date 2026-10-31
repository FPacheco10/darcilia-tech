

const menu = [
  "Visão geral",
  "Secretaria",
  "Alunos",
  "Professores",
  "Turmas",
  "Financeiro",
  "Biblioteca",
  "Patrimônio",
  "Chamados de TI",
  "Relatórios",
  "Configurações",
];

const indicadores = [
  { nome: "Alunos matriculados", valor: "850", detalhe: "Total de alunos", icone: "🎓" },
  { nome: "Professores", valor: "48", detalhe: "Corpo docente", icone: "👨‍🏫" },
  { nome: "Turmas ativas", valor: "32", detalhe: "Em funcionamento", icone: "📚" },
  { nome: "Funcionários", valor: "65", detalhe: "Equipe escolar", icone: "👥" },
];

export default function Home() {
  return (
    <main className="flex min-h-screen bg-slate-100 text-slate-800">

      {/* MENU LATERAL */}
      <aside className="hidden w-64 flex-col bg-slate-950 p-6 text-white md:flex">
        <div className="mb-10">
          <h1 className="text-2xl font-bold">Darcilia Tech</h1>
          <p className="mt-1 text-sm text-slate-400">
            Gestão Escolar
          </p>
        </div>

        <nav className="flex-1 space-y-2">
          {menu.map((item, index) => (
            <div
              key={item}
              className={`rounded-lg px-4 py-3 text-sm ${
                index === 0
                  ? "bg-blue-600 font-semibold text-white"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              {item}
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-800 pt-5">
          <p className="text-sm font-medium">Colégio Darcilia Coimbra</p>
          <p className="mt-1 text-xs text-slate-400">
            Sistema administrativo
          </p>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <section className="min-w-0 flex-1 p-5 md:p-8">

        {/* CABEÇALHO */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">
              Visão geral
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Bem-vindo ao painel administrativo do colégio.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm">
              🔔 Notificações
            </button>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
              A
            </div>
          </div>
        </header>

        {/* INDICADORES */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {indicadores.map((item) => (
            <div
              key={item.nome}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{item.nome}</p>
                <span className="text-2xl">{item.icone}</span>
              </div>
              <h3 className="mt-4 text-3xl font-bold text-slate-900">
                {item.valor}
              </h3>
              <p className="mt-2 text-xs text-slate-400">
                {item.detalhe}
              </p>
            </div>
          ))}
        </div>

        {/* ÁREA DE INFORMAÇÕES */}
        <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold">
              Matrículas
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Resumo demonstrativo do período
            </p>

            <div className="mt-8 flex h-48 items-end justify-around gap-3">
              {[45, 65, 55, 85, 70, 100].map((altura, index) => (
                <div key={index} className="flex h-full flex-1 flex-col justify-end">
                  <div
                    className="rounded-t-md bg-blue-600"
                    style={{ height: `${altura}%` }}
                  />
                  <span className="mt-2 text-center text-xs text-slate-400">
                    {["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"][index]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold">
              Resumo financeiro
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Valores fictícios para demonstração
            </p>

            <div className="mt-6 space-y-5">
              <div>
                <p className="text-sm text-slate-500">Receitas previstas</p>
                <p className="mt-1 text-2xl font-bold text-emerald-600">
                  R$ 125.000,00
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Valores pendentes</p>
                <p className="mt-1 text-2xl font-bold text-amber-600">
                  R$ 18.500,00
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Despesas previstas</p>
                <p className="mt-1 text-2xl font-bold text-rose-600">
                  R$ 42.000,00
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ATIVIDADES */}
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold">
            Atividades recentes
          </h3>

          <div className="mt-5 space-y-4">
            {[
              "Painel administrativo iniciado",
              "Módulo de secretaria planejado",
              "Módulo financeiro planejado",
            ].map((atividade) => (
              <div
                key={atividade}
                className="flex items-center gap-3 border-b border-slate-100 pb-3 text-sm"
              >
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                {atividade}
              </div>
            ))}
          </div>
        </div>

        <footer className="mt-8 text-center text-xs text-slate-400">
          Darcilia Tech © 2026 — Colégio Darcilia Coimbra
        </footer>
      </section>
    </main>
  );
}
