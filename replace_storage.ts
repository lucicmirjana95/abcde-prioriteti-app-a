import fs from "fs";
import path from "path";

function walk(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else {
      if (fullPath.endsWith(".tsx") || fullPath.endsWith(".ts")) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const files = walk("./src");
let changedFiles = 0;

files.forEach((file) => {
  let content = fs.readFileSync(file, "utf8");
  if (content.includes("localStorage")) {
    // Only replace if it's not already safeStorage, and skip replacing window.localStorage to safeStorage if we want to implement safeStorage using window.localStorage inside lib/safeStorage.ts
    content = content.replace(/\bwindow\.localStorage\b/g, "safeStorage");
    content = content.replace(/\blocalStorage\b/g, "safeStorage");
    fs.writeFileSync(file, content);
    changedFiles++;
    console.log(`Updated ${file}`);
  }
});

console.log(`Finished. Updated ${changedFiles} files.`);
