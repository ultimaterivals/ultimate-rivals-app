# Vercel deployment setup

Deployment target: `VERCEL`.

Reason: the app is a Next.js project and does not require additional hosting
architecture for Season 1.

## Current CLI status

- Global `vercel`: not installed in PATH.
- `npx vercel --version`: `58.7.1`.
- `npx vercel whoami`: authentication failed with invalid token.

Status: `VERCEL_MANUAL_LINK_REQUIRED`.

No Vercel project was created, linked or deployed in this gate.

## Manual link steps

1. Authenticate locally or in CI:
   - `npx vercel login`, or
   - configure a valid Vercel token in the chosen secret store.
2. Link the GitHub repository:
   - owner/repo: `ultimaterivals/ultimate-rivals-app`;
   - Vercel project name: `ultimate-rivals-app`;
   - framework: Next.js;
   - root directory: repository root;
   - production branch: future `main`.
3. Configure environment variables from `docs/vercel-environment-matrix.md`.
4. Create a Preview Deployment from `release/season-1-v1`.
5. Do not create a Production Deployment until owner go-live approval.

## Expected build settings

- Install command: `npm ci`
- Build command: `npm run build`
- Output: native Next.js/Vercel detection
- Node: 22.x compatible runtime
- Root directory: repository root

No `vercel.json` is required at this stage.
