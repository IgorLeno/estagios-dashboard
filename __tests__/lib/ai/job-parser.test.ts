import { describe, it, expect } from 'vitest'
import { extractJsonFromResponse } from '@/lib/ai/job-parser'

describe('extractJsonFromResponse', () => {
  it('should extract JSON from code fence', () => {
    const response = '```json\n{"empresa": "Test Corp"}\n```'
    const result = extractJsonFromResponse(response)
    expect(result).toEqual({ empresa: 'Test Corp' })
  })

  it('should extract JSON without code fence', () => {
    const response = '{"empresa": "Test Corp"}'
    const result = extractJsonFromResponse(response)
    expect(result).toEqual({ empresa: 'Test Corp' })
  })

  it('should extract JSON with extra text before', () => {
    const response = 'Here is the data:\n```json\n{"empresa": "Test"}\n```'
    const result = extractJsonFromResponse(response)
    expect(result).toEqual({ empresa: 'Test' })
  })

  it('should extract JSON with extra text after', () => {
    const response = '```json\n{"empresa": "Test"}\n```\nHope this helps!'
    const result = extractJsonFromResponse(response)
    expect(result).toEqual({ empresa: 'Test' })
  })

  it('should throw if no JSON found', () => {
    const response = 'No JSON here at all'
    expect(() => extractJsonFromResponse(response)).toThrow('No valid JSON found in LLM response')
  })

  it('should throw if JSON is invalid', () => {
    const response = '```json\n{invalid json}\n```'
    expect(() => extractJsonFromResponse(response)).toThrow()
  })

  it('should handle responses with multiple JSON blocks', () => {
    const response = '```json\n{"first": "block"}\n```\nSome text\n```json\n{"second": "block"}\n```'
    // Deve retornar o primeiro bloco JSON encontrado
    const result = extractJsonFromResponse(response)
    expect(result).toEqual({ first: 'block' })
  })

  it('should handle nested or mixed fence types', () => {
    const response = 'Here is some text with ```code``` inside\n```json\n{"data": "value"}\n```'
    const result = extractJsonFromResponse(response)
    expect(result).toEqual({ data: 'value' })
  })

  it('should handle JSON with different language tags in fence', () => {
    const response = '```javascript\n{"test": "data"}\n```'
    // Como o código procura especificamente por ```json, deve tentar extrair JSON direto
    // O JSON direto deve ser encontrado mesmo sem a tag json
    const result = extractJsonFromResponse(response)
    expect(result).toEqual({ test: 'data' })
  })

  it('should handle very large JSON payload', () => {
    const largeArray = Array.from({ length: 1000 }, (_, i) => `item-${i}`)
    const largeJson = JSON.stringify({ items: largeArray })
    const response = `\`\`\`json\n${largeJson}\n\`\`\``
    
    const startTime = Date.now()
    const result = extractJsonFromResponse(response)
    const duration = Date.now() - startTime
    
    expect(result).toBeDefined()
    expect(Array.isArray((result as { items: string[] }).items)).toBe(true)
    expect((result as { items: string[] }).items.length).toBe(1000)
    // Deve processar em tempo razoável (< 1 segundo)
    expect(duration).toBeLessThan(1000)
  })

  it('should handle JSON blocks with extra whitespace', () => {
    const response = '   ```json   \n   {"test": "data"}   \n   ```   '
    const result = extractJsonFromResponse(response)
    expect(result).toEqual({ test: 'data' })
  })
})
