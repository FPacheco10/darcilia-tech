import { NextResponse } from "next/server";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { success: false, message: "Variáveis não encontradas." },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/auth/v1/health`,
      {
        headers: {
          apikey: supabaseKey,
        },
        cache: "no-store",
      }
    );

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      message: response.ok
        ? "Conexão com Supabase estabelecida!"
        : "Erro na resposta do Supabase.",
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Falha ao acessar Supabase.",
      },
      { status: 500 }
    );
  }
}