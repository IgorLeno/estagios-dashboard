#!/bin/bash

# Test script to simulate GitHub Actions CI summary generation
# Usage: ./scripts/test-ci-summary.sh

OUTPUT_FILE="test-summary.md"
rm -f "$OUTPUT_FILE"

echo "Generating test CI summary..."

# E2E Tests Section
echo "## 🎭 E2E Tests" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

if [ -f playwright-report/results.json ] && jq empty playwright-report/results.json 2>/dev/null; then
  # Parse Playwright JSON report structure
  # Supports both flat and nested structures:
  # - Flat: { suites: [{ specs: [...] }] }
  # - Nested: { suites: [{ suites: [{ specs: [...] }] }] }
  TOTAL=$(jq '[.suites[].specs[]?, .suites[].suites[]?.specs[]? // empty] | length' playwright-report/results.json)
  PASSED=$(jq '[.suites[].specs[]?, .suites[].suites[]?.specs[]? // empty | select(.ok == true)] | length' playwright-report/results.json)
  FAILED=$(jq '[.suites[].specs[]?, .suites[].suites[]?.specs[]? // empty | select(.ok == false)] | length' playwright-report/results.json)
  SKIPPED=$(jq '[.suites[].specs[]?, .suites[].suites[]?.specs[]? // empty | select(.tests[]?.status == "skipped")] | length' playwright-report/results.json)

  echo "| Metric | Count |" >> "$OUTPUT_FILE"
  echo "|--------|-------|" >> "$OUTPUT_FILE"
  echo "| Total | $TOTAL |" >> "$OUTPUT_FILE"
  echo "| Passed | $PASSED ✅ |" >> "$OUTPUT_FILE"
  echo "| Failed | $FAILED ❌ |" >> "$OUTPUT_FILE"
  echo "| Skipped | $SKIPPED ⏭️ |" >> "$OUTPUT_FILE"
  echo "" >> "$OUTPUT_FILE"

  if [ "$FAILED" -gt 0 ]; then
    echo "<details><summary>▶ ❌ Failed Tests ($FAILED)</summary>" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"

    # Group failed tests by file (supports both flat and nested structures)
    # Flat structure: .suites[].specs[]
    jq -r '.suites[] | select(.specs | any(.ok == false)) | .file as $file | "### \($file)\n" + ([.specs[] | select(.ok == false) | "- \(.title)"] | join("\n")) + "\n"' playwright-report/results.json >> "$OUTPUT_FILE" 2>/dev/null || true

    # Nested structure: .suites[].suites[].specs[]
    jq -r '.suites[] | .suites[]? // empty | select(.specs | any(.ok == false)) | .title as $suite | "### \($suite)\n" + ([.specs[] | select(.ok == false) | "- \(.title)"] | join("\n")) + "\n"' playwright-report/results.json >> "$OUTPUT_FILE" 2>/dev/null || true

    echo "" >> "$OUTPUT_FILE"
    echo "</details>" >> "$OUTPUT_FILE"
  fi
else
  echo "⚠️ Could not parse E2E test results" >> "$OUTPUT_FILE"
fi

echo "" >> "$OUTPUT_FILE"
echo "---" >> "$OUTPUT_FILE"

echo "✅ Test summary generated: $OUTPUT_FILE"
echo ""
echo "Preview:"
cat "$OUTPUT_FILE"
