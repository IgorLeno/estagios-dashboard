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
  # Structure: { suites: [{ file: "...", specs: [{ title: "...", ok: true/false, ... }] }] }
  TOTAL=$(jq '[.suites[].specs[]] | length' playwright-report/results.json)
  PASSED=$(jq '[.suites[].specs[] | select(.ok == true)] | length' playwright-report/results.json)
  FAILED=$(jq '[.suites[].specs[] | select(.ok == false)] | length' playwright-report/results.json)
  SKIPPED=$(jq '[.suites[].specs[].tests[] | select(.status == "skipped")] | length' playwright-report/results.json)

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

    # Group failed tests by file
    jq -r '.suites[] | select(.specs | any(.ok == false)) | .file as $file | "### \($file)\n" + ([.specs[] | select(.ok == false) | "- \(.title)"] | join("\n")) + "\n"' playwright-report/results.json >> "$OUTPUT_FILE"

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
