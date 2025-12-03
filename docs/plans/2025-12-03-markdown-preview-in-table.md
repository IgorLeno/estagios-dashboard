# Markdown Preview in Table Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace plain text rendering of `vaga.observacoes` in the expanded table row with proper Markdown formatting using the existing `MarkdownPreview` component.

**Architecture:** Modify `components/vaga-table-row.tsx` to use `<MarkdownPreview>` instead of `<p>` tag for rendering `vaga.observacoes` field. This aligns with the pattern already used in `app/vaga/[id]/page.tsx` for the same content.

**Tech Stack:** React 19, TypeScript, existing `MarkdownPreview` component from `components/ui/markdown-preview.tsx`

---

## Task 1: Import MarkdownPreview Component

**Files:**
- Modify: `components/vaga-table-row.tsx:1-26` (imports section)

**Step 1: Add MarkdownPreview import**

Add the import statement after the existing component imports:

```typescript
import { StarRating } from "@/components/ui/star-rating"
import { MarkdownPreview } from "@/components/ui/markdown-preview"
import { cn, toSafeNumber, getStatusVariant } from "@/lib/utils"
```

**Expected:** Import added, no TypeScript errors

**Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No errors related to MarkdownPreview import

**Step 3: Commit**

```bash
git add components/vaga-table-row.tsx
git commit -m "feat: import MarkdownPreview component in vaga-table-row"
```

---

## Task 2: Replace Plain Text with MarkdownPreview

**Files:**
- Modify: `components/vaga-table-row.tsx:116-138` (observacoes rendering section)

**Step 1: Replace the plain text paragraph with MarkdownPreview**

**Current code (lines 116-138):**

```tsx
{vaga.observacoes ? (
  <div className="prose prose-sm max-w-none">
    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{vaga.observacoes}</p>

    {/* Se houver link para análise completa */}
    {vaga.arquivo_analise_url && (
      <Button
        variant="link"
        size="sm"
        className="inline-flex items-center gap-1 text-primary hover:text-primary/80 text-sm mt-3 px-0"
        onClick={(e) => {
          e.stopPropagation()
          downloadPdf(vaga.arquivo_analise_url, "analise-vaga.md")
        }}
      >
        <ExternalLink className="h-4 w-4" />
        Ver análise completa
      </Button>
    )}
  </div>
) : (
  <p className="text-sm text-muted-foreground italic">Nenhuma análise disponível para esta vaga.</p>
)}
```

**New code:**

```tsx
{vaga.observacoes ? (
  <div className="space-y-3">
    <MarkdownPreview
      content={vaga.observacoes}
      editable={false}
      className="max-h-[400px] overflow-y-auto"
    />

    {/* Se houver link para análise completa */}
    {vaga.arquivo_analise_url && (
      <Button
        variant="link"
        size="sm"
        className="inline-flex items-center gap-1 text-primary hover:text-primary/80 text-sm mt-3 px-0"
        onClick={(e) => {
          e.stopPropagation()
          downloadPdf(vaga.arquivo_analise_url, "analise-vaga.md")
        }}
      >
        <ExternalLink className="h-4 w-4" />
        Ver análise completa
      </Button>
    )}
  </div>
) : (
  <p className="text-sm text-muted-foreground italic">Nenhuma análise disponível para esta vaga.</p>
)}
```

**Changes:**
1. Removed `prose prose-sm max-w-none` classes from outer div (MarkdownPreview has its own prose styles)
2. Changed outer div to use `space-y-3` for consistent spacing
3. Replaced `<p>` tag with `<MarkdownPreview>` component
4. Added props: `content={vaga.observacoes}`, `editable={false}`, `className="max-h-[400px] overflow-y-auto"`
5. Kept the download button logic unchanged

**Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No TypeScript errors

**Step 3: Test in development**

Run: `pnpm dev`
Navigate to: `http://localhost:3000`
Action: Expand a vaga row that has `observacoes` content
Expected:
- Markdown content renders with proper formatting (headings, lists, bold text)
- Visual appearance matches the detail page styling
- Scrollbar appears if content exceeds 400px height
- Download button still works

**Step 4: Commit**

```bash
git add components/vaga-table-row.tsx
git commit -m "feat: render observacoes with MarkdownPreview in table row

- Replace plain text <p> with <MarkdownPreview> component
- Apply max-height constraint with overflow scroll
- Maintain consistent spacing and download button functionality
- Matches visual style from vaga detail page"
```

---

## Task 3: Verify Styling Consistency

**Files:**
- Verify: `app/globals.css:211-355` (markdown-preview styles)
- Verify: `components/ui/markdown-preview.tsx` (component implementation)

**Step 1: Check that styles are applied correctly**

**Action:** Visually compare expanded table row with detail page (`/vaga/[id]`)

**Verify these elements render identically:**
- H1 titles (`# Title`) → Purple color, larger font
- H2 sections (`## Section`) → Bold, proper spacing
- H3 subtitles (`### Subtitle`) → Medium weight
- Bold text (`**bold**`) → Proper font weight
- Lists (`- item`) → Bullet points with indentation
- Links (`[text](url)`) → Primary color, underline on hover
- Code (`\`code\``) → Monospace with background

**Expected:** All Markdown elements styled identically in both locations

**Step 2: Test responsive behavior**

**Actions:**
1. Expand multiple rows to check card stacking on mobile
2. Verify scroll works smoothly when content exceeds 400px
3. Check that card doesn't overflow on smaller screens

**Expected:** Layout remains clean and readable across all screen sizes

**Step 3: Document findings**

If any styling inconsistencies found, note them for follow-up task. Otherwise, proceed to verification.

---

## Task 4: Run Lint and Build

**Step 1: Run ESLint**

Run: `pnpm lint`
Expected: No linting errors in `vaga-table-row.tsx`

**Step 2: Fix any linting issues**

If errors found, run: `pnpm lint:fix`
Expected: Auto-fixable issues resolved

**Step 3: Run production build**

Run: `pnpm build`
Expected: Build succeeds without errors or warnings

**Step 4: Verify build output**

Check console output for:
- No TypeScript errors
- No unused imports warnings
- No accessibility warnings
- Successful static page generation

**Step 5: Final commit (if changes made)**

```bash
git add .
git commit -m "chore: fix linting issues in vaga-table-row"
```

---

## Task 5: Manual Verification Testing

**Step 1: Start development server**

Run: `pnpm dev`

**Step 2: Test with real data**

Navigate to: `http://localhost:3000`

**Test Cases:**

1. **Vaga with observacoes (Markdown content)**
   - Expand row
   - Verify: Markdown renders with headings, lists, bold text
   - Verify: Styling matches detail page
   - Verify: Scroll appears if content > 400px

2. **Vaga without observacoes**
   - Expand row
   - Verify: "Nenhuma análise disponível" message displays

3. **Vaga with observacoes + arquivo_analise_url**
   - Expand row
   - Verify: Download button appears and works
   - Click "Ver análise completa"
   - Verify: File downloads correctly

4. **Multiple expanded rows**
   - Expand 2-3 rows simultaneously
   - Verify: Each renders correctly without interference

5. **Responsive design**
   - Resize browser window (mobile, tablet, desktop)
   - Verify: Cards stack properly on mobile
   - Verify: Markdown content remains readable

**Expected:** All test cases pass

**Step 3: Document any issues**

If issues found, create follow-up tasks. Otherwise, mark verification complete.

---

## Task 6: Final Commit and Documentation

**Step 1: Verify git status**

Run: `git status`
Expected: All changes committed, working tree clean

**Step 2: Review commit history**

Run: `git log --oneline -5`
Expected: Clear, descriptive commit messages for this feature

**Step 3: Update CLAUDE.md (if needed)**

Check if `CLAUDE.md` needs updates to document this pattern for future reference.

**Files to check:**
- `components/CLAUDE.md` - Document MarkdownPreview usage in table rows

If update needed, add example:

```markdown
### Rendering Markdown in Tables

When displaying markdown content in expanded table rows, use `<MarkdownPreview>`:

\`\`\`tsx
<MarkdownPreview
  content={vaga.observacoes}
  editable={false}
  className="max-h-[400px] overflow-y-auto"
/>
\`\`\`

This ensures consistent styling with detail pages and proper markdown rendering.
```

**Step 4: Final verification commit (if documentation updated)**

```bash
git add components/CLAUDE.md
git commit -m "docs: add MarkdownPreview usage pattern for table rows"
```

**Step 5: Mark task complete**

Confirm with user that implementation matches expected visual result.

---

## Success Criteria

- [ ] MarkdownPreview component imported in vaga-table-row.tsx
- [ ] Plain text `<p>` replaced with `<MarkdownPreview>`
- [ ] Markdown renders with proper formatting (headings, lists, bold)
- [ ] Styling matches vaga detail page exactly
- [ ] Scroll works when content exceeds 400px
- [ ] Download button still functional
- [ ] No TypeScript errors
- [ ] ESLint passes
- [ ] Production build succeeds
- [ ] All manual test cases pass
- [ ] Documentation updated (if needed)
- [ ] All changes committed with clear messages

---

## Rollback Plan

If issues arise:

```bash
# Revert changes
git log --oneline -10  # Find commit before changes
git revert <commit-hash>

# Or reset to previous state
git reset --hard HEAD~N  # N = number of commits to undo
```

**Note:** Always test rollback in development before applying to production.
