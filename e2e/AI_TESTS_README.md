# E2E Tests for AI Features

This document describes the E2E test coverage for the AI Job Parser and AI Resume Generator features.

## Test Files

### 1. `ai-parser.spec.ts` (6 tests)

Tests the AI Job Parser workflow that uses Gemini 2.5 Flash to extract structured data from job descriptions.

**Tests:**

1. **deve parsear descrição de vaga com sucesso** - Happy path test
   - Opens "Adicionar Estágio" dialog
   - Verifies starts on "Descrição" tab
   - Fills job description textarea
   - Clicks "Preencher Dados" button
   - Waits for parsing (loading indicator + toast)
   - Verifies auto-switch to "Dados da Vaga" tab
   - Validates form fields were populated correctly

2. **deve validar tamanho mínimo da descrição (50 chars)** - Validation test
   - Tests min/max character validation
   - Verifies "Preencher Dados" button state (disabled < 50 chars, enabled >= 50 chars)

3. **deve permitir refazer análise** - Re-parse workflow
   - Completes initial parsing
   - Clicks "Refazer Análise" button on "Dados da Vaga" tab
   - Waits for re-parsing
   - Verifies data was updated

4. **deve lidar com erro de rate limit (429)** - Error handling
   - Mocks API response with 429 status
   - Clicks "Preencher Dados"
   - Verifies error toast: "Limite de requisições atingido"
   - Confirms form was NOT filled

5. **deve lidar com erro de rede/timeout** - Error handling
   - Mocks API response with 500 status
   - Clicks "Preencher Dados"
   - Verifies generic error toast
   - Confirms form was NOT filled

6. **deve alternar entre tabs sem perder dados** - State persistence
   - Completes parsing
   - Switches between tabs: Descrição → Dados → Currículo → back to Dados
   - Verifies data is preserved across tab changes

### 2. `resume-generator.spec.ts` (6 tests)

Tests the AI Resume Generator workflow that creates personalized CVs using Gemini 2.5 Flash.

**Tests:**

1. **deve gerar currículo personalizado com sucesso** - Happy path test
   - Sets up job analysis (helper function)
   - Navigates to "Currículo" tab
   - Clicks "Gerar Currículo"
   - Waits for generation (loading + toast)
   - Verifies PDF preview appears with filename
   - Confirms download/refresh buttons are enabled

2. **deve permitir regenerar currículo** - Refresh workflow
   - Generates initial resume
   - Clicks "Refazer" button
   - Confirms browser dialog ("Deseja gerar um novo currículo?")
   - Waits for regeneration
   - Verifies preview still visible

3. **deve baixar PDF do currículo** - Download functionality
   - Generates resume
   - Sets up download event listener
   - Clicks "Baixar PDF"
   - Verifies .pdf file download initiated
   - Confirms success toast

4. **deve lidar com erro na geração** - Error handling
   - Mocks API response with 500 status
   - Clicks "Gerar Currículo"
   - Verifies error toast
   - Confirms preview stays empty
   - Verifies download/refresh buttons disabled

5. **deve salvar vaga após gerar currículo** - Full workflow test
   - Sets up job analysis with unique empresa name
   - Generates resume
   - Clicks "Salvar Vaga" (green button)
   - Waits for save operation
   - Verifies success toast + dialog closes
   - Confirms vaga appears in dashboard table

6. **deve validar que jobAnalysisData é necessário antes de gerar currículo** - Validation test (BONUS)
   - Opens dialog and goes to "Currículo" tab WITHOUT parsing job
   - Fills form manually (bypassing AI parser)
   - Verifies "Gerar Currículo" button is DISABLED
   - Ensures resume generation requires AI job analysis first

## Removed Tests

- **`upload.spec.ts`** (6 tests) - Completely removed
  - File upload feature is being replaced by AI Job Parser
  - Tests covered: markdown upload, PDF upload, validation, file replacement, progress indicators

## Test Utilities

All tests use helper functions from `e2e/helpers/test-utils.ts`:

- `waitForToast(page, message)` - Wait for Sonner toast notifications
- `waitForVagaInTable(page, empresaName)` - Wait for vaga to appear in dashboard
- `generateUniqueTestName(baseName)` - Create unique test data names

## Running Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run specific test files
pnpm test:e2e -- ai-parser.spec.ts
pnpm test:e2e -- resume-generator.spec.ts

# Run with UI
pnpm test:e2e -- --ui

# Run in headed mode (see browser)
pnpm test:e2e -- --headed

# Run specific test
pnpm test:e2e -- ai-parser.spec.ts -g "deve parsear descrição"
```

## Environment Setup

Tests require `.env.test` file with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
NEXT_PUBLIC_SHOW_TEST_DATA=true  # Required for E2E tests
GOOGLE_API_KEY=your_gemini_key    # Required for AI features
```

## Important Notes

1. **LLM Calls**: Tests make REAL calls to Gemini API
   - May hit rate limits during rapid test execution
   - Error handling tests mock API responses to avoid costs

2. **Timeouts**: AI operations can take 5-30 seconds
   - Tests use generous timeouts (up to 10s for some assertions)
   - Loading indicators are verified to provide feedback

3. **Tab Navigation**: Tests verify proper tab state (`data-state="active"`)
   - Uses Radix UI Tabs component patterns
   - Auto-switching after successful parsing

4. **State Management**: Tests validate data persistence across tabs
   - Form data should not be lost when switching tabs
   - Re-parsing should update existing data

5. **Error Scenarios**: Both test suites include error handling
   - Rate limit (429)
   - Server errors (500)
   - Network failures (mocked)

## Test Coverage Summary

| Feature | Tests | Coverage |
|---------|-------|----------|
| AI Job Parser | 6 | Happy path, validation, re-parse, errors, state |
| AI Resume Generator | 6 | Happy path, refresh, download, errors, save, validation |
| **TOTAL** | **12** | **Complete E2E coverage** |

## Next Steps

1. Run tests locally: `pnpm test:e2e`
2. Verify all tests pass (may need API keys configured)
3. Review test output and screenshots (if failures occur)
4. CI/CD will run these tests automatically on push/PR

## Debugging

If tests fail:

1. Check `playwright-report/` for HTML report
2. Review screenshots in `test-results/`
3. Watch videos of failed tests (retained on failure)
4. Run with `--headed` to see browser interactions
5. Check API rate limits (Gemini free tier: 15 requests/minute)

## Architecture Notes

**Dialog Structure:**
- 3 tabs: Descrição → Dados da Vaga → Currículo
- Tab 1: Job description input + "Preencher Dados"
- Tab 2: Form fields + "Refazer Análise"
- Tab 3: Resume preview + "Gerar/Refazer/Baixar" + "Salvar Vaga"

**API Endpoints:**
- `POST /api/ai/parse-job` - Parse job description
- `POST /api/ai/generate-resume` - Generate personalized resume

**Key Components:**
- `AddVagaDialog` - Main dialog orchestrating all tabs
- `DescricaoTab` - Job description input
- `DadosVagaTab` - Form fields
- `CurriculoTab` - Resume generation UI
