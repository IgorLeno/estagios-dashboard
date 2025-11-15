# Claude Code Instructions for estagios-dashboard

### Test-Driven Development (TDD)

When implementing features or fixing bugs:

1. **RED**: Write a failing test first

2. **GREEN**: Make the test pass with minimal code

3. **REFACTOR**: Improve code while keeping tests green

### Systematic Debugging

When debugging issues:

1. **Reproduce**: Confirm the issue consistently

2. **Isolate**: Find the root cause

3. **Fix**: Create failing test, then fix

4. **Verify**: Ensure no regressions

### Verification Before Completion

Before declaring work complete:

- [ ] All tests pass

- [ ] Code coverage maintained or improved

- [ ] No console errors

- [ ] Functionality verified manually if UI change

- [ ] Documentation updated if needed

### Planning Complex Changes

For large refactors or redesigns:

1. **Brainstorm**: Identify all requirements and edge cases

2. **Plan**: Break into small, testable increments

3. **Execute**: Implement in batches with checkpoints

4. **Verify**: Test after each batch

## Current Project Context

### Recent Completed Work

- ✅ All 81 tests passing (date-utils fully updated)

- ✅ Complete visual redesign following reference model (2816023.jpg)

- ✅ Removed hora_inicio customization (fixed to 00:00 midnight)

- ✅ Gradient color system for goal progress (red→orange→yellow→green)

- ✅ Line chart for 7-day vacancy history (Recharts implementation)

- ✅ Sidebar redesign: Dark gray with cyan accents, 256px width

### Current System

- Day starts at midnight (00:00) using standard calendar
- Visual theme: Purple primary (#7B3FED), Cyan accent (#00D4FF)
- Sidebar navigation with icons + text labels
- Modern minimalist design with white cards on gray background

### Testing Standards

- Target: 100% coverage on lib/ utilities

- Framework: Vitest + React Testing Library

- E2E: Playwright

### Code Quality

- Linting: ESLint + Prettier

- CI/CD: GitHub Actions

- Coverage: Codecov
