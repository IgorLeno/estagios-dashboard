import { describe, it, expect } from 'vitest'
import { JobDetailsSchema } from '@/lib/ai/types'

describe('JobDetailsSchema', () => {
  const validJob = {
    empresa: 'Test Corp',
    cargo: 'Developer',
    local: 'São Paulo, SP',
    modalidade: 'Remoto' as const,
    tipo_vaga: 'Júnior' as const,
    requisitos_obrigatorios: ['JavaScript'],
    requisitos_desejaveis: ['TypeScript'],
    responsabilidades: ['Code'],
    beneficios: ['Health insurance'],
    salario: 'R$ 5000',
    idioma_vaga: 'pt' as const,
  }

  it('should accept valid job details', () => {
    expect(() => JobDetailsSchema.parse(validJob)).not.toThrow()
  })

  it('should reject invalid modalidade', () => {
    const invalid = { ...validJob, modalidade: 'Invalid' }
    expect(() => JobDetailsSchema.parse(invalid)).toThrow()
  })

  it('should reject invalid tipo_vaga', () => {
    const invalid = { ...validJob, tipo_vaga: 'Invalid' }
    expect(() => JobDetailsSchema.parse(invalid)).toThrow()
  })

  it('should reject missing required fields', () => {
    const invalid = { ...validJob, empresa: '' }
    expect(() => JobDetailsSchema.parse(invalid)).toThrow()
  })

  it('should accept null salario', () => {
    const valid = { ...validJob, salario: null }
    expect(() => JobDetailsSchema.parse(valid)).not.toThrow()
  })
})
