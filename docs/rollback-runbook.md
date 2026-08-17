# HiveSpell Rollback Runbook

## Quick Reference

| Scenario | Action | ETA |
|----------|--------|-----|
| Critical bug in production | `Feature Flag Kill Switch` | < 1 min |
| Bad deploy (staging) | Auto-rollback via `main` re-deploy | ~3 min |
| Bad deploy (production) | Redeploy previous `main` SHA | ~3 min |
| Database migration issue | `supabase db reset --linked` + re-apply | ~10 min |
| Full outage | DNS failover (if configured) | < 5 min |

---

## 1. Feature Flag Kill Switch (Fastest - < 1 minute)

### Immediate Mitigation
Feature flags are managed in **Supabase `feature_flags` table** and cached client-side via `FeatureFlagsContext`.

```bash
# Disable a problematic feature instantly
curl -X PATCH "https://<project>.supabase.co/rest/v1/feature_flags?name=eq.<flag_name>" \
  -H "apikey: <SUPABASE_ANON_KEY>" \
  -H "Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

### Critical Flags to Know
| Flag | Purpose | Safe to Disable? |
|------|---------|------------------|
| `battle_pass` | Seasonal progression | Yes - cosmetic only |
| `challenges` | Daily/weekly quests | Yes - no core gameplay impact |
| `ranked_mode` | Glicko-2 ranked queue | Yes - falls back to casual |
| `tournaments` | Tournament system | Yes - standalone feature |
| `replay_system` | Post-game replays | Yes - read-only |
| `spectator_mode` | Watch live games | Yes - read-only |
| `anti_cheat_enhanced` | Statistical detection | **NO** - keep enabled |
| `shadow_ban` | Shadow ban enforcement | **NO** - keep enabled |

### Emergency Disable All New Features
```sql
-- In Supabase SQL Editor
UPDATE feature_flags SET enabled = false WHERE name IN (
  'battle_pass', 'challenges', 'ranked_mode', 'tournaments', 
  'replay_system', 'spectator_mode'
);
```

---

## 2. Firebase Hosting Rollback

### Production Rollback (3 minutes)
```bash
# Option A: Re-deploy previous known-good SHA
# Get the previous SHA from GitHub Actions or git log
PREV_SHA=<previous-good-sha>

# Deploy using GitHub Actions workflow_dispatch
gh workflow run production-deploy.yml -f sha=$PREV_SHA

# OR manually via Firebase CLI (if configured locally)
firebase hosting:clone hivespell-db:live hivespell-db:live --expires 0
```

### Staging Rollback
```bash
# Staging auto-deploys from `develop` branch
# Just push a fix to `develop` or revert the bad commit
git revert <bad-commit> && git push origin develop
```

### Preview Channel (PR) Rollback
```bash
# Preview channels are ephemeral - just push a fix to the PR branch
# Or close/reopen the PR to trigger fresh deploy
```

---

## 3. Supabase Database Rollback

### Migration Rollback (requires downtime window)
```bash
# 1. Check current migration version
supabase migration list --linked

# 2. Reset to specific version (DESTRUCTIVE - data loss!)
supabase db reset --linked --migration-version <version>

# 3. Re-apply migrations up to desired version
supabase migration up --linked --include-all
```

### Point-in-Time Recovery (PITR) - Preferred for Data Issues
```bash
# Supabase PITR retains 7 days (Enterprise) or 1 hour (Standard)
# Restore via Supabase Dashboard:
# 1. Go to Project → Database → Backups
# 2. Click "Restore" → Select timestamp
# 3. Confirm restore to new project or overwrite
```

### RLS Policy Emergency Disable
```sql
-- TEMPORARY: Disable RLS on a table if policies are blocking legitimate access
ALTER TABLE <table_name> DISABLE ROW LEVEL SECURITY;

-- RE-ENABLE ASAP after fix:
ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;
```

---

## 4. Complete Rollback Procedure (Production)

### Step 1: Assess (30 seconds)
- Check PostHog for error spike
- Check Supabase logs: `supabase logs --project-ref <ref> --service postgres`
- Check Firebase Hosting logs in console

### Step 2: Mitigate (1 minute)
- **If feature-specific**: Disable via feature flag (Section 1)
- **If deploy-related**: Proceed to Step 3

### Step 3: Rollback Deploy (3 minutes)
```bash
# Via GitHub Actions (recommended - audit trail)
gh workflow run production-deploy.yml -f sha=<last-known-good-sha>

# Find last good SHA:
gh run list --workflow=production-deploy --limit=10 --json conclusion,headSha
```

### Step 4: Verify (2 minutes)
- Run health check: `curl https://hivespell-db.web.app/api/health`
- Check core funnels in PostHog
- Smoke test: login → lobby → play → victory

### Step 5: Communicate
- Post in #incidents channel
- Update status page (if configured)
- Create GitHub issue with `rollback` label

---

## 5. Supabase Project-Level Recovery

### If Entire Project is Compromised
1. **Create new Supabase project** in same region
2. **Run all migrations** in order: `supabase db push --project-ref <new-ref>`
3. **Restore data** from PITR backup or manual dump
4. **Update DNS/environment variables** to point to new project
5. **Verify** all RPCs, RLS, realtime, auth work

### Backup Strategy Reference
See `docs/backup-strategy.md` for:
- PITR configuration (7 days Enterprise / 1 hour Standard)
- Manual snapshot schedule (daily via cron)
- Cross-region replication setup
- Recovery time objectives (RTO: 15 min, RPO: 1 hour)

---

## 6. Contact Escalation

| Severity | Contact | Channel |
|----------|---------|---------|
| SEV-1 (Data loss, full outage) | On-call engineer + tech lead | Phone + #incidents |
| SEV-2 (Major feature down) | On-call engineer | #incidents |
| SEV-3 (Minor degradation) | Next business day | GitHub issue |

---

## 7. Post-Rollback Checklist

- [ ] Root cause identified and documented
- [ ] Fix implemented and tested in staging
- [ ] Feature flag re-enabled (if disabled)
- [ ] Monitoring alerts verified
- [ ] Postmortem scheduled (for SEV-1/2)
- [ ] Runbook updated with lessons learned

---

*Last updated: 2026-08-03*
*Version: 1.0*