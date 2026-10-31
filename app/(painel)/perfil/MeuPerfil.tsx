"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  usuarioId: string;
  email: string;
  nomeInicial: string;
  perfilAcesso: string;
  caminhoInicial: string | null;
};

const formatos: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const limiteFoto = 2 * 1024 * 1024;

export default function MeuPerfil({
  usuarioId,
  email,
  nomeInicial,
  perfilAcesso,
  caminhoInicial,
}: Props) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const inputArquivo = useRef<HTMLInputElement>(null);

  const [nome, setNome] = useState(nomeInicial);
  const [caminho, setCaminho] = useState(caminhoInicial);
  const [fotoSalvaUrl, setFotoSalvaUrl] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [removerFoto, setRemoverFoto] = useState(false);

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [avisoFoto, setAvisoFoto] = useState("");
  const [mensagem, setMensagem] = useState("");

  // Gera um link temporário para a foto no bucket privado.
  useEffect(() => {
    let ativo = true;

    async function carregarFoto() {
      setFotoSalvaUrl("");
      setAvisoFoto("");

      if (!caminho) return;

      if (
        !caminho.startsWith(`${usuarioId}/`) ||
        caminho.includes("://")
      ) {
        setAvisoFoto(
          "A foto antiga usa outro formato de caminho. Selecione uma nova foto ou marque para remover."
        );
        return;
      }

      try {
        const { data, error } = await supabase.storage
          .from("fotos-perfil")
          .createSignedUrl(caminho, 3600);

        if (!ativo) return;

        if (error || !data?.signedUrl) {
          setAvisoFoto(
            "Não foi possível exibir a foto salva. Você pode enviar uma nova."
          );
          return;
        }

        setFotoSalvaUrl(data.signedUrl);
      } catch {
        if (ativo) {
          setAvisoFoto("Falha de conexão ao carregar a foto.");
        }
      }
    }

    void carregarFoto();

    return () => {
      ativo = false;
    };
  }, [caminho, usuarioId, supabase]);

  // A prévia local é liberada quando o arquivo muda.
  useEffect(() => {
    if (!arquivo) {
      setPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(arquivo);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [arquivo]);

  function selecionarFoto(event: ChangeEvent<HTMLInputElement>) {
    const selecionado = event.target.files?.[0];

    setErro("");
    setMensagem("");

    if (!selecionado) return;

    if (!formatos[selecionado.type]) {
      setErro("Selecione uma imagem JPG, PNG ou WebP.");
      event.target.value = "";
      return;
    }

    if (selecionado.size === 0 || selecionado.size > limiteFoto) {
      setErro("A foto deve ter conteúdo e tamanho máximo de 2 MB.");
      event.target.value = "";
      return;
    }

    setArquivo(selecionado);
    setRemoverFoto(false);
  }

  function marcarRemocao() {
    setErro("");
    setMensagem("");
    setArquivo(null);
    setRemoverFoto(true);

    if (inputArquivo.current) {
      inputArquivo.current.value = "";
    }
  }

  function desfazerFoto() {
    setArquivo(null);
    setRemoverFoto(false);
    setErro("");
    setMensagem("");

    if (inputArquivo.current) {
      inputArquivo.current.value = "";
    }
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (salvando) return;

    setErro("");
    setMensagem("");

    const nomeLimpo = nome.trim();

    if (nomeLimpo.length < 2 || nomeLimpo.length > 150) {
      setErro("Informe um nome entre 2 e 150 caracteres.");
      return;
    }

    setSalvando(true);

    try {
      let caminhoFinal = removerFoto ? null : caminho;

      if (arquivo) {
        const extensao = formatos[arquivo.type];

        if (
          !extensao ||
          arquivo.size === 0 ||
          arquivo.size > limiteFoto
        ) {
          setErro("Selecione uma foto JPG, PNG ou WebP de até 2 MB.");
          return;
        }

        // Um caminho novo evita sobrescrever a foto anterior.
        caminhoFinal =
          `${usuarioId}/${crypto.randomUUID()}.${extensao}`;

        const { error: uploadError } = await supabase.storage
          .from("fotos-perfil")
          .upload(caminhoFinal, arquivo, {
            contentType: arquivo.type,
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          setErro(`Não foi possível enviar a foto: ${uploadError.message}`);
          return;
        }
      }

      const { error } = await supabase.rpc("atualizar_meu_perfil", {
        novo_nome: nomeLimpo,
        novo_caminho_foto: caminhoFinal,
      });

      if (error) {
        setErro(
          `Não foi possível confirmar a atualização. Atualize a página antes de tentar novamente. ${error.message}`
        );
        return;
      }

      setNome(nomeLimpo);
      setCaminho(caminhoFinal);
      setArquivo(null);
      setRemoverFoto(false);

      if (inputArquivo.current) {
        inputArquivo.current.value = "";
      }

      setMensagem("Perfil atualizado!");
      router.refresh();
    } catch {
      setErro(
        "Falha de conexão. Atualize a página para conferir o resultado antes de tentar novamente."
      );
    } finally {
      setSalvando(false);
    }
  }

  const imagemExibida = removerFoto
    ? ""
    : previewUrl || fotoSalvaUrl;

  const inicial = nome.trim().charAt(0).toUpperCase() || "?";

  const input =
    "w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white focus:border-blue-500 focus:outline-none";

  return (
    <main className="mx-auto max-w-3xl">
      <header className="mb-8">
        <p className="text-sm text-blue-400">
          DARCILIA TECH / MEU PERFIL
        </p>
        <h1 className="mt-2 text-3xl font-bold">Meu perfil</h1>
        <p className="mt-2 text-slate-400">
          Atualize seu nome e sua foto.
        </p>
      </header>

      {erro && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-red-800 bg-red-950 p-4 text-red-200"
        >
          {erro}
        </div>
      )}

      {mensagem && (
        <div
          role="status"
          className="mb-6 rounded-lg border border-emerald-800 bg-emerald-950 p-4 text-emerald-200"
        >
          {mensagem}
        </div>
      )}

      <form
        onSubmit={salvar}
        className="rounded-2xl border border-slate-800 bg-slate-900 p-6 md:p-8"
      >
        <fieldset disabled={salvando} className="space-y-6">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-950 text-4xl font-bold text-blue-300">
              {imagemExibida ? (
                // URL temporária ou prévia local do arquivo selecionado.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imagemExibida}
                  alt="Foto de perfil"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span aria-label="Inicial do nome">{inicial}</span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <label className="block space-y-2">
                <span className="text-sm font-medium">
                  Foto de perfil
                </span>

                <input
                  ref={inputArquivo}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={selecionarFoto}
                  className="block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-white"
                />
              </label>

              <p className="mt-2 text-xs text-slate-400">
                JPG, PNG ou WebP. Máximo de 2 MB.
              </p>

              <div className="mt-3 flex flex-wrap gap-4">
                {(caminho || arquivo) && !removerFoto && (
                  <button
                    type="button"
                    onClick={marcarRemocao}
                    className="text-sm text-red-400 hover:underline"
                  >
                    Remover foto
                  </button>
                )}

                {(arquivo || removerFoto) && (
                  <button
                    type="button"
                    onClick={desfazerFoto}
                    className="text-sm text-blue-400 hover:underline"
                  >
                    Desfazer alteração da foto
                  </button>
                )}
              </div>

              {removerFoto && (
                <p className="mt-2 text-sm text-amber-300">
                  Clique em Salvar perfil para remover a foto do perfil.
                </p>
              )}
            </div>
          </div>

          {avisoFoto && !arquivo && !removerFoto && (
            <p role="status" className="text-sm text-amber-300">
              {avisoFoto}
            </p>
          )}

          <label className="block space-y-2">
            <span className="text-sm">Nome completo</span>
            <input
              required
              minLength={2}
              maxLength={150}
              autoComplete="name"
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              className={input}
            />
          </label>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <p className="text-sm text-slate-400">E-mail de acesso</p>
              <p className="mt-2 break-all">{email || "Não informado"}</p>
            </div>

            <div>
              <p className="text-sm text-slate-400">Perfil de acesso</p>
              <p className="mt-2 capitalize">
                {perfilAcesso === "ti" ? "TI" : perfilAcesso}
              </p>
            </div>
          </div>

          <p className="text-sm text-slate-400">
            O perfil de acesso e a situação da conta são gerenciados
            pelo Administrador.
          </p>

          <button
            type="submit"
            disabled={salvando}
            className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {salvando ? "Salvando..." : "Salvar perfil"}
          </button>
        </fieldset>
      </form>
    </main>
  );
}