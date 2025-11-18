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
    expect(() => extractJsonFromResponse(response)).toThrow('No valid JSON found')
  })

  it('should throw if JSON is invalid', () => {
    const response = '```json\n{invalid json}\n```'
    expect(() => extractJsonFromResponse(response)).toThrow()
  })
})
