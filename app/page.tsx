
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function VerificarSessao(): Promise<React.ReactNode> {
  await connection();

  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  redirect("/dashboard");
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-blue-400">
              Darcilia Tech
            </h1>

            <p className="mt-4 text-slate-400">
              Verificando acesso ao sistema...
            </p>
          </div>
        </main>
      }
    >
      <VerificarSessao />
    </Suspense>
  );
}
