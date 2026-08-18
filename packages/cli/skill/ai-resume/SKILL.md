---
name: ai-resume
description: Create, tailor, visually inspect, and export local structured resumes with the AI Resume CLI. Use when building a resume from a material bank, adapting one candidate's facts for different job descriptions, editing resume JSON, checking whether an A4 resume is actually one page, or producing a visually verified PDF for Codex, Claude Code, or DeepSeek Harness workflows.
---

# AI Resume

Use the shared localhost workspace as the source of truth for browser work: its `.ai-resume-data/workspace.json` stores the resume library and `.ai-resume-data/materials.md` stores the material bank. File-based workspaces created by `ai-resume init` remain supported and use `resume/materials.md` plus `resume/resume.json`. Let the coding agent make content and layout decisions after inspecting rendered pages; never delegate those decisions to an automatic fit command.

## Start or locate the workspace

1. Run `ai-resume dev` to start the shared local workspace, or `ai-resume init .` for a file-based workspace.
2. Read `.ai-resume-data/materials.md` and `.ai-resume-data/workspace.json` when working through localhost; read `resume/materials.md` and the current `resume/resume.json` for a file-based workspace.
3. Read [references/schema.md](references/schema.md) before creating or substantially restructuring resume JSON.
4. Treat all claims, dates, metrics, links, education, and skills in the material bank as factual boundaries. Ask for missing facts instead of inventing them.

## Shared local workspace

1. The browser UI talks to `GET/PUT /api/workspace` on the same localhost server. Do not treat browser `localStorage` as the canonical library.
2. The server writes `.ai-resume-data/workspace.json` and `.ai-resume-data/materials.md`; these files are shared by every browser that opens the same localhost port.
3. On first load, migrate an older browser library into the shared workspace only when the server library is empty. After migration, use the server copy so Edge, Chrome, and the in-app browser see the same records.
4. Keep `.ai-resume-data/` local and uncommitted. For backups or team review, copy the workspace files explicitly or use the CLI file workflow.

## Tailor the document

1. Identify the target role's most important responsibilities, evidence, and vocabulary.
2. Select only supported material that demonstrates those requirements.
3. Rewrite for specificity and scanning speed while preserving the meaning of every fact.
4. Reorder, hide, add, or remove sections and entries in `resume/resume.json` as needed. Create separate JSON variants for materially different directions such as Agent engineering and backend engineering.
5. Use Markdown only inside `text` and `details` fields. Prefer short `-` or `1.` lists, selective `**bold**`, inline code, and links.
6. Run `ai-resume validate <file>` after every structural edit.

## Visually refine the result

1. Run `ai-resume render <file> --out <preview.png>`.
2. Read the reported page utilization, then open and inspect the rendered PNG with native visual ability. Check page count, clipping, density, hierarchy, awkward wrapping, whitespace, alignment, and whether the strongest evidence is easy to find.
3. Treat utilization below 90% as an underfill warning, not an automatic failure. Prefer adding evidence-backed project context, ownership decisions, implementation details, quality controls, and outcomes. If the facts are already complete, relax the layout with a readable font size, line height, spacing, or margins. Never pad the page with repetition or unsupported claims.
4. Decide what to change. Prefer removing weak or redundant content and tightening language before shrinking type. You may switch `presentation.activeTemplate` between `numbered-rail`, `classic-burgundy`, and `campus-navy`. Adjust `fontSize`, `lineHeight`, `sectionGap`, `marginX`, or `marginY` under `presentation.layouts[activeTemplate]` only when the visual result remains comfortably readable.
5. Render and inspect again. Aim for 95–100% utilization on a one-page resume. Treat 90–94% as requiring another whitespace review, while letting visual quality and factual strength override the number. Do not claim a sound one-page result merely because validation succeeds or the CLI reports a page count.
6. Never search for or invoke `fit`, `fit 1`, `compress`, or another automatic one-page command; this workflow intentionally does not provide one.

## Export and verify

1. Run `ai-resume export <file> --out <resume.pdf>` only after the PNG is visually sound.
2. Verify that the reported PDF page count matches the intended result.
3. When the surrounding harness can inspect PDFs, render or open the PDF once more and check that fonts, links, line breaks, and page boundaries survived export.
4. Report the source JSON, preview PNG, final PDF, target role, and final page count.

## Platform setup

Run `ai-resume install-skill --agent <agent> --scope project` to install this skill for a repository. Use `codex`, `claude-code`, `deepseek-harness`, or `all`. Read [references/platforms.md](references/platforms.md) for discovery paths and invocation syntax.
