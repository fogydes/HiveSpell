# Documentation

This folder contains the project documentation for HiveSpell.

## Contents

### Foundation (Always Current)
- [`architecture.md`](./architecture.md) - App structure, providers, routes, and major modules
- [`development.md`](./development.md) - Local setup, workflow, and codebase conventions
- [`backend.md`](./backend.md) - Firebase and Supabase responsibilities
- [`data-ownership.md`](./data-ownership.md) - Canonical source-of-truth plan for profile and gameplay data
- [`supabase.md`](./supabase.md) - Internal Supabase table, storage, and RPC expectations
- [`deployment.md`](./deployment.md) - Hosting and CI/CD overview
- [`gameplay.md`](./gameplay.md) - Gameplay concepts and round flow

### Active Strategy
- [`transformation.md`](./transformation.md) - **Current 6-phase transformation strategy** (moved from root)
- [`improvement-plan.md`](./improvement-plan.md) - Tactical security, code quality, and DX improvements (tracks 1-6)

### Reference
- [`sql/`](./sql/) - Database migration files

## Suggested Reading Order

1. [`architecture.md`](./architecture.md)
2. [`development.md`](./development.md)
3. [`backend.md`](./backend.md)
4. [`data-ownership.md`](./data-ownership.md)
5. [`supabase.md`](./supabase.md)
6. [`transformation.md`](./transformation.md) — **start here for current direction**
7. [`improvement-plan.md`](./improvement-plan.md) — for tactical execution details
8. [`gameplay.md`](./gameplay.md)
9. [`deployment.md`](./deployment.md)

## Audience

- New contributors should begin with [`../CONTRIBUTING.md`](../CONTRIBUTING.md)
- Maintainers should review [`backend.md`](./backend.md) and [`deployment.md`](./deployment.md)
- Anyone touching gameplay should read [`gameplay.md`](./gameplay.md) and [`architecture.md`](./architecture.md)
- For security and quality context, read [`improvement-plan.md`](./improvement-plan.md)
- For product/experience direction, read [`transformation.md`](./transformation.md)