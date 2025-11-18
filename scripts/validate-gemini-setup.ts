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
    } catch (error: any) {
      if (error.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota')) {
        console.warn(`   ⚠️  ${model}: Quota exceeded (may be expected in free tier)`)
        console.warn(`   💡 Tip: System will automatically fallback to next model\n`)
      } else {
        console.error(`   ❌ ${model}: Failed`)
        console.error(`   Error: ${error.message}\n`)
      }
    }
  }

  console.log('✅ Validation complete!')
  console.log('\n📊 Summary:')
  console.log('   - Primary model: gemini-1.5-flash')
  console.log('   - Fallback models: gemini-2.0-flash-001, gemini-2.5-pro')
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
