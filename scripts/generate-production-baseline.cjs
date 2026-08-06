const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const legacyDir = path.join(
  root,
  "supabase",
  "migrations_legacy",
  "season-1-development",
);
const activeDir = path.join(root, "supabase", "migrations");
const outputFile = path.join(
  activeDir,
  "20260806000000_season_1_v1_production_baseline.sql",
);

function splitSqlStatements(sql) {
  const statements = [];
  let current = "";
  let i = 0;
  let single = false;
  let double = false;
  let lineComment = false;
  let blockComment = false;
  let dollarTag = null;

  while (i < sql.length) {
    const char = sql[i];
    const next = sql[i + 1];

    if (lineComment) {
      current += char;
      if (char === "\n") lineComment = false;
      i += 1;
      continue;
    }

    if (blockComment) {
      current += char;
      if (char === "*" && next === "/") {
        current += next;
        blockComment = false;
        i += 2;
      } else {
        i += 1;
      }
      continue;
    }

    if (dollarTag) {
      current += char;
      if (sql.startsWith(dollarTag, i)) {
        current += dollarTag.slice(1);
        i += dollarTag.length;
        dollarTag = null;
      } else {
        i += 1;
      }
      continue;
    }

    if (single) {
      current += char;
      if (char === "'" && next === "'") {
        current += next;
        i += 2;
      } else {
        if (char === "'") single = false;
        i += 1;
      }
      continue;
    }

    if (double) {
      current += char;
      if (char === '"' && next === '"') {
        current += next;
        i += 2;
      } else {
        if (char === '"') double = false;
        i += 1;
      }
      continue;
    }

    if (char === "-" && next === "-") {
      current += char + next;
      lineComment = true;
      i += 2;
      continue;
    }

    if (char === "/" && next === "*") {
      current += char + next;
      blockComment = true;
      i += 2;
      continue;
    }

    if (char === "'") {
      current += char;
      single = true;
      i += 1;
      continue;
    }

    if (char === '"') {
      current += char;
      double = true;
      i += 1;
      continue;
    }

    if (char === "$") {
      const match = sql.slice(i).match(/^\$[A-Za-z0-9_]*\$/);
      if (match) {
        dollarTag = match[0];
        current += dollarTag;
        i += dollarTag.length;
        continue;
      }
    }

    current += char;
    if (char === ";") {
      statements.push(current);
      current = "";
    }
    i += 1;
  }

  if (current.trim()) statements.push(current);
  return statements;
}

function stripLeadingComments(statement) {
  let text = statement.trimStart();
  let changed = true;

  while (changed) {
    changed = false;
    if (text.startsWith("--")) {
      const newline = text.indexOf("\n");
      text = newline === -1 ? "" : text.slice(newline + 1).trimStart();
      changed = true;
    }
    if (text.startsWith("/*")) {
      const end = text.indexOf("*/");
      text = end === -1 ? "" : text.slice(end + 2).trimStart();
      changed = true;
    }
  }

  return text;
}

function isTopLevelDml(statement) {
  const stripped = stripLeadingComments(statement).toLowerCase();
  return /^(insert|update|delete|copy|merge)\b/.test(stripped);
}

if (!fs.existsSync(legacyDir)) {
  throw new Error(`Legacy migrations directory not found: ${legacyDir}`);
}

fs.mkdirSync(activeDir, { recursive: true });

const legacyFiles = fs
  .readdirSync(legacyDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

const removed = [];
const body = [];

for (const file of legacyFiles) {
  const fullPath = path.join(legacyDir, file);
  const sql = fs.readFileSync(fullPath, "utf8");
  for (const statement of splitSqlStatements(sql)) {
    if (isTopLevelDml(statement)) {
      const preview = stripLeadingComments(statement)
        .replace(/\s+/g, " ")
        .slice(0, 160);
      removed.push({ file, preview });
      continue;
    }
    if (statement.trim()) body.push(statement.trim());
  }
}

const header = `-- Ultimate Rivals Season 1 v1 production baseline.
-- Generated from the archived Season 1 development migration chain.
-- This file is schema-first: top-level DML was extracted to explicit bootstrap
-- scripts so production replay does not create non-production records.
-- Regenerate with: node scripts/generate-production-baseline.cjs
`;

fs.writeFileSync(outputFile, `${header}\n${body.join("\n\n")}\n`, "utf8");

console.log(`Generated ${path.relative(root, outputFile)}`);
console.log(`Legacy files read: ${legacyFiles.length}`);
console.log(`Top-level DML statements extracted: ${removed.length}`);
for (const item of removed) {
  console.log(`- ${item.file}: ${item.preview}`);
}
