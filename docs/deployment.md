# Deployment Guide

## Hosting

HiveSpell is configured for Firebase Hosting.

Relevant files:

- [`firebase.json`](../firebase.json)
- [`.github/workflows/firebase-hosting-merge.yml`](../.github/workflows/firebase-hosting-merge.yml)
- [`.github/workflows/firebase-hosting-pull-request.yml`](../.github/workflows/firebase-hosting-pull-request.yml)

## Build Output

Production assets are generated into `dist/`.

Build locally with:

```bash
npm run build
```

Preview locally with:

```bash
npm run preview
```

## CI/CD

Current workflow:

- pull requests can generate preview deployments
- pushes to `main` deploy the live site

The GitHub workflows inject required environment variables through repository secrets.

## Manual Deploy

If you have Firebase CLI access:

```bash
npm run build
firebase deploy
```

## Deployment Checklist

- required environment variables are configured
- the app builds successfully
- any required backend-side changes have already been applied
- static assets referenced by the UI exist in `public/`

## Release Tips

- smoke-test auth, lobby, and one gameplay round after deployment
- check preview deployments before merging risky UI or gameplay changes
- keep README and docs in sync when setup steps change
