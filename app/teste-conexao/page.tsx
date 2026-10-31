
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function TesteConexao() {
  const [mensagem, setMensagem] = useState("Testando conexão...");

  useEffect(() => {
    const supabase = createClient();

    async function testar() {
      const { error } = await supabase
        .from("teste_conexao")
        .select("*")
        .limit(1);

      if (error) {
        setMensagem(
          "Conexão com Supabase iniciada, mas houve um erro: " +
            error.message
        );
      } else {
        setMensagem("Conexão com Supabase funcionando!");
      }
    }

    testar();
  }, []);

  return (
    <main style={{ padding: "40px", fontFamily: "Arial" }}>
      <h1>Teste de conexão — Darcilia Tech</h1>
      <p>{mensagem}</p>
    </main>
  );
}
