import { createGeminiClient, MODEL_FALLBACK_CHAIN } from '@/lib/ai/config'

/**
 * Validates Gemini API setup and tests all models in fallback chain
 * Run with: pnpm tsx scripts/validate-gemini-setup.ts
 */
async function validateGeminiSetup() {
  console.log('🔍 Validating Gemini API setup...\n')

  // Check API key
  if (!process.env.GOOGLE_API_KEY) {
    console.error('❌ GOOGLE_API_KEY not found in environment')
    console.error('   Add it to .env.local file')
    console.error('   Get your key at: https://aistudio.google.com/app/apikey')
    process.exit(1)
  }
  console.log('✅ API key found\n')

  // Test each model in fallback chain
  for (const model of MODEL_FALLBACK_CHAIN) {
    try {
      console.log(`📡 Testing model: ${model}`)

      const genAI = createGeminiClient()
      const geminiModel = genAI.getGenerativeModel({
        model,
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 100,
        },
      })

      const startTime = Date.now()
      const result = await geminiModel.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Return JSON: {"test": true, "status": "ok"}' }],
          },
        ],
      })

      const duration = Date.now() - startTime
      const response = result.response.text()

      console.log(`   ✅ ${model}: Working`)
      console.log(`   ⏱️  Response time: ${duration}ms`)
      console.log(`   📝 Response length: ${response.length} characters\n`)
    } catch (error: unknown) {
      // Type guard para detectar erros de quota/429
      const isQuotaError = (err: unknown): boolean => {
        // Verifica se é um objeto com status === 429 (numérico ou string)
        if (
          typeof err === 'object' &&
          err !== null &&
          ('status' in err || 'statusCode' in err)
        ) {
          const status =
            'status' in err ? err.status : 'statusCode' in err ? err.statusCode : null
          if (status === 429 || status === '429') {
            return true
          }
        }

        // Verifica se é um Error com mensagem contendo '429' ou 'quota'
        if (err instanceof Error) {
          const message = err.message.toLowerCase()
          return message.includes('429') || message.includes('quota')
        }

        return false
      }

      if (isQuotaError(error)) {
        console.warn(`   ⚠️  ${model}: Quota exceeded (may be expected in free tier)`)
        console.warn(`   💡 Tip: System will automatically fallback to next model\n`)
      } else {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        console.error(`   ❌ ${model}: Failed`)
        console.error(`   Error: ${errorMessage}\n`)
      }
    }
  }

  console.log('✅ Validation complete!')
  console.log('\n📊 Summary:')
  
  // Build dynamic summary from MODEL_FALLBACK_CHAIN
  const primaryModel = MODEL_FALLBACK_CHAIN[0] ?? 'N/A'
  const fallbackModels = MODEL_FALLBACK_CHAIN.slice(1)
  const fallbackModelsStr = fallbackModels.length > 0 
    ? fallbackModels.join(', ') 
    : 'None'
  
  console.log(`   - Primary model: ${primaryModel}`)
  console.log(`   - Fallback models: ${fallbackModelsStr}`)
  console.log('   - System automatically tries fallbacks on quota errors')
  console.log('\n💡 Next steps:')
  console.log('   1. Start dev server: pnpm dev')
  console.log('   2. Test parsing: http://localhost:3000/test-ai')
  console.log('   3. Monitor usage: https://ai.dev/usage')
}

// Run validation
validateGeminiSetup().catch((error) => {
  console.error('\n❌ Validation failed:', error.message)
  process.exit(1)
})
