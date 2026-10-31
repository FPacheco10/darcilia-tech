"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { modulos, type Perfil } from "@/lib/config/modulos";

type Props = {
  perfil: Perfil;
  nome?: string;
  fotoUrl?: string | null;
};

const nomesPerfis: Record<Perfil, string> = {
  administrador: "Administrador",
  ti: "TI",
  secretaria: "Secretaria",
  financeiro: "Financeiro",
  consulta: "Consulta",
};

export default function MenuLateral({
  perfil,
  nome = "Funcionário",
  fotoUrl = null,
}: Props) {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  const [fotoComErro, setFotoComErro] = useState<string | null>(null);

  const itensPermitidos = modulos.filter((modulo) =>
    modulo.perfis.includes(perfil)
  );

  const inicial = nome.trim().charAt(0).toUpperCase() || "?";
  const exibirFoto = !!fotoUrl && fotoComErro !== fotoUrl;

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto((atual) => !atual)}
        aria-label={aberto ? "Fechar menu" : "Abrir menu"}
        aria-expanded={aberto}
        aria-controls="menu-lateral"
        className="fixed left-4 top-4 z-50 rounded-lg bg-blue-600 px-3 py-2 text-white md:hidden"
      >
        ☰
      </button>

      {aberto && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setAberto(false)}
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
        />
      )}

      <aside
        id="menu-lateral"
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-800 bg-slate-900 transition-transform md:translate-x-0 ${
          aberto
            ? "visible translate-x-0"
            : "invisible -translate-x-full md:visible"
        }`}
      >
        <div className="shrink-0 border-b border-slate-800 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 font-bold text-white">
              DT
            </div>

            <div>
              <h2 className="font-bold text-white">Darcilia Tech</h2>
              <p className="text-xs text-slate-400">Gestão Escolar</p>
            </div>
          </div>
        </div>

        <nav
          aria-label="Menu principal"
          className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4"
        >
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Menu principal
          </p>

          {itensPermitidos.map((item) => {
            const ativo =
              (pathname === item.caminho ||
                pathname.startsWith(`${item.caminho}/`)) &&
              !itensPermitidos.some(
                (outro) =>
                  outro.caminho.startsWith(`${item.caminho}/`) &&
                  (pathname === outro.caminho ||
                    pathname.startsWith(`${outro.caminho}/`))
              );

            return (
              <Link
                key={item.id}
                href={item.caminho}
                onClick={() => setAberto(false)}
                aria-current={ativo ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                  ativo
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span aria-hidden="true" className="text-xl">
                  {item.icone}
                </span>
                {item.nome}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-slate-800 p-4">
          <Link
            href="/perfil"
            onClick={() => setAberto(false)}
            aria-label={`Editar perfil de ${nome}`}
            className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-slate-800"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-950 font-bold text-blue-300">
              {exibirFoto && fotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fotoUrl}
                  alt=""
                  onError={() => setFotoComErro(fotoUrl)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span aria-hidden="true">{inicial}</span>
              )}
            </div>

            <div className="min-w-0">
              <p
                title={nome}
                className="truncate text-sm font-semibold text-white"
              >
                {nome}
              </p>
              <p className="text-xs text-slate-400">
                {nomesPerfis[perfil]}
              </p>
            </div>
          </Link>

          <p className="mt-3 px-2 text-xs text-slate-500">
            Darcilia Tech • Sistema Escolar
          </p>
        </div>
      </aside>
    </>
  );
}