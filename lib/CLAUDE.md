# Lib - CLAUDE.md

Context-specific guidance for the `/lib` directory.

## Purpose

Core utilities, type definitions, and external service integrations (Supabase).

## Files Overview

### `types.ts` - TypeScript Definitions

Central type definitions for the entire application. All components import types from here.

**Key Interfaces:**

- `VagaEstagio` - Job application with all fields (empresa, cargo, status, etc.)
- `MetaDiaria` - Daily goal tracking
- `Configuracao` - User settings (custom day start/end times)
- `HistoricoResumo` - Historical summary data
- `StatusResumo` / `LocalResumo` - Aggregated statistics

**Important Type Constraints:**

```typescript
modalidade: "Presencial" | "Híbrido" | "Remoto"  // Fixed set
status: "Pendente" | "Avançado" | "Melou" | "Contratado"  // Fixed set
requisitos?: number  // 0-100 score
fit?: number  // 0-10 score
```

### `markdown-parser.ts` - Markdown Analysis Parser

**Purpose:** Extract structured data from markdown analysis files to auto-fill vaga forms.

**Main Function:**

```typescript
parseVagaFromMarkdown(markdown: string): ParsedVagaData
```

**Parsing Strategy:**

- Flexible format recognition (handles `**Campo**: valor`, `Campo: valor`, `# Campo\nvalor`)
- Case-insensitive field matching
- Regex-based extraction with fallback patterns
- Number validation with min/max constraints
- Smart status/modalidade mapping from natural language

**Supported Fields:**

- empresa, cargo, local (string extraction)
- modalidade (keyword matching: presencial/híbrido/remoto)
- requisitos (0-100), fit (0-10) - number extraction with validation
- etapa, status (keyword-based enum mapping)
- observacoes (multi-line section extraction)

**Testing:**

- 11 test cases in `__tests__/lib/markdown-parser.test.ts`
- Covers multiple markdown formats, edge cases, partial data

**Usage Pattern:**

```typescript
// In upload components
const parsed = parseVagaFromMarkdown(markdownContent)
setFormData((prev) => ({ ...prev, ...parsed }))
```

### `date-utils.ts` - Date Utilities with Custom Day Logic

**Purpose:** Handle date calculations with configurable day boundaries.

**Core Concept:**
The "day" for inscription tracking doesn't follow calendar days. By default:

- Day starts at 06:00 and ends at 05:59 next calendar day
- Example: 03:00 Tuesday = Monday's date (still before 06:00)

**Main Function:**

```typescript
getDataInscricao(now?: Date, config?: Configuracao): string
```

**Logic:**

1. Get configured start time (default: "06:00:00")
2. Compare current time to start time
3. If before start time → return previous calendar day
4. Otherwise → return current calendar day
5. Format as YYYY-MM-DD

**Other Utilities:**

- `formatDateToYYYYMMDD()` - ISO date format
- `formatDateToDDMMYYYY()` - Display format
- `isValidTimeFormat()` - Validate HH:MM strings
- `daysBetween()` - Calculate day difference

**Critical Usage:**
Used in ALL components that record `data_inscricao`:

- `add-vaga-dialog.tsx` - When creating new vaga
- `edit-vaga-dialog.tsx` - When updating vaga
- Reports and filters - Ensure consistent date logic

**Testing:**

- Tests in `__tests__/lib/date-utils.test.ts`
- Validates boundary conditions (before/after start time)
- Tests with different configurations

### `utils.ts` - General Utilities

**Main Export:**

```typescript
cn(...inputs: ClassValue[]): string
```

Combines `clsx` and `tailwind-merge` for className handling:

```typescript
// Merge classes, resolve conflicts
cn("px-2 py-1", condition && "px-4") // → "px-4 py-1"
```

Used extensively in all components for conditional styling.

### `supabase/` - Supabase Client Setup

**Files:**

- `client.ts` - Client-side Supabase client
- `server.ts` - Server-side Supabase client
- `middleware.ts` - Middleware for session updates

**Client-Side (`client.ts`):**

```typescript
import { createClient } from "@/lib/supabase/client"

// Used in all "use client" components
const supabase = createClient()
```

**Server-Side (`server.ts`):**

```typescript
import { createClient } from "@/lib/supabase/server"

// Used in Server Components and API routes (async)
const supabase = await createClient()
```

**Key Difference:**

- Client: Synchronous, uses browser cookies
- Server: Async, uses Next.js `cookies()` from `next/headers`

## Adding New Utilities

### When to Add to This Directory

- Reusable logic across multiple components
- Business logic that needs testing
- Type definitions shared across the app
- Integration with external services

### When NOT to Add

- Component-specific helper functions (keep in component file)
- One-off utility used once (inline in component)

### Pattern for New Utility File

```typescript
// lib/new-utility.ts

/**
 * Clear documentation of purpose
 */

// Import types from types.ts
import type { VagaEstagio } from "./types"

/**
 * Function with JSDoc
 * @param input - Description
 * @returns Description
 */
export function utilityFunction(input: string): ReturnType {
  // Implementation
}

// Export related utilities together
export function relatedUtility() {
  // ...
}
```

### Testing New Utilities

Create corresponding test file in `__tests__/lib/`:

```typescript
// __tests__/lib/new-utility.test.ts

import { describe, it, expect } from "vitest"
import { utilityFunction } from "@/lib/new-utility"

describe("utilityFunction", () => {
  it("should handle basic case", () => {
    expect(utilityFunction("input")).toBe("expected")
  })

  it("should handle edge cases", () => {
    // Test edge cases
  })
})
```

## Type Definition Best Practices

### When Adding/Modifying Types

1. **Update in single source:** Only in `types.ts`
2. **Match database schema:** Keep in sync with Supabase tables
3. **Use strict types:** Prefer union types over `string` for enums
4. **Optional fields:** Mark with `?` only if truly optional
5. **Document constraints:** Add comments for ranges, formats

Example:

```typescript
export interface NewType {
  id: string // UUID from Supabase
  created_at: string // ISO timestamp
  status: "active" | "inactive" // Fixed enum
  score?: number // Optional, 0-100 if present
}
```

### Import Pattern

Always use `type` import for better tree-shaking:

```typescript
import type { VagaEstagio, MetaDiaria } from "@/lib/types"
```
