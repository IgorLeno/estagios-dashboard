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

  describe('ParsedVagaData compatibility fields', () => {
    it('should accept optional requisitos field (0-5 range)', () => {
      const withRequisitos = { ...validJob, requisitos: 4.5 }
      expect(() => JobDetailsSchema.parse(withRequisitos)).not.toThrow()
    })

    it('should reject requisitos outside 0-5 range', () => {
      const invalidHigh = { ...validJob, requisitos: 6 }
      expect(() => JobDetailsSchema.parse(invalidHigh)).toThrow()

      const invalidLow = { ...validJob, requisitos: -1 }
      expect(() => JobDetailsSchema.parse(invalidLow)).toThrow()
    })

    it('should accept optional fit field (0-5 range)', () => {
      const withFit = { ...validJob, fit: 3.5 }
      expect(() => JobDetailsSchema.parse(withFit)).not.toThrow()
    })

    it('should reject fit outside 0-5 range', () => {
      const invalidHigh = { ...validJob, fit: 5.5 }
      expect(() => JobDetailsSchema.parse(invalidHigh)).toThrow()

      const invalidLow = { ...validJob, fit: -0.5 }
      expect(() => JobDetailsSchema.parse(invalidLow)).toThrow()
    })

    it('should accept optional etapa field', () => {
      const withEtapa = { ...validJob, etapa: 'Entrevista técnica' }
      expect(() => JobDetailsSchema.parse(withEtapa)).not.toThrow()
    })

    it('should accept optional status field', () => {
      const withStatus = { ...validJob, status: 'Avançado' as const }
      expect(() => JobDetailsSchema.parse(withStatus)).not.toThrow()
    })

    it('should reject invalid status values', () => {
      const invalidStatus = { ...validJob, status: 'Invalid' }
      expect(() => JobDetailsSchema.parse(invalidStatus)).toThrow()
    })

    it('should accept optional observacoes field', () => {
      const withObservacoes = { ...validJob, observacoes: 'Empresa interessante' }
      expect(() => JobDetailsSchema.parse(withObservacoes)).not.toThrow()
    })

    it('should accept all optional fields together', () => {
      const fullJob = {
        ...validJob,
        requisitos: 4.5,
        fit: 3.5,
        etapa: 'Entrevista RH',
        status: 'Pendente' as const,
        observacoes: 'Aguardando retorno'
      }
      expect(() => JobDetailsSchema.parse(fullJob)).not.toThrow()
    })

    it('should work without any optional fields', () => {
      expect(() => JobDetailsSchema.parse(validJob)).not.toThrow()
    })
  })
})
