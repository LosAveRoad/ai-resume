import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const HEADER_FIELDS = ["name", "role", "phone", "email", "location", "website"];
const ENTRY_FIELDS = ["id", "title", "subtitle", "startDate", "endDate", "location", "details"];
const LAYOUT_BOUNDS = {
  fontSize: [8.25, 11.5],
  lineHeight: [1.2, 1.7],
  marginX: [10, 24],
  marginY: [10, 24],
  sectionGap: [4, 16],
};

export async function readResume(input, cwd = process.cwd()) {
  const file = resolve(cwd, input);
  let source;
  try {
    source = await readFile(file, "utf8");
  } catch (error) {
    if (error && error.code === "ENOENT") throw new Error(`resume file not found: ${file}`);
    throw error;
  }

  let resume;
  try {
    resume = JSON.parse(source);
  } catch (error) {
    throw new Error(`invalid JSON in ${file}: ${error.message}`);
  }
  return { file, resume, errors: validateResume(resume) };
}

export function validateResume(value) {
  const errors = [];
  if (!isObject(value)) return ["$: expected an object"];
  if (value.version !== 2) errors.push("$.version: expected 2");

  if (!isObject(value.header)) {
    errors.push("$.header: expected an object");
  } else {
    for (const field of HEADER_FIELDS) requireString(value.header[field], `$.header.${field}`, errors);
  }

  if (!isObject(value.layout)) {
    errors.push("$.layout: expected an object");
  } else {
    for (const [field, [minimum, maximum]] of Object.entries(LAYOUT_BOUNDS)) {
      const number = value.layout[field];
      if (!Number.isFinite(number)) {
        errors.push(`$.layout.${field}: expected a finite number`);
      } else if (number < minimum || number > maximum) {
        errors.push(`$.layout.${field}: expected ${minimum}–${maximum}, received ${number}`);
      }
    }
  }

  if (!Array.isArray(value.sections)) {
    errors.push("$.sections: expected an array");
    return errors;
  }

  const sectionIds = new Set();
  value.sections.forEach((section, sectionIndex) => {
    const path = `$.sections[${sectionIndex}]`;
    if (!isObject(section)) {
      errors.push(`${path}: expected an object`);
      return;
    }
    requireNonEmptyString(section.id, `${path}.id`, errors);
    if (typeof section.id === "string" && section.id) {
      if (sectionIds.has(section.id)) errors.push(`${path}.id: duplicate id ${JSON.stringify(section.id)}`);
      sectionIds.add(section.id);
    }
    requireNonEmptyString(section.title, `${path}.title`, errors);
    if (section.kind !== "text" && section.kind !== "entries") {
      errors.push(`${path}.kind: expected "text" or "entries"`);
    }
    requireBoolean(section.visible, `${path}.visible`, errors);
    requireBoolean(section.fixed, `${path}.fixed`, errors);
    requireString(section.text, `${path}.text`, errors);
    if (!Array.isArray(section.entries)) {
      errors.push(`${path}.entries: expected an array`);
      return;
    }

    const entryIds = new Set();
    section.entries.forEach((entry, entryIndex) => {
      const entryPath = `${path}.entries[${entryIndex}]`;
      if (!isObject(entry)) {
        errors.push(`${entryPath}: expected an object`);
        return;
      }
      for (const field of ENTRY_FIELDS) requireString(entry[field], `${entryPath}.${field}`, errors);
      if (typeof entry.id === "string" && entry.id) {
        if (entryIds.has(entry.id)) errors.push(`${entryPath}.id: duplicate id ${JSON.stringify(entry.id)}`);
        entryIds.add(entry.id);
      }
    });
  });
  return errors;
}

export function inspectResume(resume, file) {
  const visibleSections = resume.sections.filter((section) => section.visible);
  const entries = visibleSections.reduce((sum, section) => sum + section.entries.length, 0);
  const markdownCharacters = visibleSections.reduce((sum, section) => (
    sum + section.text.length + section.entries.reduce((entrySum, entry) => entrySum + entry.details.length, 0)
  ), 0);
  return {
    file,
    name: resume.header.name,
    role: resume.header.role,
    layout: resume.layout,
    sections: resume.sections.map((section) => ({
      id: section.id,
      title: section.title,
      kind: section.kind,
      visible: section.visible,
      entries: section.entries.length,
    })),
    totals: {
      sections: resume.sections.length,
      visibleSections: visibleSections.length,
      visibleEntries: entries,
      markdownCharacters,
    },
  };
}

export function formatValidationErrors(errors) {
  return errors.map((error) => `  - ${error}`).join("\n");
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireString(value, path, errors) {
  if (typeof value !== "string") errors.push(`${path}: expected a string`);
}

function requireNonEmptyString(value, path, errors) {
  requireString(value, path, errors);
  if (typeof value === "string" && !value.trim()) errors.push(`${path}: must not be empty`);
}

function requireBoolean(value, path, errors) {
  if (typeof value !== "boolean") errors.push(`${path}: expected a boolean`);
}
