
import Link from "next/link";

export default function AcessoNegadoPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold text-red-400">
          Acesso negado
        </h1>

        <p className="mt-4 text-slate-300">
          Sua conta não possui autorização para acessar
          esta área do Darcilia Tech.
        </p>

        <Link
          href="/login"
          className="mt-8 inline-block rounded-lg bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-500"
        >
          Voltar para o login
        </Link>
      </div>
    </main>
  );
}
