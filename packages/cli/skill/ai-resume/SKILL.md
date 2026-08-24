---
name: ai-resume
description: Create, tailor, visually inspect, and export local structured resumes with the AI Resume CLI. Use when building a resume from a material bank, adapting one candidate's facts for different job descriptions, editing resume JSON, checking whether an A4 resume is actually one page, or producing a visually verified PDF for Codex, Claude Code, or DeepSeek Harness workflows.
---

# AI Resume

Use the shared local workspace as the source of truth for browser and CLI work. localhost is only the local API bridge; the canonical files live under `./airesume/`: `materials.md`, `resumes/<resume-id>.json`, and `output/<resume-id>/`. Let the coding agent make content and layout decisions after inspecting rendered pages; never delegate those decisions to an automatic fit command.

## Start or locate the workspace

1. Run `ai-resume dev` to start the shared local workspace, or `ai-resume init .` to create `./airesume/`.
2. Read `airesume/materials.md` and use `ai-resume workspace list` to find the current resume IDs.
3. Read [references/schema.md](references/schema.md) before creating or substantially restructuring resume JSON.
4. Treat all claims, dates, metrics, links, education, and skills in the material bank as factual boundaries. Ask for missing facts instead of inventing them.

## Shared local workspace

1. The browser UI talks to record-level local APIs on the same localhost server. Do not treat browser `localStorage` as the canonical library.
2. The server reads and writes `./airesume/materials.md` and one JSON file per resume under `./airesume/resumes/`.
3. Each API write uses a revision check. If the browser reports a conflict, reload the record before editing again; never overwrite a newer Agent change blindly.
4. Older `.ai-resume-data/` workspaces are migrated once into `./airesume/` without deleting the source. Keep `./airesume/` local unless the user explicitly wants version control.

## Tailor the document

1. Identify the target role's most important responsibilities, evidence, and vocabulary.
2. Select only supported material that demonstrates those requirements.
3. Rewrite for specificity and scanning speed while preserving the meaning of every fact.
4. Use `ai-resume workspace clone <resume-id> --title "..."` to create a separate variant for materially different directions such as Agent engineering and backend engineering. Edit the cloned file under `airesume/resumes/`.
5. Use Markdown only inside `text` and `details` fields. Prefer short `-` or `1.` lists, selective `**bold**`, inline code, and links.
6. Run `ai-resume validate airesume/resumes/<resume-id>.json` after every structural edit.

## Visually refine the result

1. Run `ai-resume workspace render <resume-id> --out airesume/output/<resume-id>/preview.png`.
2. Read the reported page utilization, then open and inspect the rendered PNG with native visual ability. Check page count, clipping, density, hierarchy, awkward wrapping, whitespace, alignment, and whether the strongest evidence is easy to find.
3. Treat utilization below 90% as an underfill warning, not an automatic failure. Prefer adding evidence-backed project context, ownership decisions, implementation details, quality controls, and outcomes. If the facts are already complete, relax the layout with a readable font size, line height, spacing, or margins. Never pad the page with repetition or unsupported claims.
4. Decide what to change. Prefer removing weak or redundant content and tightening language before shrinking type. You may switch `presentation.activeTemplate` between `numbered-rail`, `classic-burgundy`, `campus-navy`, `soft-gray`, and `blue-line`. New resumes use `soft-gray` by default. Adjust `fontSize`, `lineHeight`, `sectionGap`, `marginX`, or `marginY` under `presentation.layouts[activeTemplate]` only when the visual result remains comfortably readable.
5. Render and inspect again. Aim for 95–100% utilization on a one-page resume. Treat 90–94% as requiring another whitespace review, while letting visual quality and factual strength override the number. Do not claim a sound one-page result merely because validation succeeds or the CLI reports a page count.
6. Never search for or invoke `fit`, `fit 1`, `compress`, or another automatic one-page command; this workflow intentionally does not provide one.

## Export and verify

1. Run `ai-resume workspace export <resume-id> --out airesume/output/<resume-id>/resume.pdf` only after the PNG is visually sound. The CLI uses Playwright for deterministic A4 output.
2. Verify that the reported PDF page count matches the intended result.
3. When the surrounding harness can inspect PDFs, render or open the PDF once more and check that fonts, links, line breaks, and page boundaries survived export.
4. Report the source JSON, preview PNG, final PDF, target role, and final page count.

## Platform setup

Run `ai-resume install-skill --agent <agent> --scope project` to install this skill for a repository. Use `codex`, `claude-code`, `deepseek-harness`, or `all`. Read [references/platforms.md](references/platforms.md) for discovery paths and invocation syntax.
