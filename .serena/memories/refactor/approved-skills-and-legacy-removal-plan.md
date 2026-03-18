# Refactor Plan: approvedSkills + Legacy Context Removal

## Status: APPROVED, ready to implement

## Problem Summary
Three issues in the AI resume generation pipeline:

1. **approvedSkills never reaches the prompt**: `personalizeSkills()` (resume-generator.ts:98) receives `approvedSkills` but `buildSkillsPrompt()` (resume-prompts.ts:653) is called without it (resume-generator.ts:110). The LLM never knows about approved skills. They're only used post-LLM for validation (line 124).

2. **Dual instruction sources**: Every prompt builder injects BOTH `buildProfileBlock(jobProfile)` (new system) AND `getXxxContextInstructions(jobProfile.legacyContext, language)` (old system from context-specific-instructions.ts). Creates redundancy and conflict risk.

3. **Tests don't verify skills/projects prompt integration**: Tests mock `buildSkillsPrompt` and `buildProjectsPrompt` as simple strings, never verifying correct arguments are passed.

## Approved Plan (4 Batches)

### Batch A — Pass approvedSkills to prompt (core bug fix)
- `lib/ai/resume-prompts.ts`: Add `approvedSkills?: string[]` param to `buildSkillsPrompt()`, include in ALLOWED SKILLS section
- `lib/ai/resume-generator.ts`: Pass `approvedSkills` in the call at line 110

### Batch B — Remove legacy context instructions
- `lib/ai/resume-prompts.ts`: Remove all `getXxxContextInstructions()` calls from 3 prompt builders
- `lib/ai/context-specific-instructions.ts`: DELETE entire file
- `lib/ai/job-profile.ts`: Remove `legacyContext` field from `JobProfile`, remove `resolveLegacyContext()`, remove mapping in `buildJobProfile()`

### Batch C — Enrich buildProfileBlock to replace legacy
- `lib/ai/job-profile.ts`: Add `skill_reordering_hints`, `project_reframing_hints`, `summary_structure_hints` to JobProfile
- `lib/ai/resume-prompts.ts`: Render new hints in `buildProfileBlock()`

### Batch D — Tests
- `__tests__/lib/ai/resume-generator.test.ts`: Verify `buildSkillsPrompt` called with approvedSkills, verify jobProfile passed
- New `__tests__/lib/ai/resume-prompts.test.ts`: Test prompt builders with/without approvedSkills, verify no legacy context in output

### Execution Order: A → C → B → D

## Key Files
- `lib/ai/resume-generator.ts` — orchestrator (personalizeSkills, personalizeProjects, personalizeSummary, generateTailoredResume)
- `lib/ai/resume-prompts.ts` — prompt builders (buildSummaryPrompt, buildSkillsPrompt, buildProjectsPrompt, buildProfileBlock)
- `lib/ai/context-specific-instructions.ts` — legacy context (TO BE DELETED)
- `lib/ai/job-profile.ts` — JobProfile interface + buildJobProfile()
- `lib/ai/user-preferences.ts` — mergeSystemInstruction()
- `__tests__/lib/ai/resume-generator.test.ts` — existing tests

## User Context
- No saved jobs yet, so no backward compatibility needed
- User wants ZERO legacy logic in the project
- Domain-specific rules from context-specific-instructions.ts should be migrated into the profile system, not just dropped
