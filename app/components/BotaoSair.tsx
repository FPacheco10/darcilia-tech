
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function BotaoSair() {
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);
  const [erro, setErro] = useState("");

  async function sair() {
    setSaindo(true);
    setErro("");

    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      setErro("Não foi possível sair. Tente novamente.");
      setSaindo(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={sair}
        disabled={saindo}
        className="rounded-lg bg-red-600 px-5 py-2 font-semibold text-white hover:bg-red-500 disabled:opacity-50"
      >
        {saindo ? "Saindo..." : "Sair do sistema"}
      </button>

      {erro && <p role="alert" className="mt-2 text-sm text-red-400">{erro}</p>}
    </div>
  );
}
