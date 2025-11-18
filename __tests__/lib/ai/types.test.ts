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

  it('should reject empty string for empresa', () => {
    const invalid = { ...validJob, empresa: '' }
    expect(() => JobDetailsSchema.parse(invalid)).toThrow()
  })

  it('should reject undefined empresa field', () => {
    const { empresa, ...invalid } = validJob
    expect(() => JobDetailsSchema.parse(invalid)).toThrow()
  })

  it('should accept null salario', () => {
    const valid = { ...validJob, salario: null }
    expect(() => JobDetailsSchema.parse(valid)).not.toThrow()
  })

  describe('ParsedVagaData compatibility fields', () => {
    it('should accept optional requisitos_score field (0-5 range)', () => {
      const withRequisitos = { ...validJob, requisitos_score: 4.5 }
      expect(() => JobDetailsSchema.parse(withRequisitos)).not.toThrow()
    })

    it('should reject requisitos_score outside 0-5 range', () => {
      const invalidHigh = { ...validJob, requisitos_score: 6 }
      expect(() => JobDetailsSchema.parse(invalidHigh)).toThrow()

      const invalidLow = { ...validJob, requisitos_score: -1 }
      expect(() => JobDetailsSchema.parse(invalidLow)).toThrow()
    })

    it('should accept requisitos_score boundary values 0 and 5', () => {
      const withZero = { ...validJob, requisitos_score: 0 }
      expect(() => JobDetailsSchema.parse(withZero)).not.toThrow()

      const withFive = { ...validJob, requisitos_score: 5 }
      expect(() => JobDetailsSchema.parse(withFive)).not.toThrow()
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

    it('should accept fit boundary values 0 and 5', () => {
      const withZero = { ...validJob, fit: 0 }
      expect(() => JobDetailsSchema.parse(withZero)).not.toThrow()

      const withFive = { ...validJob, fit: 5 }
      expect(() => JobDetailsSchema.parse(withFive)).not.toThrow()
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
        requisitos_score: 4.5,
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

  it('should accept idioma_vaga: "en"', () => {
    const englishJob = { ...validJob, idioma_vaga: 'en' as const }
    expect(() => JobDetailsSchema.parse(englishJob)).not.toThrow()
  })

  it('should accept empty arrays for requisitos_obrigatorios when undefined', () => {
    const { requisitos_obrigatorios, ...jobWithoutRequisitos } = validJob
    expect(() => JobDetailsSchema.parse(jobWithoutRequisitos)).toThrow()
  })

  it('should reject empty arrays for requisitos_obrigatorios', () => {
    const invalid = { ...validJob, requisitos_obrigatorios: [] }
    expect(() => JobDetailsSchema.parse(invalid)).toThrow()
  })

  it('should reject empty arrays for requisitos_desejaveis', () => {
    const invalid = { ...validJob, requisitos_desejaveis: [] }
    expect(() => JobDetailsSchema.parse(invalid)).toThrow()
  })

  it('should reject empty arrays for responsabilidades', () => {
    const invalid = { ...validJob, responsabilidades: [] }
    expect(() => JobDetailsSchema.parse(invalid)).toThrow()
  })

  it('should reject empty arrays for beneficios', () => {
    const invalid = { ...validJob, beneficios: [] }
    expect(() => JobDetailsSchema.parse(invalid)).toThrow()
  })

  it('should reject empty strings in array elements', () => {
    const invalid = { ...validJob, requisitos_obrigatorios: ['JavaScript', '', 'TypeScript'] }
    const result = () => JobDetailsSchema.parse(invalid)
    expect(result).toThrow()
    try {
      result()
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'issues' in error) {
        const zodError = error as { issues: Array<{ path: string[]; message: string }> }
        expect(zodError.issues.some(issue => 
          issue.path.includes('requisitos_obrigatorios') && 
          issue.message.includes('vazio')
        )).toBe(true)
      }
    }
  })

  it('should provide specific validation error message for invalid campo', () => {
    const invalid = { ...validJob, empresa: '' }
    try {
      JobDetailsSchema.parse(invalid)
      expect.fail('Should have thrown')
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'issues' in error) {
        const zodError = error as { issues: Array<{ path: string[]; message: string }> }
        const empresaError = zodError.issues.find(issue => issue.path.includes('empresa'))
        expect(empresaError).toBeDefined()
        expect(empresaError?.message).toContain('obrigatória')
      }
    }
  })
})
