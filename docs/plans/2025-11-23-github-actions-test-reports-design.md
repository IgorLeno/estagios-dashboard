# GitHub Actions Enhanced Test Reporting

**Date:** 2025-11-23
**Status:** Design Validated
**Author:** Claude Code + Igor

## Problem Statement

Current CI workflow (`.github/workflows/ci.yml`) runs comprehensive checks (lint, format, unit tests, E2E tests, build) but makes it difficult to quickly identify failures without diving into raw logs. When a CI run fails, developers need to:

1. Open detailed logs
2. Scroll through verbose output
3. Search for error messages
4. Identify which specific tests failed

This slows down PR review cycles and debugging.

## Goal

Enhance existing CI workflow to provide **at-a-glance failure visibility** through structured test reports using native GitHub Actions features.

## Requirements

### Functional Requirements

1. **Summary Statistics:** Display pass/fail counts for each CI phase (lint, tests, build)
2. **Failed Test Details:** Show exact test names and file locations for failures
3. **Collapsible Sections:** Summary always visible, details expandable on demand
4. **Native Integration:** Use GitHub Actions `$GITHUB_STEP_SUMMARY` (no external services)
5. **Preserve Existing Features:** Keep Codecov integration, Playwright artifacts, all current checks

### Non-Functional Requirements

1. **No Custom Scripts:** Use only GitHub Actions native features and pre-installed tools (`jq`)
2. **Minimal Maintenance:** No new dependencies, files, or complex parsing logic
3. **Fast Execution:** Report generation adds <5s to total CI time
4. **Readable Logs:** Console output remains human-readable (dual reporters)

## Design

### Architecture

**Core Strategy:**

1. **JSON Output from Test Tools:**
   - Vitest: `--reporter=json --reporter=default --outputFile=test-results.json`
   - Playwright: Built-in JSON reporter (already configured)
   - ESLint: `--format json --output-file lint-results.json`

2. **Parse with jq (pre-installed in ubuntu-latest):**
   - Extract summary stats (total, passed, failed)
   - Filter failed test details
   - Generate markdown tables

3. **Write to `$GITHUB_STEP_SUMMARY`:**
   - Top-level summary table (all phases)
   - Collapsible `<details>` sections for failures
   - Links to artifacts for deep debugging

### Workflow Modifications

**File:** `.github/workflows/ci.yml`

#### Changes to Existing Steps

**Before:**

```yaml
- name: Run unit tests
  run: pnpm test:coverage
```

**After:**

```yaml
- name: Run unit tests
  id: vitest
  run: pnpm test:coverage --reporter=json --reporter=default --outputFile=test-results.json
  continue-on-error: true
```

**Key changes:**

- Add `id:` for step reference
- Add dual reporters (JSON file + console output)
- Add `continue-on-error: true` to run all phases even if one fails

#### New Steps Added

**1. Test Summary Generation (after unit tests):**

```yaml
- name: Generate Unit Test Summary
  if: always()
  run: |
    echo "## 🧪 Unit Tests" >> $GITHUB_STEP_SUMMARY
    echo "" >> $GITHUB_STEP_SUMMARY

    if [ -f test-results.json ] && jq empty test-results.json 2>/dev/null; then
      TOTAL=$(jq '.numTotalTests' test-results.json)
      PASSED=$(jq '.numPassedTests' test-results.json)
      FAILED=$(jq '.numFailedTests' test-results.json)

      echo "| Metric | Count |" >> $GITHUB_STEP_SUMMARY
      echo "|--------|-------|" >> $GITHUB_STEP_SUMMARY
      echo "| Total | $TOTAL |" >> $GITHUB_STEP_SUMMARY
      echo "| Passed | $PASSED ✅ |" >> $GITHUB_STEP_SUMMARY
      echo "| Failed | $FAILED ❌ |" >> $GITHUB_STEP_SUMMARY
      echo "" >> $GITHUB_STEP_SUMMARY

      if [ "$FAILED" -gt 0 ]; then
        echo "<details><summary>❌ Failed Tests ($FAILED)</summary>" >> $GITHUB_STEP_SUMMARY
        echo "" >> $GITHUB_STEP_SUMMARY
        jq -r '.testResults[] | select(.status == "failed") | "- \`\(.name)\` in \`\(.location.file)\`"' test-results.json >> $GITHUB_STEP_SUMMARY
        echo "" >> $GITHUB_STEP_SUMMARY
        echo "</details>" >> $GITHUB_STEP_SUMMARY
      fi
    else
      echo "⚠️ Could not parse test results" >> $GITHUB_STEP_SUMMARY
    fi
```

**2. Lint Summary Generation (after linter):**

```yaml
- name: Generate Lint Summary
  if: always()
  run: |
    echo "## 🔍 Lint Check" >> $GITHUB_STEP_SUMMARY
    echo "" >> $GITHUB_STEP_SUMMARY

    if [ -f lint-results.json ]; then
      ERRORS=$(jq '[.[] | .errorCount] | add' lint-results.json)
      WARNINGS=$(jq '[.[] | .warningCount] | add' lint-results.json)

      echo "| Type | Count |" >> $GITHUB_STEP_SUMMARY
      echo "|------|-------|" >> $GITHUB_STEP_SUMMARY
      echo "| Errors | $ERRORS ❌ |" >> $GITHUB_STEP_SUMMARY
      echo "| Warnings | $WARNINGS ⚠️ |" >> $GITHUB_STEP_SUMMARY
      echo "" >> $GITHUB_STEP_SUMMARY

      if [ "$ERRORS" -gt 0 ] || [ "$WARNINGS" -gt 0 ]; then
        echo "<details><summary>Issues Found</summary>" >> $GITHUB_STEP_SUMMARY
        echo "" >> $GITHUB_STEP_SUMMARY
        jq -r '.[] | .messages[] | "- \`\(.ruleId)\` at \(.filePath):\(.line) - \(.message)"' lint-results.json | head -20 >> $GITHUB_STEP_SUMMARY
        echo "" >> $GITHUB_STEP_SUMMARY
        echo "</details>" >> $GITHUB_STEP_SUMMARY
      fi
    fi
```

**3. E2E Test Summary (after Playwright):**

```yaml
- name: Generate E2E Test Summary
  if: always()
  run: |
    echo "## 🎭 E2E Tests" >> $GITHUB_STEP_SUMMARY
    echo "" >> $GITHUB_STEP_SUMMARY

    if [ -f playwright-report/results.json ]; then
      TOTAL=$(jq '.suites | length' playwright-report/results.json)
      PASSED=$(jq '[.suites[].specs[] | select(.ok == true)] | length' playwright-report/results.json)
      FAILED=$(jq '[.suites[].specs[] | select(.ok == false)] | length' playwright-report/results.json)

      echo "| Metric | Count |" >> $GITHUB_STEP_SUMMARY
      echo "|--------|-------|" >> $GITHUB_STEP_SUMMARY
      echo "| Total | $TOTAL |" >> $GITHUB_STEP_SUMMARY
      echo "| Passed | $PASSED ✅ |" >> $GITHUB_STEP_SUMMARY
      echo "| Failed | $FAILED ❌ |" >> $GITHUB_STEP_SUMMARY
      echo "" >> $GITHUB_STEP_SUMMARY

      if [ "$FAILED" -gt 0 ]; then
        echo "<details><summary>❌ Failed E2E Tests ($FAILED)</summary>" >> $GITHUB_STEP_SUMMARY
        echo "" >> $GITHUB_STEP_SUMMARY
        jq -r '.suites[].specs[] | select(.ok == false) | "- \`\(.title)\` in \`\(.file)\`"' playwright-report/results.json >> $GITHUB_STEP_SUMMARY
        echo "" >> $GITHUB_STEP_SUMMARY
        echo "[View full Playwright report](../artifacts)" >> $GITHUB_STEP_SUMMARY
        echo "" >> $GITHUB_STEP_SUMMARY
        echo "</details>" >> $GITHUB_STEP_SUMMARY
      fi
    fi
```

**4. Consolidated Summary (final step):**

```yaml
- name: Generate Consolidated Summary
  if: always()
  run: |
    echo "---" >> $GITHUB_STEP_SUMMARY
    echo "" >> $GITHUB_STEP_SUMMARY
    echo "# 📊 CI Pipeline Results" >> $GITHUB_STEP_SUMMARY
    echo "" >> $GITHUB_STEP_SUMMARY
    echo "| Phase | Status |" >> $GITHUB_STEP_SUMMARY
    echo "|-------|--------|" >> $GITHUB_STEP_SUMMARY
    echo "| Lint | ${{ steps.lint.outcome == 'success' && '✅ Pass' || '❌ Fail' }} |" >> $GITHUB_STEP_SUMMARY
    echo "| Format | ${{ steps.format.outcome == 'success' && '✅ Pass' || '❌ Fail' }} |" >> $GITHUB_STEP_SUMMARY
    echo "| Unit Tests | ${{ steps.vitest.outcome == 'success' && '✅ Pass' || '❌ Fail' }} |" >> $GITHUB_STEP_SUMMARY
    echo "| E2E Tests | ${{ steps.e2e.outcome == 'success' && '✅ Pass' || '❌ Fail' }} |" >> $GITHUB_STEP_SUMMARY
    echo "| Build | ${{ steps.build.outcome == 'success' && '✅ Pass' || '❌ Fail' }} |" >> $GITHUB_STEP_SUMMARY
```

**5. Upload JSON Artifacts:**

```yaml
- name: Upload Test Reports
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: test-reports
    path: |
      test-results.json
      lint-results.json
      playwright-report/results.json
    retention-days: 7
```

**6. Final Gate (fail if tests failed):**

```yaml
- name: Check Test Results
  if: always()
  run: |
    if [ "${{ steps.vitest.outcome }}" != "success" ] || [ "${{ steps.e2e.outcome }}" != "success" ]; then
      echo "Tests failed. See summary for details."
      exit 1
    fi
```

### Report Format

**Top-level summary:**

```markdown
# 📊 CI Pipeline Results

| Phase      | Status  |
| ---------- | ------- |
| Lint       | ✅ Pass |
| Format     | ✅ Pass |
| Unit Tests | ❌ Fail |
| E2E Tests  | ✅ Pass |
| Build      | ✅ Pass |
```

**Phase-specific summaries with collapsible details:**

```markdown
## 🧪 Unit Tests

| Metric | Count |
| ------ | ----- |
| Total  | 48    |
| Passed | 45 ✅ |
| Failed | 3 ❌  |

<details>
<summary>❌ Failed Tests (3)</summary>

- `should parse markdown with missing fields` in `__tests__/lib/markdown-parser.test.ts`
- `should handle invalid fit values` in `__tests__/lib/utils.test.ts`
- `should validate job schema correctly` in `__tests__/lib/ai/types.test.ts`

</details>
```

### Edge Cases Handled

1. **JSON parsing failures:** Check file exists and is valid JSON before parsing
2. **No tests run:** Handle zero counts gracefully
3. **Partial failures:** Run all phases even if one fails (continue-on-error)
4. **Reporter compatibility:** Dual reporters ensure console logs remain readable

## Implementation Steps

1. ✅ Design validated
2. Update `.github/workflows/ci.yml` with enhanced reporting
3. Update `.gitignore` to exclude `test-results.json`, `lint-results.json`
4. Test on feature branch
5. Iterate on summary format if needed
6. Merge to main

## Testing Strategy

1. **Local testing:** Run `pnpm test --reporter=json --reporter=default` to verify JSON output
2. **CI testing:** Push to feature branch, verify summary in GitHub Actions UI
3. **Failure testing:** Intentionally break a test, verify failed test appears in summary
4. **Edge case testing:** Remove test files, verify "no tests" message appears

## Success Criteria

- ✅ Summary appears in GitHub Actions "Summary" tab
- ✅ Failed tests show file names and test names
- ✅ Collapsible sections work correctly
- ✅ Existing Codecov integration still works
- ✅ Playwright reports still upload on E2E failure
- ✅ Build fails appropriately when tests fail
- ✅ Warnings visible but don't block merge
- ✅ Report generation adds <5s to CI time

## Maintenance

**No ongoing maintenance required:**

- No custom scripts to update
- Uses pre-installed tools (`jq`)
- JSON formats stable across Vitest/Playwright versions
- GitHub Actions `$GITHUB_STEP_SUMMARY` is stable API

## Future Enhancements (Optional)

1. **Coverage trends:** Track coverage changes over time
2. **Performance benchmarks:** Show test execution time trends
3. **Flaky test detection:** Flag tests that intermittently fail
4. **Slack notifications:** Send summary to Slack on failure

## References

- Vitest JSON Reporter: https://vitest.dev/guide/reporters.html#json-reporter
- Playwright JSON Reporter: https://playwright.dev/docs/test-reporters#json-reporter
- ESLint JSON Format: https://eslint.org/docs/latest/use/formatters/#json
- GitHub Actions Job Summaries: https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#adding-a-job-summary
