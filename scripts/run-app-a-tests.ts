import { readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const roots = ["server/app-a", "src/app-a", "src/shared"];

function collectTests(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectTests(path);
    return entry.isFile() && entry.name.endsWith(".test.ts") ? [path] : [];
  });
}

const tests = roots.flatMap(collectTests).sort();

if (tests.length === 0) {
  console.error("No App A test files were found.");
  process.exit(1);
}

for (const test of tests) {
  console.log(`\n▶ ${test}`);
  const result = spawnSync(process.execPath, ["--import", "tsx", test], {
    stdio: "inherit",
  });

  if (result.error) {
    console.error(`Could not run ${test}:`, result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`\n✓ App A verification suite passed (${tests.length} files).`);
