import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const rootDirectory = process.cwd();
const ignoredDirectories = new Set([
  ".git",
  ".next",
  "coverage",
  "node_modules",
  "out",
]);
const ignoredFiles = new Set([
  "package-lock.json",
]);
const conflictMarkerPattern = /^(<<<<<<< |=======$|>>>>>>> )/m;
const textFilePattern = /\.(cjs|cts|css|js|json|jsx|md|mjs|mts|ts|tsx|yml|yaml)$/;

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) {
      continue;
    }

    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(absolutePath)));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (ignoredFiles.has(entry.name) || !textFilePattern.test(entry.name)) {
      continue;
    }

    files.push(absolutePath);
  }

  return files;
}

async function main() {
  const files = await collectFiles(rootDirectory);
  const conflictedFiles = [];

  for (const file of files) {
    const contents = await readFile(file, "utf8");

    if (conflictMarkerPattern.test(contents)) {
      conflictedFiles.push(path.relative(rootDirectory, file));
    }
  }

  if (conflictedFiles.length === 0) {
    return;
  }

  console.error("Unresolved merge conflict markers found:");

  conflictedFiles.forEach((file) => {
    console.error(`- ${file}`);
  });

  process.exitCode = 1;
}

await main();
