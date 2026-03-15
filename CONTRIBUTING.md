# Contributing To HiveSpell

Thanks for your interest in contributing to HiveSpell.

## Ways To Help

- fix bugs
- improve gameplay feel and UI polish
- improve documentation
- add tests and developer tooling
- refine multiplayer stability and recovery behavior

## Getting Started

1. Read [`README.md`](./README.md)
2. Read [`docs/README.md`](./docs/README.md)
3. Install dependencies with `npm install`
4. Configure `.env.local`
5. Run the app with `npm run dev`

## Development Expectations

Before submitting changes:

- run `npx tsc --noEmit`
- run `npm run build`
- manually test the user flow you changed
- update documentation if setup or behavior changed

## Contribution Guidelines

- keep changes focused and easy to review
- avoid unrelated refactors in the same pull request
- preserve the existing visual direction unless the change is explicitly a redesign
- prefer small, clear commits

## Codebase Notes

- the project uses a flat root layout instead of `src/`
- gameplay and room logic are concentrated in [`views/Play.tsx`](./views/Play.tsx)
- shared gameplay utilities live in [`services/gameService.ts`](./services/gameService.ts)
- multiplayer room behavior lives in [`services/multiplayerService.ts`](./services/multiplayerService.ts)

## Pull Requests

A good pull request should include:

- a short explanation of the problem
- a summary of the fix
- notes on manual testing
- screenshots or clips for UI changes when helpful

## Reporting Bugs

Please open an issue with:

- what happened
- what you expected
- steps to reproduce
- browser and device details if relevant

## Security

If the issue is security-sensitive, do not open a public issue first. Please follow [`SECURITY.md`](./SECURITY.md).
