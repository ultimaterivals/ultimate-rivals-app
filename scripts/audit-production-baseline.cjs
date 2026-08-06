const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const baselinePath =
  process.argv[2] ||
  path.join(
    root,
    "supabase",
    "migrations",
    "20260806000000_season_1_v1_production_baseline.sql",
  );

const sql = fs.readFileSync(baselinePath, "utf8");

function splitSqlStatements(sqlText) {
  const statements = [];
  let current = "";
  let i = 0;
  let single = false;
  let double = false;
  let lineComment = false;
  let blockComment = false;
  let dollarTag = null;

  while (i < sqlText.length) {
    const char = sqlText[i];
    const next = sqlText[i + 1];

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
      if (sqlText.startsWith(dollarTag, i)) {
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
      const match = sqlText.slice(i).match(/^\$[A-Za-z0-9_]*\$/);
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

const topLevelDml = splitSqlStatements(sql).filter((statement) =>
  /^(insert|update|delete|copy|merge)\b/i.test(stripLeadingComments(statement)),
);

const forbiddenPatterns = [
  /\bfake\b/i,
  /\bfixture\b/i,
  /\bdemo\b/i,
  /\bRC1_/,
  /\bDEV_/,
  /test athlete/i,
  /test team/i,
  /test venue/i,
  /test sponsor/i,
];

const forbiddenHits = forbiddenPatterns
  .map((pattern) => ({ pattern: pattern.toString(), hit: pattern.test(sql) }))
  .filter((item) => item.hit);

if (topLevelDml.length > 0 || forbiddenHits.length > 0) {
  console.error("PRODUCTION_BASELINE_FAKE_DATA = FAIL");
  console.error(`Top-level DML statements: ${topLevelDml.length}`);
  for (const statement of topLevelDml.slice(0, 20)) {
    console.error(stripLeadingComments(statement).replace(/\s+/g, " ").slice(0, 180));
  }
  console.error(`Forbidden pattern hits: ${forbiddenHits.map((x) => x.pattern).join(", ")}`);
  process.exit(1);
}

console.log("PRODUCTION_BASELINE_FAKE_DATA = ZERO");
console.log("PROD_FIXTURE_AUDIT_PASS");
