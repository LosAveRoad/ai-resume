# Resume editor and PDF export spike

Tested on 2026-08-16 on Windows.

## Goal

Evaluate whether an existing open-source project can provide all of these pieces:

1. structured resume editing in a localhost web UI;
2. adjustable font size, line height, margins, and section order;
3. HTML/CSS rendering;
4. deterministic CLI PDF export;
5. agent-friendly local files.

## Candidates

### resuml 3.2.0

- Source: <https://github.com/phoinixi/resuml>
- License: ISC
- Data: YAML mapped to JSON Resume
- Rendering: JSON Resume HTML themes
- Export: Playwright/Chromium
- Agent integration: CLI and MCP
- Editor: the hosted `resuml.app` has a good structured form editor and live iframe preview.

The cloned public repository contains the CLI, MCP server, ATS helpers, and a
preview-only development server. It does not contain the hosted form editor's
frontend source, so the editor cannot currently be reused from this repository.

Local findings:

- Schema validation and Chinese HTML/PDF rendering work.
- `jsonresume-theme-stackoverflow` exported successfully.
- The test resume produced two pages; page two contained only one orphaned award
  sentence and the certificate section. This is exactly the type of problem an
  agent needs to see visually.
- PDF text extraction returned several CJK radicals in place of ordinary Chinese
  characters. Visual rendering looked correct, but this is unsafe for Chinese ATS
  parsing and means explicit CJK font embedding must be tested.
- The latest `jsonresume-theme-even` failed to load through resuml's CommonJS
  loader because one of the theme dependencies is ESM-only.
- On Windows, failed theme loading falls through to auto-install via `spawnSync
  npm`, which returned `ENOENT`; it needs `npm.cmd` or a shell-independent package
  installer.
- The CLI exposes margins but not font size or line height, and its output is not
  designed as a stable JSON interface.
- JSON Resume does not model the desired Chinese section topology directly. In
  particular, work and internships share `work`, while self-evaluation and custom
  sections depend on theme-specific mappings.

Test input: [`resuml/resume.zh-CN.yaml`](resuml/resume.zh-CN.yaml)

## Oh My CV

- Source: <https://github.com/Renovamen/oh-my-cv>
- App license: GPL-3.0
- Editor: Monaco Markdown and custom CSS
- Storage: browser-local storage
- Preview: automatic DOM pagination
- Export: browser `window.print()`

Its editing toolbar already provides the exact layout controls we need: A4/Letter,
font family, CJK font, font size, horizontal/vertical margins, paragraph spacing,
and line height. Its `@ohmycv/vue-smart-pages` pagination package is separately
MIT-licensed.

It is not a structured resume editor, does not provide deterministic CLI export,
and uses Vue/Nuxt rather than the proposed React stack. The pagination algorithm
only distributes top-level DOM children, so nested resume items still need explicit
fragmentation rules.

## Reactive Resume v5

- Source: <https://github.com/amruthpillai/reactive-resume>
- License: MIT
- Editor: mature structured React application
- Export: `@react-pdf/renderer`, not HTML/CSS printing
- Architecture: full-stack app with PostgreSQL, authentication, API, MCP, skills,
  document export, and many packages

It is the strongest complete product reference and a direct competitor, but it is
too large for a local CLI-first spike and its PDF renderer takes us away from the
HTML/CSS requirement.

## OpenResume and Resumify

Both offer reusable examples of local structured forms and real-time previews.
Both generate PDFs using `@react-pdf/renderer`, so their preview/export components
do not validate the HTML-to-PDF approach. OpenResume is AGPL-3.0; Resumify is MIT
but very young.

## JSON Resume and Paged.js

JSON Resume is a useful compatibility/import format and theme ecosystem, not a
sufficient internal schema. Its `resumed` CLI already renders themes to HTML and
uses Puppeteer for PDF export.

Paged.js is MIT-licensed and provides browser pagination from HTML/CSS plus a
Puppeteer PDF CLI. It is the most relevant existing component for the next local
spike, but should be treated as an optional pagination adapter rather than the
resume data model or editor.

## Conclusion

No existing project satisfies all five requirements as a reusable unit.

Recommended next spike:

1. build a small structured React editor with only the Xiaolin-style sections;
2. render the schema to semantic HTML;
3. compare native Chromium print layout with Paged.js preview;
4. expose layout values as CSS variables;
5. export with Playwright and render every PDF page to PNG for agent inspection;
6. embed a known CJK font and verify both visual output and extracted Unicode.

Do not fork Reactive Resume, OpenResume, or Oh My CV as the product base. Reuse
small MIT/ISC components and the proven interaction patterns instead.
