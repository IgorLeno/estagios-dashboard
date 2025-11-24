# CI/CD Test Reporting

**Status:** ✅ Implemented (2025-01-23)

## Overview

The GitHub Actions CI/CD pipeline generates comprehensive, human-readable test reports in the workflow summary. All test phases are now properly parsed and displayed with detailed failure information.

## Report Sections

### 1. 🔍 Lint Check

**Format:**

```
## 🔍 Lint Check

| Type | Count |
|------|-------|
| Errors | 0 ❌ |
| Warnings | 36 ⚠️ |
```

**With Issues:**

```
<details><summary>Issues Found (0 errors, 36 warnings)</summary>

- `@typescript-eslint/prefer-const` at components/dashboard.tsx:25 - Use const instead of let
- ...
</details>
```

**Data Source:** `lint-results.json` (ESLint JSON output)

---

### 2. 💅 Format Check

**Format:**

```
## 💅 Format Check

✅ All files are properly formatted
```

**Or when failing:**

```
❌ Formatting issues found

Run `pnpm format` to fix formatting issues
```

**Data Source:** Exit code from `pnpm format:check`

---

### 3. 🧪 Unit Tests

**Format:**

```
## 🧪 Unit Tests

| Metric | Count |
|--------|-------|
| Total | 214 |
| Passed | 201 ✅ |
| Failed | 13 ❌ |
```

**With Failures:**

```
<details><summary>❌ Failed Tests (13)</summary>

- **should parse job description with all fields**
- **should handle missing optional fields**
...
</details>
```

**Data Source:** `test-results.json` (Vitest JSON reporter)

**JSON Structure:**

```json
{
  "numTotalTests": 214,
  "numPassedTests": 201,
  "numFailedTests": 13,
  "testResults": [
    {
      "status": "failed",
      "assertionResults": [
        {
          "status": "failed",
          "fullName": "parseJobWithGemini should parse job description"
        }
      ]
    }
  ]
}
```

---

### 4. 🎭 E2E Tests

**Format:**

```
## 🎭 E2E Tests

| Metric | Count |
|--------|-------|
| Total | 8 |
| Passed | 6 ✅ |
| Failed | 2 ❌ |
| Skipped | 0 ⏭️ |
```

**With Failures:**

```
<details><summary>❌ Failed E2E Tests (2)</summary>

### ❌ should add new job opportunity
- **File**: `e2e/dashboard.spec.ts`
- **Duration**: 15.324s
- **Error**: Timeout 30000ms exceeded while waiting for selector "#save-button"

### ❌ should generate PDF
- **File**: `e2e/resume.spec.ts`
- **Duration**: 8.1s
- **Error**: Expected PDF download but got none

[View full Playwright report in artifacts](../artifacts)

</details>
```

**Data Source:** `playwright-report/results.json` (Playwright JSON reporter)

**JSON Structure:**

```json
{
  "suites": [
    {
      "file": "e2e/dashboard.spec.ts",
      "specs": [
        {
          "title": "should load dashboard page",
          "ok": true,
          "tests": [
            {
              "status": "expected",
              "results": [
                {
                  "status": "expected",
                  "duration": 2345,
                  "errors": [],
                  "error": null
                }
              ]
            }
          ]
        },
        {
          "title": "should add new job opportunity",
          "ok": false,
          "tests": [
            {
              "status": "unexpected",
              "results": [
                {
                  "status": "unexpected",
                  "duration": 15324,
                  "error": {
                    "message": "Timeout 30000ms exceeded...",
                    "stack": "Error: Timeout..."
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

**Status Values:**

- `"expected"` / `"passed"` = Test passed
- `"unexpected"` / `"failed"` = Test failed
- `"skipped"` = Test skipped

---

### 5. 📊 CI Pipeline Results

**Consolidated Summary:**

```
# 📊 CI Pipeline Results

| Phase | Status |
|-------|--------|
| Lint | ✅ Pass |
| Format | ✅ Pass |
| Unit Tests | ❌ Fail |
| E2E Tests | ❌ Fail |
| Build | ✅ Pass |
```

**Data Source:** Step outcomes from GitHub Actions

---

## Implementation Details

### Playwright JSON Reporter

**Configuration** (`playwright.config.ts`):

```typescript
reporter: [
  ["html", { outputFolder: "playwright-report" }],
  ["json", { outputFile: "playwright-report/results.json" }],
  ["list"],
],
```

**Parsing Logic** (`.github/workflows/ci.yml`):

```bash
# Count tests
TOTAL=$(jq '[.suites[]?.specs[]?.tests[]?] | length' results.json)
PASSED=$(jq '[.suites[]?.specs[]?.tests[]? | select(.status == "expected" or .status == "passed")] | length' results.json)
FAILED=$(jq '[.suites[]?.specs[]?.tests[]? | select(.status == "unexpected" or .status == "failed")] | length' results.json)

# Extract failed test details
jq -r '.suites[]? | .specs[]? as $spec | .file as $file |
  $spec.tests[]? |
  select(.status == "unexpected" or .status == "failed") |
  "### ❌ \($spec.title)\n- **File**: `\($file)`\n- **Duration**: \(.results[0].duration / 1000)s\n- **Error**: \(.results[0].error.message // "No error message")\n"' results.json
```

### Error Handling

**If JSON parsing fails:**

```
⚠️ Could not parse E2E test results

✅ E2E tests passed
```

or

```
⚠️ Could not parse E2E test results

❌ E2E tests failed - check logs for details
```

**Fallback to step outcome** when JSON is unavailable.

---

## Artifacts

**Uploaded to GitHub Actions:**

1. **playwright-report/** (30 days retention)
   - HTML report with screenshots/videos
   - JSON results file
   - Traces on failure

2. **test-reports/** (7 days retention)
   - `test-results.json` (Vitest)
   - `lint-results.json` (ESLint)
   - `playwright-report/results.json` (Playwright)

---

## Testing Locally

**Generate sample report:**

```bash
# Run tests
pnpm lint --format json --output-file lint-results.json
pnpm test:coverage --reporter=json --reporter=default --outputFile=test-results.json
pnpm test:e2e  # Generates playwright-report/results.json automatically

# Inspect JSON files
cat lint-results.json | jq .
cat test-results.json | jq .
cat playwright-report/results.json | jq .
```

**Parse manually:**

```bash
# E2E test counts
jq '[.suites[]?.specs[]?.tests[]?] | length' playwright-report/results.json
jq '[.suites[]?.specs[]?.tests[]? | select(.status == "expected")] | length' playwright-report/results.json

# Failed test details
jq -r '.suites[]? | .specs[]? as $spec | $spec.tests[]? | select(.status == "unexpected") | "\($spec.title) - \(.results[0].error.message)"' playwright-report/results.json
```

---

## Troubleshooting

### No results.json generated

**Cause:** JSON reporter not configured in `playwright.config.ts`

**Fix:** Ensure reporter array includes:

```typescript
;["json", { outputFile: "playwright-report/results.json" }]
```

### "Could not parse E2E test results"

**Cause 1:** Invalid JSON file

- **Fix:** Check `jq empty results.json` succeeds

**Cause 2:** Wrong jq query for Playwright structure

- **Fix:** Verify JSON structure matches expectations (suites → specs → tests)

**Cause 3:** Results file doesn't exist

- **Fix:** Verify tests ran and completed (not interrupted mid-run)

### Failed tests not showing details

**Cause:** Status field mismatch (expected "expected"/"unexpected" but got different values)

**Fix:** Check actual status values in JSON:

```bash
jq '[.suites[]?.specs[]?.tests[]?.status] | unique' results.json
```

Update jq queries to match actual values.

---

## References

- [Playwright Reporters Docs](https://playwright.dev/docs/test-reporters)
- [GitHub Actions Summary Markdown](https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#adding-a-job-summary)
- [jq Manual](https://stedolan.github.io/jq/manual/)
