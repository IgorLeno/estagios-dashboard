# Tests - CLAUDE.md

Context-specific guidance for the `/__tests__` directory.

## Testing Setup

**Framework:** Vitest with jsdom environment
**Libraries:** React Testing Library v16+, jest-dom
**Config:** [vitest.config.ts](../vitest.config.ts), [vitest.setup.ts](../vitest.setup.ts)

## Directory Structure

```
__tests__/
└── lib/
    ├── markdown-parser.test.ts
    └── date-utils.test.ts
```

**Pattern:** Mirror `lib/` structure for utility tests.

## Test Philosophy

### What to Test

1. **Utilities in `/lib`** - Pure functions, business logic
2. **Parsers and data transformations** - Critical path functions
3. **Date/time logic** - Custom day boundaries, edge cases
4. **Type validation** - Number ranges, enum values

### What NOT to Test (Yet)

1. **Server Components** - Vitest limitation with async Server Components
2. **E2E flows** - Use Playwright/Cypress instead (not yet configured)
3. **Supabase integration** - Would need mocking (not implemented)
4. **UI Components** - Can test but currently not priority

## Current Test Coverage

### `markdown-parser.test.ts`

**Coverage:** 11 test cases

**Test Categories:**

- Basic field extraction (`**Campo**: valor`)
- Alternative formats (`Campo: valor`, `# Campo\nvalor`)
- Case insensitivity
- Number validation (requisitos 0-100, fit 0-10)
- Enum mapping (status, modalidade)
- Multi-line content (observações)
- Edge cases (missing fields, partial data)

**Pattern:**

```typescript
describe("parseVagaFromMarkdown", () => {
  it("should parse basic markdown format", () => {
    const markdown = `
      **Empresa**: Google
      **Cargo**: Engenheiro
    `
    const result = parseVagaFromMarkdown(markdown)
    expect(result.empresa).toBe("Google")
    expect(result.cargo).toBe("Engenheiro")
  })
})
```

### `date-utils.test.ts`

**Coverage:** Tests for date boundary logic

**Test Categories:**

- Before custom day start (should return previous day)
- After custom day start (should return current day)
- Default configuration (06:00 start)
- Custom configuration
- Date formatting functions
- Time validation

**Pattern:**

```typescript
describe("getDataInscricao", () => {
  it("should return previous day when before start time", () => {
    const now = new Date("2025-01-15T03:00:00")
    const config = { hora_inicio: "06:00:00" }
    const result = getDataInscricao(now, config)
    expect(result).toBe("2025-01-14") // Previous day
  })
})
```

## Testing Patterns

### Testing Pure Functions

```typescript
import { describe, it, expect } from "vitest"
import { functionToTest } from "@/lib/utility"

describe("functionToTest", () => {
  it("should handle valid input", () => {
    const result = functionToTest(validInput)
    expect(result).toBe(expectedOutput)
  })

  it("should handle edge case", () => {
    const result = functionToTest(edgeInput)
    expect(result).toBe(expectedOutput)
  })
})
```

### Testing with Mock Data

```typescript
const mockVaga: VagaEstagio = {
  id: "123",
  empresa: "Test Corp",
  cargo: "Engineer",
  // ... full object
}
```

### Async Tests

```typescript
it("should handle async operation", async () => {
  const result = await asyncFunction()
  expect(result).toBeDefined()
})
```

### Testing Hooks (React Testing Library v16+)

**IMPORTANT:** Use `waitFor`, NOT `waitForNextUpdate` (removed in v16+)

```typescript
import { renderHook, waitFor } from "@testing-library/react"

it("should update hook value", async () => {
  const { result } = renderHook(() => useCustomHook())

  await waitFor(() => {
    expect(result.current.value).toBe(expectedValue)
  })
})
```

## Running Tests

```bash
# Watch mode (default)
pnpm test

# Run all tests once
pnpm test run

# With UI
pnpm test:ui

# With coverage
pnpm test:coverage

# Specific file
pnpm test -- markdown-parser

# Specific test
pnpm test -- markdown-parser -t "should parse basic"
```

## Coverage

**Target:** Utilities in `/lib` should have >80% coverage

**Check Coverage:**

```bash
pnpm test:coverage
```

Coverage reports generated in `./coverage/`:

- `coverage/index.html` - Visual coverage report
- `coverage/coverage-final.json` - JSON report (sent to Codecov)

**Excluded from Coverage:**

- `node_modules/`
- Test files (`*.test.ts`)
- Config files (`*.config.*`)
- Type definitions (`*.d.ts`)

## Adding New Tests

### For New Utility Function

1. Create test file: `__tests__/lib/utility-name.test.ts`
2. Import function from `@/lib/utility-name`
3. Write describe block with multiple test cases
4. Cover: happy path, edge cases, error cases
5. Run tests and verify coverage

### Test File Template

```typescript
import { describe, it, expect } from "vitest"
import { newUtility } from "@/lib/new-utility"
import type { ExpectedType } from "@/lib/types"

describe("newUtility", () => {
  it("should handle basic case", () => {
    const input = "test"
    const result = newUtility(input)
    expect(result).toBe("expected")
  })

  it("should handle edge case", () => {
    const result = newUtility("")
    expect(result).toBeUndefined()
  })

  it("should throw on invalid input", () => {
    expect(() => newUtility(null as any)).toThrow()
  })
})
```

## CI Integration

Tests run automatically in GitHub Actions on push/PR:

1. Install dependencies
2. Run linter
3. Run tests with coverage
4. Upload coverage to Codecov
5. Build verification

See [.github/workflows/ci.yml](../.github/workflows/ci.yml)

## Future Testing Enhancements

### Component Testing

Add tests for React components:

```typescript
import { render, screen } from "@testing-library/react"
import { AddVagaDialog } from "@/components/add-vaga-dialog"

it("should render dialog", () => {
  render(<AddVagaDialog open={true} />)
  expect(screen.getByText("Add Vaga")).toBeInTheDocument()
})
```

### Supabase Mocking

Mock Supabase client for testing data fetching:

```typescript
import { vi } from "vitest"

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      select: vi.fn().mockResolvedValue({ data: mockData }),
    }),
  }),
}))
```

### E2E Testing

Add Playwright or Cypress for full user flows:

- Login → Create vaga → Upload file → Verify data
- Navigate tabs → Apply filters → Verify results
- Admin routes → Auth checks → Protected actions
