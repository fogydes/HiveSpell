# HiveSpell Database Backup Strategy (Free Tier Optimized)

## Overview

This document outlines the backup and disaster recovery strategy for the HiveSpell Supabase PostgreSQL database **on the Supabase Free Tier**.

### Free Tier Constraints
- **PITR Retention**: 1 hour only (not 7 days - that's Enterprise)
- **Database Size**: 500 MB limit
- **File Storage**: 1 GB limit
- **Edge Functions**: 2M invocations/month, 500MB bandwidth
- **No pg_cron**: Cannot schedule database-level cron jobs
- **No Read Replicas**: Cross-region DR not available
- **No Custom Domains** on Firebase Hosting free tier

### Off-Site Storage
- **Cloudflare R2**: Used for off-site backups (S3-compatible API)
- **Bucket**: `hivespell-db-backups`
- **Region**: Auto (global)
- **Retention**: 90 days lifecycle rule for daily, 365 days for weekly

## Backup Types

### 1. Automated Point-in-Time Recovery (PITR) - Primary
- **Provider**: Supabase built-in PITR
- **Retention**: **1 hour only** (Free tier limitation)
- **RPO**: ~1 minute (WAL archiving)
- **RTO**: ~5-15 minutes
- **Status**: ✅ Enabled by default on Supabase

### 2. Daily Logical Backups (Edge Function) - Secondary
- **Frequency**: Daily via GitHub Actions cron (not pg_cron)
- **Retention**: 7 days in Supabase Storage, 90 days in Cloudflare R2
- **Format**: JSON + gzip (via Edge Function)
- **Storage**: Supabase Storage bucket `database-backups` + Cloudflare R2 bucket `hivespell-db-backups`
- **Size Target**: < 50 MB compressed per backup

### 3. Weekly Full Backups - Tertiary
- **Frequency**: Weekly via GitHub Actions cron
- **Retention**: 4 weeks in Supabase Storage, 1 year in Cloudflare R2
- **Format**: JSON + gzip
- **Storage**: Supabase Storage + Cloudflare R2 (automated sync)

### 4. Schema-Only Backups - For Migration Reference
- **Frequency**: On every migration deploy (CI/CD)
- **Retention**: In Git history (supabase/migrations/)
- **Purpose**: Track schema evolution, enable schema-only restores

## Implementation

### GitHub Actions Scheduled Backups (Replaces pg_cron)

Since pg_cron is not available on Free tier, use GitHub Actions:

```yaml
# .github/workflows/backup.yml
name: Database Backup

on:
  schedule:
    - cron: '0 3 * * *'   # Daily at 03:00 UTC
    - cron: '0 2 * * 0'   # Weekly on Sunday 02:00 UTC
  workflow_dispatch:
    inputs:
      type:
        description: 'Backup type'
        required: true
        default: 'daily'
        type: choice
        options: [daily, weekly, schema]

jobs:
  backup:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Trigger backup
        run: |
          TYPE="${{ github.event.inputs.type || (github.event.schedule == '0 2 * * 0' && 'weekly' || 'daily') }}"
          curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/backup-database" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json" \
            -d "{\"type\": \"$TYPE\"}"
  
  sync-to-r2:
    needs: backup
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - name: Sync to Cloudflare R2
        run: |
          # Download from Supabase Storage and upload to R2
          # using rclone or aws cli with R2 endpoint
          SUPABASE_URL="${{ secrets.SUPABASE_URL }}"
          SERVICE_ROLE_KEY="${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}"
          R2_ACCOUNT_ID="${{ secrets.R2_ACCOUNT_ID }}"
          R2_ACCESS_KEY_ID="${{ secrets.R2_ACCESS_KEY_ID }}"
          R2_SECRET_ACCESS_KEY="${{ secrets.R2_SECRET_ACCESS_KEY }}"
          R2_BUCKET="${{ secrets.R2_BUCKET }}"
          
          # Use aws cli with R2 endpoint
          aws s3 sync "https://${SUPABASE_URL.replace('https://', '')}/storage/v1/object/database-backups/" \
            "s3://${R2_BUCKET}/" \
            --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" \
            --no-verify-ssl
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.R2_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.R2_SECRET_ACCESS_KEY }}
          AWS_DEFAULT_REGION: auto
```

### Edge Function: Database Backup

Location: `supabase/functions/backup-database/index.ts`

Features:
- Exports table data as JSON via Supabase REST API (no pg_dump available in Edge Functions)
- Compresses with gzip using CompressionStream API
- Uploads to Supabase Storage bucket `database-backups`
- Supports daily (recent changes only), weekly (full), schema modes
- Includes metadata manifest for restore verification

### Off-Site Replication (Automated via Cloudflare R2)

For disaster recovery beyond Supabase region failure:
- **Automated Sync**: GitHub Actions workflow syncs Supabase Storage → Cloudflare R2
- **Lifecycle Rules**: R2 bucket configured with 90-day retention for daily, 365-day for weekly
- **Cross-region**: R2 is globally distributed, providing geographic redundancy

## Restore Procedures

### Scenario 1: Point-in-Time Recovery (PITR)
**When**: Accidental data deletion, corruption within **last 1 hour**
**RTO**: 5-15 minutes
**Steps**:
1. Go to Supabase Dashboard → Database → Backups
2. Click "Restore" → "Point in Time"
3. Select target timestamp (within 1 hour)
4. Choose new database name or overwrite
5. Verify data integrity
6. Update application connection string if using new database

⚠️ **Limitation**: Only 1 hour window on Free tier!

### Scenario 2: Full Restore from Daily/Weekly Backup
**When**: PITR window exceeded, catastrophic failure
**RTO**: 30-60 minutes (depends on data size)
**Steps**:
1. Download backup from Supabase Storage (Dashboard → Storage → database-backups) **OR** from Cloudflare R2
2. Create new Supabase project (or use existing)
3. Restore using custom script (since backup is JSON, not pg_dump format):
   ```bash
   # Decompress and parse JSON
   gunzip -c backup.json.gz > backup.json
   # Use restoration script (see Appendix)
   node restore-backup.js backup.json "postgresql://..."
   ```
4. Run any pending migrations
5. Verify application functionality
6. Switch DNS/proxy to restored database

### Scenario 3: Schema-Only Restore + Data Import
**When**: Schema corruption, need clean schema
**Steps**:
1. Apply migrations from `supabase/migrations/` to new database
2. Import data from most recent clean backup
3. Verify foreign keys and constraints

### Scenario 4: Region-Wide Outage (Free Tier - Manual)
**When**: Entire Supabase region unavailable
**RTO**: 60-120+ minutes (manual process)
**Steps**:
1. Create new Supabase project in different region
2. Apply all migrations from Git history
3. Restore from most recent off-site backup (Cloudflare R2)
4. Update application configuration (VITE_SUPABASE_URL, keys)
5. Update Firebase Hosting config if needed
6. Verify all services

## Backup Verification

### Automated Verification (Weekly via CI)
- Restore latest daily backup to temporary Supabase project (or local Docker)
- Run integrity checks:
  - Row counts match expected ranges
  - Foreign key constraints valid
  - Critical queries return expected results
- Log results to GitHub Actions summary

### Manual Verification (Monthly)
- Full restore drill to local development database
- Time the restore process
- Validate application functionality
- Document any issues and update procedures

## Monitoring & Alerting

### Backup Success Metrics
- Backup job completion status (GitHub Actions)
- Backup file size (detect anomalies)
- Backup duration
- Upload to storage success
- R2 sync status

### Alert Rules (via GitHub Actions)
- **Critical**: Backup workflow fails 2 consecutive runs
- **Warning**: Backup file size deviates >50% from average
- **Warning**: R2 sync fails
- **Info**: Weekly verification completed

## Retention Policy Summary (Free Tier)

| Backup Type | Frequency | Retention (Supabase) | Retention (R2) | Storage Location |
|-------------|-----------|----------------------|-----------------|------------------|
| PITR | Continuous | **1 hour** | N/A | Supabase managed |
| Daily Logical | Daily 03:00 UTC | **7 days** | **90 days** | Supabase Storage + Cloudflare R2 |
| Weekly Full | Sunday 02:00 UTC | **4 weeks** | **1 year** | Supabase Storage + Cloudflare R2 |
| Schema on Deploy | Per migration | **Git history** | N/A | Git repo (supabase/migrations/) |

## Recovery Point Objectives (RPO) & Recovery Time Objectives (RTO)

| Scenario | RPO | RTO |
|----------|-----|-----|
| Accidental deletion (within 1hr) | < 1 min | 5-15 min |
| Data corruption (within 1hr) | < 1 min | 5-15 min |
| Catastrophic failure (daily backup) | < 24 hours | 30-60 min |
| Region-wide outage | < 24 hours | **60-180 min (includes R2 download)** |

## Security Considerations

- Backups encrypted at rest (Supabase Storage default, R2 SSE-S3)
- Backups encrypted in transit (TLS)
- Access controlled via Supabase RLS policies
- Service role key stored in GitHub Secrets (rotate quarterly)
- R2 credentials stored in GitHub Secrets (rotate quarterly)
- Local off-site copies encrypted (user responsibility)

## Testing Schedule (Free Tier Realistic)

| Test | Frequency | Owner |
|------|-----------|-------|
| Automated restore verification | Weekly | CI/CD |
| Full restore drill to local DB | Monthly | Developer |
| Backup retention audit | Quarterly | Developer |

## Contact & Escalation

- **Primary**: Developer (manual monitoring)
- **Vendor**: Supabase support (community tier on free plan)
- **Cloudflare**: R2 support via dashboard

## Appendix: Backup & Restore Scripts

### Manual Daily Backup (Local Development)
```bash
# Using Supabase CLI (requires local database)
supabase db dump --data-only --file=daily_$(date +%Y%m%d).dump.gz

# Using pg_dump directly (local or remote)
pg_dump "postgresql://..." --data-only --format=custom --compress=6 | gzip > daily_$(date +%Y%m%d).dump.gz
```

### Manual Weekly Full Backup (Local Development)
```bash
pg_dump "postgresql://..." --format=custom --compress=6 | gzip > weekly_full_$(date +%Y%m%d).dump.gz
```

### Schema-Only Backup (Local Development)
```bash
pg_dump "postgresql://..." --schema-only --format=custom > schema_$(date +%Y%m%d).dump
```

### Restore from JSON Backup (Edge Function Format)
```javascript
// restore-backup.js
// Usage: node restore-backup.js backup.json "postgresql://user:pass@host:5432/db"
import fs from 'fs';
import pg from 'pg';

const [, , backupFile, connectionString] = process.argv;
const backup = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
const { Pool } = pg;
const pool = new Pool({ connectionString });

async function restore() {
  for (const [table, rows] of Object.entries(backup.data)) {
    if (!rows.length) continue;
    
    // Get columns from first row
    const columns = Object.keys(rows[0]);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const columnNames = columns.join(', ');
    
    for (const row of rows) {
      const values = columns.map(c => row[c]);
      try {
        await pool.query(
          `INSERT INTO ${table} (${columnNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
          values
        );
      } catch (e) {
        console.error(`Error inserting into ${table}:`, e.message);
      }
    }
    console.log(`Restored ${rows.length} rows to ${table}`);
  }
  await pool.end();
}

restore().catch(console.error);
```

### Download from Cloudflare R2
```bash
# Using aws cli with R2
aws s3 cp s3://hivespell-db-backups/daily/daily-2026-08-02.json.gz ./backup.json.gz \
  --endpoint-url https://<account-id>.r2.cloudflarestorage.com

# Using rclone (easier for large transfers)
rclone copy remote:hivespell-db-backups/daily/ ./backups/daily/ -P
```

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.2 | 2026-08-02 | System | Added Cloudflare R2 off-site replication |
| 1.1 | 2026-08-02 | System | Updated for Free Tier constraints |
| 1.0 | 2026-08-02 | System | Initial backup strategy |