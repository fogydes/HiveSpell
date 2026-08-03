# HiveSpell Supabase Backup Strategy

## Overview

This document defines the backup, retention, and recovery strategy for the HiveSpell Supabase (PostgreSQL) database.

---

## Backup Tiers

### Tier 1: Point-in-Time Recovery (PITR) - Automatic

| Plan | Retention | Granularity | Cost |
|------|-----------|-------------|------|
| **Standard** (current) | 1 hour | Per second | Included |
| **Enterprise** | 7 days | Per second | Additional |

**Current Configuration**: Standard plan with 1-hour PITR window.

**Recovery Point Objective (RPO)**: ≤ 1 hour  
**Recovery Time Objective (RTO)**: ≤ 15 minutes

### Tier 2: Manual Snapshots - Daily Cron

**Schedule**: Daily at 03:00 UTC via `pg_cron`

```sql
-- In supabase/migrations/ (to be applied)
SELECT cron.schedule(
  'daily-snapshot',
  '0 3 * * *',
  $$
  SELECT pg_dumpall() -- Handled by Supabase platform
  $$
);
```

**Actually**: Supabase manages snapshots via Dashboard/API. We trigger via GitHub Actions:

```yaml
# .github/workflows/backup.yml (to be created)
name: Daily Database Backup
on:
  schedule:
    - cron: '0 3 * * *'  # 03:00 UTC daily
  workflow_dispatch:

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: supabase/setup-cli@v1
      - run: |
          supabase db dump --project-ref ${{ secrets.SUPABASE_PROJECT_REF }} \
            --schema public --data-only=false > schema.sql
          supabase db dump --project-ref ${{ secrets.SUPABASE_PROJECT_REF }} \
            --schema public --data-only=true > data.sql
      - uses: actions/upload-artifact@v4
        with:
          name: db-backup-${{ github.run_id }}
          path: |
            schema.sql
            data.sql
          retention-days: 30
```

**Retention**: 30 days (GitHub Actions artifacts)  
**Storage**: GitHub Actions artifacts (ephemeral) + optional S3 sync

### Tier 3: Cross-Region Replication - Future

**Target**: Enterprise plan with read replica in `eu-west-1` (current: `us-east-1`)

**Setup**:
1. Upgrade to Enterprise plan
2. Enable read replica in secondary region
3. Configure automated failover

---

## What's Backed Up

### Included
- ✅ All `public` schema tables (profiles, rooms, messages, stats, etc.)
- ✅ All `auth` schema (users, sessions - via Supabase Auth export)
- ✅ All custom types, functions, RPCs
- ✅ All RLS policies
- ✅ All indexes, triggers
- ✅ `storage.objects` metadata (not file contents - see below)

### Excluded / Separate
- ❌ **Storage files** (images, audio) - Firebase Storage handles separately
- ❌ **Firebase Auth users** - Separate export via Firebase Admin SDK
- ❌ **Firebase Realtime DB** - Separate export
- ❌ **Edge Functions** - Version controlled in repo

---

## Recovery Procedures

### Scenario 1: Accidental Data Deletion (Single Table/Row)

**RTO**: 5 minutes | **RPO**: ≤ 1 hour

```bash
# 1. Identify exact timestamp of deletion
# 2. Use PITR to restore to new project
supabase projects create hivespell-restore --region us-east-1 --plan standard
supabase projects restore --project-ref hivespell-restore --pitr-timestamp "2026-08-03T10:30:00Z"

# 3. Extract deleted data from restored project
supabase db dump --project-ref hivespell-restore --table <table> --data-only=true > recover.sql

# 4. Apply to production
psql "postgresql://..." < recover.sql

# 5. Clean up
supabase projects delete hivespell-restore
```

### Scenario 2: Corrupted Migration / Schema Drift

**RTO**: 15 minutes | **RPO**: ≤ 1 hour

```bash
# 1. Reset to known-good migration version
supabase db reset --linked --migration-version 20260801120000

# 2. Re-apply migrations up to current
supabase migration up --linked --include-all

# 3. Verify data integrity
supabase inspect db bloat --linked
supabase inspect db cache-hit --linked
```

### Scenario 3: Full Region Outage

**RTO**: 30 minutes (manual) | **RPO**: ≤ 1 hour

```bash
# 1. Create new project in alternate region
supabase projects create hivespell-dr --region eu-west-1 --plan standard

# 2. Restore from PITR (latest available)
supabase projects restore --project-ref hivespell-dr --pitr-timestamp "latest"

# 3. Update environment variables
# VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_PROJECT_REF

# 4. Re-deploy Edge Functions
supabase functions deploy --project-ref hivespell-dr

# 5. Update DNS / Firebase config
# Point to new Supabase project
```

### Scenario 4: Ransomware / Malicious Deletion

**RTO**: 1 hour | **RPO**: ≤ 24 hours (manual snapshot)

```bash
# 1. Use latest manual snapshot (GitHub Actions artifact)
# 2. Download schema.sql + data.sql from artifact
# 3. Create fresh project
# 4. Apply schema, then data
# 5. Verify no malicious code in functions/triggers
```

---

## Verification Schedule

| Check | Frequency | Tool | Alert Threshold |
|-------|-----------|------|-----------------|
| PITR status | Daily | `supabase projects api-keys` | Not ACTIVE_HEALTHY |
| Snapshot artifact exists | Daily | GitHub Actions workflow | Workflow failed |
| Database size growth | Weekly | `supabase inspect db size` | > 50% MoM |
| Bloat ratio | Weekly | `supabase inspect db bloat` | > 30% |
| Cache hit ratio | Weekly | `supabase inspect db cache-hit` | < 90% |
| Vacuum lag | Weekly | `supabase inspect db vacuum-stats` | > 100M dead tuples |

---

## Monitoring & Alerting

### GitHub Actions Backup Workflow
- **Success**: Silent (check Actions tab)
- **Failure**: Email to repo watchers + Slack webhook (if configured)

### Supabase Dashboard Alerts (Configure in Dashboard)
1. **Database CPU > 80% for 5m**
2. **Database connections > 80% of max**
3. **Disk usage > 75%**
4. **Replication lag > 10s** (if replica enabled)
5. **PITR disabled** (should never happen)

### Custom Health Check (Already in CI)
```bash
# Runs on every deploy
curl -sf https://hivespell-db.web.app/api/health
# Verifies: Supabase connectivity, Auth, basic query
```

---

## Cost Estimation

| Component | Standard Plan | Enterprise Plan |
|-----------|---------------|-----------------|
| Base compute | $25/mo | $150/mo |
| PITR (1hr) | Included | Included (7 days) |
| PITR (7 days) | N/A | +$50/mo |
| Read replica | N/A | +$25/mo |
| Backup storage (30 days) | ~$5/mo | ~$5/mo |
| **Total/month** | **~$30** | **~$230** |

**Recommendation**: Stay on Standard for now. Upgrade to Enterprise when:
- Team > 5 engineers
- Revenue > $10k/mo
- RPO requirement < 1 hour for compliance

---

## Disaster Recovery Test Plan

See `disaster-recovery-test-plan.md` for quarterly drill procedures.

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│  HiveSpell DB Recovery - Quick Commands                     │
├─────────────────────────────────────────────────────────────┤
│  Check project health:                                      │
│    supabase projects api-keys --project-ref <ref>           │
│                                                             │
│  Run manual backup:                                         │
│    gh workflow run backup.yml                               │
│                                                             │
│  List migrations:                                           │
│    supabase migration list --linked                         │
│                                                             │
│  Reset to version:                                          │
│    supabase db reset --linked --migration-version <ver>     │
│                                                             │
│  Inspect db health:                                         │
│    supabase inspect db bloat --linked                       │
│    supabase inspect db cache-hit --linked                   │
│    supabase inspect db vacuum-stats --linked                │
│                                                             │
│  PITR restore (Supabase Dashboard → Backups → Restore)      │
└─────────────────────────────────────────────────────────────┘
```

---

*Last updated: 2026-08-03*  
*Version: 1.0*  
*Next review: 2026-11-03 (quarterly)*