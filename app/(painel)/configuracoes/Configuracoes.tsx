
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type ConfiguracaoEscola = {
  id: number;
  nome_escola: string;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  ano_letivo: number;
  capacidade_padrao: number;
  updated_at: string;
};

type Formulario = {
  nome_escola: string;
  cnpj: string;
  telefone: string;
  email: string;
  endereco: string;
  ano_letivo: string;
  capacidade_padrao: string;
};

const supabase = createClient();

const classeInput =
  "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500 disabled:opacity-50";

const formularioInicial: Formulario = {
  nome_escola: "",
  cnpj: "",
  telefone: "",
  email: "",
  endereco: "",
  ano_letivo: String(new Date().getFullYear()),
  capacidade_padrao: "30",
};

export default function Configuracoes() {
  const [formulario, setFormulario] = useState<Formulario>({
    ...formularioInicial,
  });

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState("");

  async function carregarConfiguracoes() {
    setCarregando(true);
    setErro("");

    const { data, error } = await supabase
      .from("configuracoes_escola")
      .select(
        "id,nome_escola,cnpj,telefone,email,endereco,ano_letivo,capacidade_padrao,updated_at"
      )
      .eq("id", 1)
      .single();

    if (error) {
      setErro(
        "Erro ao carregar configurações: " + error.message
      );
    } else if (data) {
      const configuracao = data as ConfiguracaoEscola;

      setFormulario({
        nome_escola: configuracao.nome_escola ?? "",
        cnpj: configuracao.cnpj ?? "",
        telefone: configuracao.telefone ?? "",
        email: configuracao.email ?? "",
        endereco: configuracao.endereco ?? "",
        ano_letivo: String(configuracao.ano_letivo),
        capacidade_padrao: String(
          configuracao.capacidade_padrao
        ),
      });

      setUltimaAtualizacao(configuracao.updated_at);
    }

    setCarregando(false);
  }

  useEffect(() => {
    void carregarConfiguracoes();
  }, []);

  function atualizarCampo(
    campo: keyof Formulario,
    valor: string
  ) {
    setFormulario((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  }

  async function salvarConfiguracoes(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();

    setErro("");
    setMensagem("");

    const ano = Number(formulario.ano_letivo);
    const capacidade = Number(formulario.capacidade_padrao);

    if (!formulario.nome_escola.trim()) {
      setErro("Informe o nome da escola.");
      return;
    }

    if (
      !Number.isInteger(ano) ||
      ano < 2020 ||
      ano > 2100
    ) {
      setErro(
        "O ano letivo deve estar entre 2020 e 2100."
      );
      return;
    }

    if (
      !Number.isInteger(capacidade) ||
      capacidade <= 0
    ) {
      setErro(
        "A capacidade padrão deve ser um número inteiro maior que zero."
      );
      return;
    }

    setSalvando(true);

    const dados = {
      nome_escola: formulario.nome_escola.trim(),
      cnpj: formulario.cnpj.trim() || null,
      telefone: formulario.telefone.trim() || null,
      email: formulario.email.trim() || null,
      endereco: formulario.endereco.trim() || null,
      ano_letivo: ano,
      capacidade_padrao: capacidade,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("configuracoes_escola")
      .update(dados)
      .eq("id", 1)
      .select("id,updated_at");

    if (error) {
      setErro(
        "Erro ao salvar configurações: " + error.message
      );
    } else if (!data?.length) {
      setErro(
        "As configurações não foram atualizadas. Verifique suas permissões."
      );
    } else {
      setUltimaAtualizacao(data[0].updated_at);
      setMensagem("Configurações salvas com sucesso!");
    }

    setSalvando(false);
  }

  function campo(
    titulo: string,
    chave: keyof Formulario,
    tipo = "text",
    placeholder = ""
  ) {
    return (
      <label className="space-y-2">
        <span className="block text-sm text-slate-300">
          {titulo}
        </span>

        <input
          type={tipo}
          value={formulario[chave]}
          onChange={(e) =>
            atualizarCampo(chave, e.target.value)
          }
          placeholder={placeholder}
          disabled={carregando || salvando}
          className={classeInput}
        />
      </label>
    );
  }

  return (
    <div className="space-y-6 p-4 text-white md:p-8">
      <div>
        <h1 className="text-3xl font-bold">
          Configurações do sistema
        </h1>

        <p className="mt-2 text-slate-400">
          Gerencie as informações institucionais e
          preferências acadêmicas do Darcilia Tech.
        </p>
      </div>

      <div className="rounded-2xl border border-blue-900 bg-slate-900 p-5">
        <p className="font-semibold text-blue-300">
          Área administrativa
        </p>

        <p className="mt-2 text-sm text-slate-400">
          Apenas usuários com perfil administrador
          podem acessar e alterar estas configurações.
        </p>
      </div>

      {erro && (
        <p
          role="alert"
          className="rounded-xl border border-red-800 bg-red-950 p-4 text-red-300"
        >
          {erro}
        </p>
      )}

      {mensagem && (
        <p
          role="status"
          className="rounded-xl border border-green-800 bg-green-950 p-4 text-green-300"
        >
          {mensagem}
        </p>
      )}

      {carregando ? (
        <p className="text-slate-400">
          Carregando dados da escola...
        </p>
      ) : (
        <form
          onSubmit={salvarConfiguracoes}
          className="space-y-6"
        >
          <section className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">
              Dados da escola
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              {campo(
                "Nome da escola",
                "nome_escola",
                "text",
                "Nome da instituição"
              )}

              {campo(
                "CNPJ",
                "cnpj",
                "text",
                "00.000.000/0000-00"
              )}

              {campo(
                "Telefone",
                "telefone",
                "tel",
                "(00) 00000-0000"
              )}

              {campo(
                "E-mail institucional",
                "email",
                "email",
                "contato@escola.com.br"
              )}
            </div>

            {campo(
              "Endereço",
              "endereco",
              "text",
              "Rua, número, bairro, cidade e estado"
            )}
          </section>

          <section className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">
              Configurações acadêmicas
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="block text-sm text-slate-300">
                  Ano letivo atual
                </span>

                <input
                  type="number"
                  min={2020}
                  max={2100}
                  required
                  value={formulario.ano_letivo}
                  onChange={(e) =>
                    atualizarCampo(
                      "ano_letivo",
                      e.target.value
                    )
                  }
                  disabled={salvando}
                  className={classeInput}
                />
              </label>

              <label className="space-y-2">
                <span className="block text-sm text-slate-300">
                  Capacidade padrão das turmas
                </span>

                <input
                  type="number"
                  min={1}
                  required
                  value={formulario.capacidade_padrao}
                  onChange={(e) =>
                    atualizarCampo(
                      "capacidade_padrao",
                      e.target.value
                    )
                  }
                  disabled={salvando}
                  className={classeInput}
                />
              </label>
            </div>

            <p className="text-sm text-slate-400">
              Essas configurações servirão como
              referência para novos cadastros.
              Elas não alteram automaticamente
              as turmas já existentes.
            </p>
          </section>

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="submit"
              disabled={salvando}
              className="rounded-xl bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-500 disabled:opacity-50"
            >
              {salvando
                ? "Salvando..."
                : "Salvar configurações"}
            </button>

            {ultimaAtualizacao && (
              <p className="text-sm text-slate-400">
                Última atualização:{" "}
                {new Date(
                  ultimaAtualizacao
                ).toLocaleString("pt-BR")}
              </p>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
