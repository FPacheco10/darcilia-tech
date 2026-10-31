


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."atualizar_acesso_funcionario"("funcionario_id" "uuid", "novo_perfil" "text", "novo_ativo" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  -- Serializa as alterações administrativas.
  perform pg_catalog.pg_advisory_xact_lock(810031001);

  if not exists (
    select 1
    from public.perfis
    where id = (select auth.uid())
      and ativo = true
      and perfil = 'administrador'
  ) then
    raise exception 'Acesso negado.'
      using errcode = '42501';
  end if;

  if funcionario_id = (select auth.uid()) then
    raise exception 'Você não pode alterar o próprio acesso.';
  end if;

  if novo_perfil is null
    or novo_perfil not in (
      'administrador',
      'ti',
      'secretaria',
      'financeiro',
      'consulta'
    )
  then
    raise exception 'Perfil de acesso inválido.';
  end if;

  if novo_ativo is null then
    raise exception 'Informe a situação da conta.';
  end if;

  update public.perfis
  set perfil = novo_perfil,
      ativo = novo_ativo
  where id = funcionario_id;

  if not found then
    raise exception 'Funcionário não encontrado.';
  end if;
end;
$$;


ALTER FUNCTION "public"."atualizar_acesso_funcionario"("funcionario_id" "uuid", "novo_perfil" "text", "novo_ativo" boolean) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."perfis" (
    "id" "uuid" NOT NULL,
    "nome" "text" NOT NULL,
    "perfil" "text" DEFAULT 'consulta'::"text" NOT NULL,
    "ativo" boolean DEFAULT false NOT NULL,
    "foto_url" "text",
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "perfis_perfil_check" CHECK (("perfil" = ANY (ARRAY['administrador'::"text", 'ti'::"text", 'secretaria'::"text", 'financeiro'::"text", 'consulta'::"text"])))
);


ALTER TABLE "public"."perfis" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."listar_funcionarios"() RETURNS SETOF "public"."perfis"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not exists (
    select 1
    from public.perfis
    where id = (select auth.uid())
      and ativo = true
      and perfil = 'administrador'
  ) then
    raise exception 'Acesso negado.'
      using errcode = '42501';
  end if;

  return query
    select p.*
    from public.perfis as p
    order by p.nome;
end;
$$;


ALTER FUNCTION "public"."listar_funcionarios"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sincronizar_equipamento_emprestimo"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  equipamento public.equipamentos%rowtype;
begin
  if TG_OP = 'UPDATE' then
    if new.equipamento_id is distinct from old.equipamento_id then
      raise exception 'Não é permitido trocar o equipamento de um empréstimo.';
    end if;

    if new.retirado_em is distinct from old.retirado_em then
      raise exception 'Não é permitido alterar a data da retirada.';
    end if;

    if old.devolvido_em is not null then
      if new.devolvido_em is distinct from old.devolvido_em then
        raise exception 'Não é permitido reabrir ou alterar a devolução registrada.';
      end if;

      return new;
    end if;

    if new.devolvido_em is null then
      return new;
    end if;
  end if;

  -- Bloqueia a linha durante a operação para evitar disputas.
  select *
  into equipamento
  from public.equipamentos
  where id = new.equipamento_id
  for update;

  if not found then
    raise exception 'Equipamento não encontrado.';
  end if;

  if TG_OP = 'INSERT' then
    if new.devolvido_em is not null then
      raise exception 'Registre primeiro a retirada e depois a devolução.';
    end if;

    if equipamento.categoria <> 'chromebook' then
      raise exception 'Somente Chromebooks podem ser emprestados nesta área.';
    end if;

    if equipamento.status <> 'disponivel' then
      raise exception 'Este equipamento não está disponível para retirada.';
    end if;

    -- Usa o horário do banco.
    new.retirado_em := now();

    update public.equipamentos
    set status = 'em_uso',
        updated_at = now()
    where id = new.equipamento_id;

  elsif TG_OP = 'UPDATE' then
    new.devolvido_em := now();

    -- Preserva manutenção ou inativação registrada durante o empréstimo.
    update public.equipamentos
    set status = 'disponivel',
        updated_at = now()
    where id = new.equipamento_id
      and status = 'em_uso';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."sincronizar_equipamento_emprestimo"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."aluno_responsaveis" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "aluno_id" "uuid" NOT NULL,
    "responsavel_id" "uuid" NOT NULL,
    "parentesco" "text",
    "responsavel_principal" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."aluno_responsaveis" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."alunos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome_completo" "text" NOT NULL,
    "data_nascimento" "date",
    "cpf" "text",
    "email" "text",
    "telefone" "text",
    "endereco" "text",
    "status" "text" DEFAULT 'ativo'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "turma" "text",
    "responsavel" "text",
    CONSTRAINT "alunos_status_check" CHECK (("status" = ANY (ARRAY['ativo'::"text", 'inativo'::"text", 'transferido'::"text"])))
);


ALTER TABLE "public"."alunos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."auditoria" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "usuario_id" "uuid",
    "acao" "text" NOT NULL,
    "tabela_afetada" "text",
    "registro_id" "uuid",
    "detalhes" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."auditoria" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chamados" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "titulo" "text" NOT NULL,
    "descricao" "text" NOT NULL,
    "local" "text" NOT NULL,
    "solicitante" "text" NOT NULL,
    "prioridade" "text" DEFAULT 'normal'::"text" NOT NULL,
    "status" "text" DEFAULT 'aberto'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chamados_descricao_check" CHECK (("length"(TRIM(BOTH FROM "descricao")) > 0)),
    CONSTRAINT "chamados_local_check" CHECK (("length"(TRIM(BOTH FROM "local")) > 0)),
    CONSTRAINT "chamados_prioridade_check" CHECK (("prioridade" = ANY (ARRAY['baixa'::"text", 'normal'::"text", 'alta'::"text", 'urgente'::"text"]))),
    CONSTRAINT "chamados_solicitante_check" CHECK (("length"(TRIM(BOTH FROM "solicitante")) > 0)),
    CONSTRAINT "chamados_status_check" CHECK (("status" = ANY (ARRAY['aberto'::"text", 'em_atendimento'::"text", 'aguardando'::"text", 'concluido'::"text", 'cancelado'::"text"]))),
    CONSTRAINT "chamados_titulo_check" CHECK (("length"(TRIM(BOTH FROM "titulo")) > 0))
);


ALTER TABLE "public"."chamados" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."emprestimos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "equipamento_id" "uuid" NOT NULL,
    "nome_solicitante" "text" NOT NULL,
    "turma_setor" "text" NOT NULL,
    "retirado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    "previsto_para" timestamp with time zone NOT NULL,
    "devolvido_em" timestamp with time zone,
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "devolucao_apos_retirada" CHECK ((("devolvido_em" IS NULL) OR ("devolvido_em" >= "retirado_em"))),
    CONSTRAINT "emprestimos_nome_solicitante_check" CHECK (("length"(TRIM(BOTH FROM "nome_solicitante")) > 0)),
    CONSTRAINT "emprestimos_turma_setor_check" CHECK (("length"(TRIM(BOTH FROM "turma_setor")) > 0)),
    CONSTRAINT "previsao_apos_retirada" CHECK (("previsto_para" >= "retirado_em"))
);


ALTER TABLE "public"."emprestimos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."equipamentos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patrimonio" "text" NOT NULL,
    "nome" "text" NOT NULL,
    "categoria" "text" NOT NULL,
    "marca" "text",
    "modelo" "text",
    "numero_serie" "text",
    "local" "text" NOT NULL,
    "status" "text" DEFAULT 'disponivel'::"text" NOT NULL,
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "equipamentos_categoria_check" CHECK (("categoria" = ANY (ARRAY['computador'::"text", 'notebook'::"text", 'chromebook'::"text", 'impressora'::"text", 'projetor'::"text", 'rede'::"text", 'outro'::"text"]))),
    CONSTRAINT "equipamentos_local_check" CHECK (("length"(TRIM(BOTH FROM "local")) > 0)),
    CONSTRAINT "equipamentos_nome_check" CHECK (("length"(TRIM(BOTH FROM "nome")) > 0)),
    CONSTRAINT "equipamentos_patrimonio_check" CHECK (("length"(TRIM(BOTH FROM "patrimonio")) > 0)),
    CONSTRAINT "equipamentos_status_check" CHECK (("status" = ANY (ARRAY['disponivel'::"text", 'em_uso'::"text", 'manutencao'::"text", 'inativo'::"text"])))
);


ALTER TABLE "public"."equipamentos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."livros" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "codigo" "text" NOT NULL,
    "titulo" "text" NOT NULL,
    "autor" "text" NOT NULL,
    "isbn" "text",
    "editora" "text",
    "ano_publicacao" integer,
    "categoria" "text",
    "localizacao" "text",
    "status" "text" DEFAULT 'disponivel'::"text" NOT NULL,
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "livros_ano_publicacao_check" CHECK ((("ano_publicacao" IS NULL) OR (("ano_publicacao" >= 1) AND ("ano_publicacao" <= 9999)))),
    CONSTRAINT "livros_autor_check" CHECK (("length"(TRIM(BOTH FROM "autor")) > 0)),
    CONSTRAINT "livros_codigo_check" CHECK (("length"(TRIM(BOTH FROM "codigo")) > 0)),
    CONSTRAINT "livros_status_check" CHECK (("status" = ANY (ARRAY['disponivel'::"text", 'emprestado'::"text", 'manutencao'::"text", 'inativo'::"text"]))),
    CONSTRAINT "livros_titulo_check" CHECK (("length"(TRIM(BOTH FROM "titulo")) > 0))
);


ALTER TABLE "public"."livros" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."perfis_usuarios" (
    "id" "uuid" NOT NULL,
    "nome_completo" "text" NOT NULL,
    "perfil" "text" NOT NULL,
    "ativo" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "pode_administrar_usuarios" boolean DEFAULT false NOT NULL,
    CONSTRAINT "perfis_usuarios_perfil_check" CHECK (("perfil" = ANY (ARRAY['administrador'::"text", 'direcao'::"text", 'secretaria'::"text", 'financeiro'::"text", 'biblioteca'::"text", 'ti'::"text"])))
);


ALTER TABLE "public"."perfis_usuarios" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."responsaveis" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome_completo" "text" NOT NULL,
    "cpf" "text",
    "email" "text",
    "telefone" "text",
    "parentesco" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."responsaveis" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teste_conexao" (
    "id" bigint NOT NULL,
    "mensagem" "text"
);


ALTER TABLE "public"."teste_conexao" OWNER TO "postgres";


ALTER TABLE "public"."teste_conexao" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."teste_conexao_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."aluno_responsaveis"
    ADD CONSTRAINT "aluno_responsaveis_aluno_id_responsavel_id_key" UNIQUE ("aluno_id", "responsavel_id");



ALTER TABLE ONLY "public"."aluno_responsaveis"
    ADD CONSTRAINT "aluno_responsaveis_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."alunos"
    ADD CONSTRAINT "alunos_cpf_key" UNIQUE ("cpf");



ALTER TABLE ONLY "public"."alunos"
    ADD CONSTRAINT "alunos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."auditoria"
    ADD CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chamados"
    ADD CONSTRAINT "chamados_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."emprestimos"
    ADD CONSTRAINT "emprestimos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipamentos"
    ADD CONSTRAINT "equipamentos_patrimonio_key" UNIQUE ("patrimonio");



ALTER TABLE ONLY "public"."equipamentos"
    ADD CONSTRAINT "equipamentos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."livros"
    ADD CONSTRAINT "livros_codigo_key" UNIQUE ("codigo");



ALTER TABLE ONLY "public"."livros"
    ADD CONSTRAINT "livros_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."perfis"
    ADD CONSTRAINT "perfis_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."perfis_usuarios"
    ADD CONSTRAINT "perfis_usuarios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."responsaveis"
    ADD CONSTRAINT "responsaveis_cpf_key" UNIQUE ("cpf");



ALTER TABLE ONLY "public"."responsaveis"
    ADD CONSTRAINT "responsaveis_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teste_conexao"
    ADD CONSTRAINT "teste_conexao_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "emprestimo_aberto_por_equipamento" ON "public"."emprestimos" USING "btree" ("equipamento_id") WHERE ("devolvido_em" IS NULL);



CREATE OR REPLACE TRIGGER "sincronizar_equipamento_emprestimo" BEFORE INSERT OR UPDATE ON "public"."emprestimos" FOR EACH ROW EXECUTE FUNCTION "public"."sincronizar_equipamento_emprestimo"();



ALTER TABLE ONLY "public"."aluno_responsaveis"
    ADD CONSTRAINT "aluno_responsaveis_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "public"."alunos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."aluno_responsaveis"
    ADD CONSTRAINT "aluno_responsaveis_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "public"."responsaveis"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."auditoria"
    ADD CONSTRAINT "auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."emprestimos"
    ADD CONSTRAINT "emprestimos_equipamento_id_fkey" FOREIGN KEY ("equipamento_id") REFERENCES "public"."equipamentos"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."perfis"
    ADD CONSTRAINT "perfis_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."perfis_usuarios"
    ADD CONSTRAINT "perfis_usuarios_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Funcionarios consultam o proprio perfil" ON "public"."perfis" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Permitir leitura de teste" ON "public"."teste_conexao" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Secretaria consulta chromebooks" ON "public"."equipamentos" FOR SELECT TO "authenticated" USING ((("categoria" = 'chromebook'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."perfis" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."ativo" = true) AND ("p"."perfil" = 'secretaria'::"text"))))));



CREATE POLICY "Secretaria e administrador gerenciam alunos" ON "public"."alunos" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."perfis" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."ativo" = true) AND ("p"."perfil" = ANY (ARRAY['administrador'::"text", 'secretaria'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."perfis" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."ativo" = true) AND ("p"."perfil" = ANY (ARRAY['administrador'::"text", 'secretaria'::"text"]))))));



CREATE POLICY "Secretaria e administrador gerenciam livros" ON "public"."livros" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."perfis" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."ativo" = true) AND ("p"."perfil" = ANY (ARRAY['administrador'::"text", 'secretaria'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."perfis" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."ativo" = true) AND ("p"."perfil" = ANY (ARRAY['administrador'::"text", 'secretaria'::"text"]))))));



CREATE POLICY "Setores autorizados atualizam emprestimos" ON "public"."emprestimos" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."perfis" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."ativo" = true) AND ("p"."perfil" = ANY (ARRAY['administrador'::"text", 'ti'::"text", 'secretaria'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."perfis" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."ativo" = true) AND ("p"."perfil" = ANY (ARRAY['administrador'::"text", 'ti'::"text", 'secretaria'::"text"]))))));



CREATE POLICY "Setores autorizados consultam emprestimos" ON "public"."emprestimos" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."perfis" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."ativo" = true) AND ("p"."perfil" = ANY (ARRAY['administrador'::"text", 'ti'::"text", 'secretaria'::"text"]))))));



CREATE POLICY "Setores autorizados registram emprestimos" ON "public"."emprestimos" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."perfis" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."ativo" = true) AND ("p"."perfil" = ANY (ARRAY['administrador'::"text", 'ti'::"text", 'secretaria'::"text"]))))));



CREATE POLICY "TI e administrador gerenciam chamados" ON "public"."chamados" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."perfis" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."ativo" = true) AND ("p"."perfil" = ANY (ARRAY['administrador'::"text", 'ti'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."perfis" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."ativo" = true) AND ("p"."perfil" = ANY (ARRAY['administrador'::"text", 'ti'::"text"]))))));



CREATE POLICY "TI e administrador gerenciam equipamentos" ON "public"."equipamentos" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."perfis" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."ativo" = true) AND ("p"."perfil" = ANY (ARRAY['administrador'::"text", 'ti'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."perfis" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."ativo" = true) AND ("p"."perfil" = ANY (ARRAY['administrador'::"text", 'ti'::"text"]))))));



CREATE POLICY "Usuario pode consultar seu proprio perfil" ON "public"."perfis_usuarios" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."aluno_responsaveis" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."alunos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."auditoria" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chamados" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."emprestimos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."equipamentos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."livros" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."perfis" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."perfis_usuarios" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."responsaveis" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teste_conexao" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."atualizar_acesso_funcionario"("funcionario_id" "uuid", "novo_perfil" "text", "novo_ativo" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."atualizar_acesso_funcionario"("funcionario_id" "uuid", "novo_perfil" "text", "novo_ativo" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."atualizar_acesso_funcionario"("funcionario_id" "uuid", "novo_perfil" "text", "novo_ativo" boolean) TO "authenticated";



GRANT ALL ON TABLE "public"."perfis" TO "anon";
GRANT ALL ON TABLE "public"."perfis" TO "authenticated";
GRANT ALL ON TABLE "public"."perfis" TO "service_role";



REVOKE ALL ON FUNCTION "public"."listar_funcionarios"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."listar_funcionarios"() TO "service_role";
GRANT ALL ON FUNCTION "public"."listar_funcionarios"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."sincronizar_equipamento_emprestimo"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sincronizar_equipamento_emprestimo"() TO "service_role";



GRANT ALL ON TABLE "public"."aluno_responsaveis" TO "anon";
GRANT ALL ON TABLE "public"."aluno_responsaveis" TO "authenticated";
GRANT ALL ON TABLE "public"."aluno_responsaveis" TO "service_role";



GRANT ALL ON TABLE "public"."alunos" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."alunos" TO "authenticated";



GRANT ALL ON TABLE "public"."auditoria" TO "anon";
GRANT ALL ON TABLE "public"."auditoria" TO "authenticated";
GRANT ALL ON TABLE "public"."auditoria" TO "service_role";



GRANT ALL ON TABLE "public"."chamados" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."chamados" TO "authenticated";



GRANT ALL ON TABLE "public"."emprestimos" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."emprestimos" TO "authenticated";



GRANT ALL ON TABLE "public"."equipamentos" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."equipamentos" TO "authenticated";



GRANT ALL ON TABLE "public"."livros" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."livros" TO "authenticated";



GRANT ALL ON TABLE "public"."perfis_usuarios" TO "anon";
GRANT ALL ON TABLE "public"."perfis_usuarios" TO "authenticated";
GRANT ALL ON TABLE "public"."perfis_usuarios" TO "service_role";



GRANT ALL ON TABLE "public"."responsaveis" TO "anon";
GRANT ALL ON TABLE "public"."responsaveis" TO "authenticated";
GRANT ALL ON TABLE "public"."responsaveis" TO "service_role";



GRANT ALL ON TABLE "public"."teste_conexao" TO "anon";
GRANT ALL ON TABLE "public"."teste_conexao" TO "authenticated";
GRANT ALL ON TABLE "public"."teste_conexao" TO "service_role";



GRANT ALL ON SEQUENCE "public"."teste_conexao_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."teste_conexao_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."teste_conexao_id_seq" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







