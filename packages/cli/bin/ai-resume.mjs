#!/usr/bin/env node

import { run } from "../src/cli.mjs";

run(process.argv.slice(2)).catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`ai-resume: ${message}\n`);
  process.exitCode = 1;
});
