#!/usr/bin/env node

const crypto = require("node:crypto");
const { readFileSync } = require("node:fs");

const manifestPath = process.argv[2];

if (!manifestPath) {
  console.error(
    "Usage: node scripts/summarize-schema-manifest.cjs <manifest.json>",
  );
  process.exit(2);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const keys = [
  "schemas",
  "tables",
  "columns",
  "constraints",
  "indexes",
  "enums",
  "functions",
  "views",
  "triggers",
  "policies",
  "grants",
];

const summary = Object.fromEntries(
  keys.map((key) => {
    const value = manifest[key] ?? [];
    return [
      key,
      {
        count: Array.isArray(value) ? value.length : 0,
        sha256: crypto
          .createHash("sha256")
          .update(JSON.stringify(value))
          .digest("hex"),
      },
    ];
  }),
);

console.log(JSON.stringify(summary, null, 2));
