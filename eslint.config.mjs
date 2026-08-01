import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  prettier,
  globalIgnores([
    ".next/**",
    "node_modules/**",
    "coverage/**",
    "playwright-report/**",
    "Backups/**",
    "Design Site/**",
    "Ultimate/**",
    "UR/**",
    "UR 2026/**",
    "UR SIte/**",
    "ur-*/**",
    "_*/**",
    "*.js",
  ]),
]);
