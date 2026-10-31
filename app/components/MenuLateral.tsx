
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { modulos, type Perfil } from "@/lib/config/modulos";

type Props = {
  perfil: Perfil;
};

export default function MenuLateral({ perfil }: Props) {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);

  const itensPermitidos = modulos.filter((modulo) =>
    modulo.perfis.includes(perfil)
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        aria-label="Abrir ou fechar menu"
        aria-expanded={aberto}
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
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-800 bg-slate-900 transition-transform md:translate-x-0 ${
          aberto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-slate-800 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 font-bold text-white">
              DT
            </div>

            <div>
              <h2 className="font-bold text-white">Darcilia Tech</h2>
              <p className="text-xs text-slate-400">Gestão Escolar</p>
            </div>
          </div>
        </div>

        <nav aria-label="Menu principal" className="flex-1 space-y-2 overflow-y-auto p-4">
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

        <div className="border-t border-slate-800 p-4">
          <p className="text-xs text-slate-500">
            Darcilia Tech • Sistema Escolar
          </p>
        </div>
      </aside>
    </>
    
  );
}
