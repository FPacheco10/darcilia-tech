import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const perfisPermitidos = [
  "administrador",
  "ti",
  "secretaria",
  "financeiro",
  "consulta",
];

function responder(
  dados: Record<string, unknown>,
  status: number
) {
  return Response.json(dados, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: Request) {
  // O formulário deverá chamar esta rota pelo mesmo endereço do site.
  const origem = request.headers.get("origin");

  if (origem !== new URL(request.url).origin) {
    return responder({ erro: "Origem da solicitação não permitida." }, 403);
  }

  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  ) {
    return responder({ erro: "Envie os dados em formato JSON." }, 415);
  }

  try {
    // Verifica a sessão usando o cliente normal, sem privilégios.
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return responder({ erro: "Entre no sistema para continuar." }, 401);
    }

    const { data: perfilAtual, error: perfilError } = await supabase
      .from("perfis")
      .select("perfil, ativo")
      .eq("id", user.id)
      .single();

    if (
      perfilError ||
      !perfilAtual?.ativo ||
      perfilAtual.perfil !== "administrador"
    ) {
      return responder({ erro: "Acesso negado." }, 403);
    }

    let corpo: unknown;

    try {
      corpo = await request.json();
    } catch {
      return responder({ erro: "Os dados enviados são inválidos." }, 400);
    }

    if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)) {
      return responder({ erro: "Os dados enviados são inválidos." }, 400);
    }

    const dados = corpo as Record<string, unknown>;

    const nome = typeof dados.nome === "string" ? dados.nome.trim() : "";
    const email =
      typeof dados.email === "string"
        ? dados.email.trim().toLowerCase()
        : "";

    // Não remove espaços da senha: eles podem fazer parte dela.
    const senha = typeof dados.senha === "string" ? dados.senha : "";
    const perfil = typeof dados.perfil === "string" ? dados.perfil : "";
    const ativo = dados.ativo;

    if (nome.length < 2 || nome.length > 150) {
      return responder(
        { erro: "Informe um nome entre 2 e 150 caracteres." },
        400
      );
    }

    if (
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return responder({ erro: "Informe um e-mail válido." }, 400);
    }

    if (senha.length < 12 || senha.length > 128) {
      return responder(
        { erro: "A senha deve ter entre 12 e 128 caracteres." },
        400
      );
    }

    if (!perfisPermitidos.includes(perfil)) {
      return responder({ erro: "Perfil de acesso inválido." }, 400);
    }

    if (typeof ativo !== "boolean") {
      return responder({ erro: "Informe a situação da conta." }, 400);
    }

    // Só utiliza o cliente administrativo após autorizar a operação.
    const admin = createAdminClient();

    const { data: conta, error: contaError } =
      await admin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: { nome },
      });

    if (contaError || !conta.user) {
      if (
        contaError?.code === "email_exists" ||
        contaError?.code === "user_already_exists"
      ) {
        return responder(
          { erro: "Já existe uma conta com esse e-mail." },
          409
        );
      }

      if (contaError?.code === "weak_password") {
        return responder(
          { erro: "A senha não atende aos requisitos do Supabase." },
          400
        );
      }

      return responder(
        {
          erro: "Não foi possível criar o login. Confira os dados e a configuração administrativa do Supabase.",
        },
        500
      );
    }

    const usuarioCriadoId = conta.user.id;

    // Não há gatilho em auth.users: criamos o perfil explicitamente.
    const { data: funcionario, error: cadastroError } = await admin
      .from("perfis")
      .insert({
        id: usuarioCriadoId,
        nome,
        perfil,
        ativo,
      })
      .select("id, nome, perfil, ativo")
      .single();

    if (cadastroError || !funcionario) {
      // Compensação: tenta remover apenas o login recém-criado.
      const { error: remocaoError } =
        await admin.auth.admin.deleteUser(usuarioCriadoId);

      if (remocaoError) {
        return responder(
          {
            erro: "O perfil não foi salvo e não foi possível remover o login recém-criado. Confira essa conta em Authentication → Users no Supabase antes de tentar novamente.",
          },
          500
        );
      }

      return responder(
        {
          erro: "Não foi possível salvar o perfil. O login recém-criado foi removido.",
        },
        500
      );
    }

    return responder(
      {
        mensagem: "Funcionário cadastrado!",
        funcionario,
      },
      201
    );
  } catch {
    return responder(
      {
        erro: "Não foi possível concluir o cadastro. Confira a lista de funcionários e Authentication → Users antes de tentar novamente.",
      },
      500
    );
  }
}