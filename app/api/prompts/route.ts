import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getPromptsConfig, savePromptsConfig } from "@/lib/supabase/prompts"
import type { PromptsConfig } from "@/lib/types"

/**
 * GET /api/prompts
 * Retorna configuração de prompts
 * - Se autenticado: retorna config customizada do usuário (ou default se não tiver)
 * - Se não autenticado: retorna config default global (read-only)
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Verificar autenticação (opcional para GET)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    // Buscar config - se usuário autenticado, passa user.id, senão passa undefined
    // getPromptsConfig já faz fallback para config global se userId não fornecido
    const config = await getPromptsConfig(user?.id)

    return NextResponse.json({
      success: true,
      data: config,
      isReadOnly: !user, // Flag para UI indicar que não pode salvar
    })
  } catch (error) {
    console.error("Error fetching prompts config:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/prompts
 * Salva ou atualiza configuração de prompts do usuário autenticado
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verificar autenticação
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()

    // Validação básica
    if (!body.modelo_gemini || body.temperatura === undefined || !body.max_tokens) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: modelo_gemini, temperatura, max_tokens" },
        { status: 400 }
      )
    }

    if (!body.dossie_prompt || !body.analise_prompt || !body.curriculo_prompt) {
      return NextResponse.json(
        { success: false, error: "All prompts must be provided (dossie, analise, curriculo)" },
        { status: 400 }
      )
    }

    // Validação de ranges
    if (body.temperatura < 0 || body.temperatura > 1) {
      return NextResponse.json(
        { success: false, error: "temperatura must be between 0.0 and 1.0" },
        { status: 400 }
      )
    }

    if (body.max_tokens < 512 || body.max_tokens > 32768) {
      return NextResponse.json(
        { success: false, error: "max_tokens must be between 512 and 32768" },
        { status: 400 }
      )
    }

    // Salvar config
    const config: Omit<PromptsConfig, "id" | "created_at" | "updated_at"> = {
      user_id: user.id,
      modelo_gemini: body.modelo_gemini,
      temperatura: body.temperatura,
      max_tokens: body.max_tokens,
      top_p: body.top_p ?? null,
      top_k: body.top_k ?? null,
      dossie_prompt: body.dossie_prompt,
      analise_prompt: body.analise_prompt,
      curriculo_prompt: body.curriculo_prompt,
    }

    await savePromptsConfig(config)

    // Retornar config atualizada
    const updatedConfig = await getPromptsConfig(user.id)

    return NextResponse.json({
      success: true,
      data: updatedConfig,
    })
  } catch (error) {
    console.error("Error saving prompts config:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    )
  }
}
