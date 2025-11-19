import { createGeminiClient, MODEL_FALLBACK_CHAIN } from '@/lib/ai/config'
import { isQuotaError } from '@/lib/ai/errors'

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

  // Criar cliente Gemini uma única vez (fora do loop)
  const genAI = createGeminiClient()

  // Test each model in fallback chain
  for (const model of MODEL_FALLBACK_CHAIN) {
    try {
      console.log(`📡 Testing model: ${model}`)

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

  // Guard against empty MODEL_FALLBACK_CHAIN (runtime check for safety)
  // This check ensures the array has models even if config changes in future
  if (!MODEL_FALLBACK_CHAIN || MODEL_FALLBACK_CHAIN.length < 1) {
    console.error('❌ MODEL_FALLBACK_CHAIN is empty or invalid')
    console.error('   No models available for testing. Check config.ts')
    process.exit(1)
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
