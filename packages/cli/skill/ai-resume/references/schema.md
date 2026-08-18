# Structured resume schema

The editor consumes JSON version 3. Keep every listed property present, even when its value is empty.

```json
{
  "version": 3,
  "header": {
    "name": "string",
    "role": "string",
    "phone": "string",
    "email": "string",
    "location": "string",
    "website": "string",
    "photo": null
  },
  "presentation": {
    "activeTemplate": "numbered-rail",
    "layouts": {
      "numbered-rail": {
        "fontSize": 9.25,
        "lineHeight": 1.45,
        "marginX": 11,
        "marginY": 10,
        "sectionGap": 6
      },
      "classic-burgundy": {
        "fontSize": 8.5,
        "lineHeight": 1.38,
        "marginX": 15,
        "marginY": 8,
        "sectionGap": 3
      },
      "campus-navy": {
        "fontSize": 8.5,
        "lineHeight": 1.32,
        "marginX": 10,
        "marginY": 8,
        "sectionGap": 3
      }
    }
  },
  "sections": []
}
```

Layout ranges enforced by the CLI and editor:

- `fontSize`: 8.25–11.5 pt
- `lineHeight`: 1.2–1.7
- `marginX`, `marginY`: 8–24 mm
- `sectionGap`: 3–16 px

`activeTemplate` must be `numbered-rail`, `classic-burgundy`, or `campus-navy`. Each template keeps its own layout values so switching away and back does not discard visual tuning. Modify the layout under `presentation.layouts[activeTemplate]` when visually refining the active template.

`header.photo` is either `null` or an object containing an image data URL and crop state:

```json
{
  "src": "data:image/webp;base64,...",
  "positionX": 50,
  "positionY": 50,
  "zoom": 1
}
```

`positionX` and `positionY` range from 0–100; `zoom` ranges from 1–2. The same photo crop is shared by every template while each template controls its frame size and grayscale treatment.

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
