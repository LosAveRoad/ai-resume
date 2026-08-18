# Structured resume schema

The editor consumes JSON version 2. Keep every listed property present, even when its value is empty.

```json
{
  "version": 2,
  "header": {
    "name": "string",
    "role": "string",
    "phone": "string",
    "email": "string",
    "location": "string",
    "website": "string"
  },
  "layout": {
    "fontSize": 10,
    "lineHeight": 1.5,
    "marginX": 14,
    "marginY": 14,
    "sectionGap": 8
  },
  "sections": []
}
```

Layout ranges enforced by the CLI and editor:

- `fontSize`: 8.25–11.5 pt
- `lineHeight`: 1.2–1.7
- `marginX`, `marginY`: 10–24 mm
- `sectionGap`: 4–16 px

Each section has this shape:

```json
{
  "id": "projects",
  "title": "项目经历",
  "kind": "text or entries",
  "visible": true,
  "fixed": true,
  "text": "Markdown for text sections",
  "entries": []
}
```

Use `kind: "text"` for skills, honors, summaries, and similar prose. Put the Markdown in `text` and keep `entries` as an empty array.

Use `kind: "entries"` for education, work, internships, and projects. Keep `text` as an empty string. Each entry has this shape:

```json
{
  "id": "unique-entry-id",
  "title": "Company, school, or project",
  "subtitle": "Role, major, or responsibility",
  "startDate": "2024.01",
  "endDate": "至今",
  "location": "上海",
  "details": "- First evidence-backed point\n- Second evidence-backed point"
}
```

Section IDs must be unique across the document. Entry IDs must be unique within their section. The conventional fixed IDs are `education`, `skills`, `work`, `internship`, `projects`, `honors`, and `summary`; custom sections may use any other stable kebab-case ID.

Supported field-level Markdown is intentionally small:

- unordered lists beginning with `- ` or `* `
- ordered lists beginning with `1. ` or `1) `
- `**bold**`, `*italic*`, and inline code
- `[label](https://example.com)` links

Do not use document-level Markdown headings inside fields.
