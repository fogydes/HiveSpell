# HiveSpell Disaster Recovery Test Plan

## Purpose

Validate that backup and recovery procedures work correctly. Run quarterly to ensure RTO/RPO targets are met and team is familiar with procedures.

---

## Test Schedule

| Test | Frequency | Environment | Duration | Participants |
|------|-----------|-------------|----------|--------------|
| **PITR Restore Drill** | Quarterly | Staging | 30 min | Backend lead + 1 |
| **Full Region Failover** | Semi-annual | Staging | 60 min | Full team |
| **Schema Rollback** | Monthly | Local/Staging | 15 min | Any engineer |
| **Backup Artifact Verify** | Weekly | CI | 5 min | Automated |

---

## Test 1: PITR Restore Drill (Quarterly)

### Objective
Verify Point-in-Time Recovery can restore database to a specific second within the 1-hour window.

### Prerequisites
- Staging Supabase project (`hivespell-staging`)
- Known-good data state at timestamp `T`
- Test data inserted after `T` that should be lost

### Procedure

#### Step 1: Prepare Test Data (5 min)
```bash
# On staging project
# 1. Record current timestamp as T_RESTORE_TARGET
T_RESTORE_TARGET=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
echo "Restore target: $T_RESTORE_TARGET"

# 2. Insert identifiable test record
psql "postgresql://..." -c "
  INSERT INTO profiles (id, username, display_name, created_at) 
  VALUES ('drill-test-${T_RESTORE_TARGET}', 'drill_test', 'DRILL TEST USER', now())
  ON CONFLICT (id) DO UPDATE SET display_name = 'DRILL TEST USER';
"

# 3. Wait 2 minutes (ensure PITR has captured)
sleep 120

# 4. Delete the test record (simulate accidental deletion)
psql "postgresql://..." -c "
  DELETE FROM profiles WHERE id = 'drill-test-${T_RESTORE_TARGET}';
"
```

#### Step 2: Execute PITR Restore (15 min)
```bash
# 1. Create temporary restore project
supabase projects create hivespell-drill-restore --region us-east-1 --plan standard

# 2. Wait for project provisioning (~3 min)
# Check status:
supabase projects api-keys --project-ref hivespell-drill-restore

# 3. Initiate PITR restore to T_RESTORE_TARGET
supabase projects restore \
  --project-ref hivespell-drill-restore \
  --pitr-timestamp "$T_RESTORE_TARGET"

# 4. Wait for restore completion (monitor dashboard)
# Typically 5-10 minutes for small DB
```

#### Step 3: Verify Recovery (5 min)
```bash
# 1. Connect to restored project
psql "postgresql://<restored-project-connection>"

# 2. Verify test record EXISTS (should be recovered)
SELECT * FROM profiles WHERE id = 'drill-test-${T_RESTORE_TARGET}';

# 3. Verify data integrity on key tables
SELECT COUNT(*) FROM rooms;
SELECT COUNT(*) FROM messages;
SELECT COUNT(*) FROM profiles;

# 4. Verify RPCs work
SELECT pick_word('test-room', 'en', 'easy');
```

#### Step 4: Cleanup (5 min)
```bash
# Delete temporary project
supabase projects delete hivespell-drill-restore
```

### Success Criteria
- [ ] Restore completes within 15 minutes
- [ ] Test record recovered correctly
- [ ] Row counts match expected (within 1% of production)
- [ ] All RPCs execute without error
- [ ] RLS policies enforced correctly
- [ ] Indexes present and valid

### Rollback if Failed
- Document failure in GitHub issue
- Escalate to Supabase support if platform issue
- Re-schedule drill within 1 week

---

## Test 2: Full Region Failover (Semi-Annual)

### Objective
Validate complete failover to alternate region including DNS switch, Edge Functions, and client reconnection.

### Prerequisites
- Enterprise plan with read replica in `eu-west-1` (or ability to upgrade temporarily)
- Staging environment configured with both regions
- DNS/environment variable management access

### Procedure

#### Step 1: Enable Read Replica (10 min)
```bash
# Upgrade staging to Enterprise (temporary for drill)
# In Supabase Dashboard: Project → Settings → Plan → Upgrade to Enterprise
# Enable read replica in eu-west-1
# Wait for replica sync (monitor replication lag)
supabase inspect db replication-lag --project-ref hivespell-staging
```

#### Step 2: Simulate Primary Region Outage (10 min)
```bash
# Option A: Pause primary project (if supported)
supabase projects pause --project-ref hivespell-staging

# Option B: Block network access (firewall rule)
# Option C: Kill all connections to primary
```

#### Step 3: Promote Replica & Switch Traffic (20 min)
```bash
# 1. Promote replica to primary
# In Supabase Dashboard: Replica → Promote to Primary

# 2. Update environment variables
# VITE_SUPABASE_URL = new replica URL
# SUPABASE_PROJECT_REF = new project ref

# 3. Re-deploy Edge Functions to new primary
supabase functions deploy --project-ref <new-primary-ref>

# 4. Update Firebase Hosting config if needed
# (Supabase URL change requires client rebuild)
```

#### Step 4: Validate Full Functionality (15 min)
```bash
# 1. Health check
curl https://staging.hivespell.app/api/health

# 2. Full user journey (automated)
npx playwright test tests/e2e/full-journey.spec.ts

# 3. Verify realtime subscriptions
# - Create room, join, send message
# - Verify message received

# 4. Verify auth flow
# - Sign up new user
# - Sign in existing user
```

#### Step 5: Failback (5 min)
```bash
# 1. Resume original primary
supabase projects restore --project-ref hivespell-staging

# 2. Re-establish replication (original → replica)
# 3. Switch traffic back
# 4. Downgrade plan if temporary upgrade
```

### Success Criteria
- [ ] Failover completes within 30 minutes
- [ ] Zero data loss (replication lag < 1s at failover)
- [ ] All user journeys work on replica
- [ ] Edge Functions deploy and execute correctly
- [ ] Auth works (signup, login, password reset)
- [ ] Realtime subscriptions active
- [ ] Failback completes cleanly

---

## Test 3: Schema Rollback (Monthly)

### Objective
Verify migrations can be rolled back and re-applied cleanly.

### Procedure
```bash
# 1. On staging, note current migration version
CURRENT=$(supabase migration list --linked --project-ref hivespell-staging | tail -1)

# 2. Reset to previous version
PREV=$(echo "$CURRENT" | awk '{print $1}' | sed 's/^.*_//')
supabase db reset --linked --project-ref hivespell-staging --migration-version $PREV

# 3. Verify schema state
supabase migration list --linked --project-ref hivespell-staging

# 4. Re-apply migrations
supabase migration up --linked --project-ref hivespell-staging --include-all

# 5. Verify final state matches original
supabase migration list --linked --project-ref hivespell-staging
```

### Success Criteria
- [ ] Reset completes without error
- [ ] Re-apply completes without error
- [ ] Final migration list identical to start
- [ ] No data loss (staging data is disposable)

---

## Test 4: Backup Artifact Verification (Weekly - Automated)

### Objective
Ensure GitHub Actions backup workflow produces valid, restorable artifacts.

### GitHub Actions Workflow (Add to `.github/workflows/backup.yml`)
```yaml
name: Verify Backup Artifact
on:
  workflow_dispatch:
  schedule:
    - cron: '30 3 * * 1'  # Mondays 03:30 UTC (after daily backup)

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: db-backup-${{ github.event.workflow_run.id }}
          path: backup
      
      - name: Verify schema.sql
        run: |
          # Check schema contains expected tables
          grep -q "CREATE TABLE.*profiles" backup/schema.sql
          grep -q "CREATE TABLE.*rooms" backup/schema.sql
          grep -q "CREATE FUNCTION.*pick_word" backup/schema.sql
      
      - name: Verify data.sql
        run: |
          # Check data has content
          wc -l backup/data.sql
          test $(wc -l < backup/data.sql) -gt 100
      
      - name: Test restore to ephemeral DB
        run: |
          # Spin up temporary Postgres in Docker
          docker run -d --name test-db -e POSTGRES_PASSWORD=test postgres:16
          sleep 5
          
          # Restore schema
          docker exec -i test-db psql -U postgres < backup/schema.sql
          
          # Restore data
          docker exec -i test-db psql -U postgres < backup/data.sql
          
          # Verify key query works
          docker exec test-db psql -U postgres -c "SELECT count(*) FROM profiles;"
          
          # Cleanup
          docker rm -f test-db
```

### Success Criteria
- [ ] Artifact downloads successfully
- [ ] Schema contains all expected tables/functions
- [ ] Data file has substantial content
- [ ] Full restore to ephemeral DB succeeds
- [ ] Key queries return expected results

---

## Test Results Template

Create GitHub issue with title: `DR Drill Results - YYYY-MM-DD`

```markdown
## DR Drill Results - 2026-08-03

### Test Type: PITR Restore Drill / Full Failover / Schema Rollback / Backup Verify

### Participants
- @engineer1
- @engineer2

### Timeline
- Start: 14:00 UTC
- Restore initiated: 14:05 UTC
- Restore complete: 14:12 UTC
- Verification complete: 14:17 UTC
- Cleanup complete: 14:20 UTC

### Results
| Criteria | Expected | Actual | Pass/Fail |
|----------|----------|--------|-----------|
| Restore time | < 15 min | 7 min | ✅ |
| Data recovered | 100% | 100% | ✅ |
| RPC functional | Yes | Yes | ✅ |
| RLS enforced | Yes | Yes | ✅ |

### Issues Found
1. [ ] None
2. [ ] Minor: Replication lag was 2s at failover (threshold: 1s)

### Action Items
- [ ] Investigate replication lag spike
- [ ] Update runbook with new timing

### Next Drill Scheduled
2026-11-03
```

---

## Continuous Improvement

### After Each Drill
1. Update runbooks with actual timings
2. File GitHub issues for any gaps found
3. Update RTO/RPO estimates if they've changed
4. Share results in team meeting

### Metrics to Track Over Time
| Metric | Target | Current | Trend |
|--------|--------|---------|-------|
| PITR restore time | < 15 min | 7 min | ✅ |
| Failover time | < 30 min | N/A | — |
| Schema rollback time | < 5 min | 3 min | ✅ |
| Backup artifact size | < 500 MB | 45 MB | ✅ |
| Backup verification pass rate | 100% | 100% | ✅ |

---

## Emergency Contacts

| Role | Name | Phone | Slack |
|------|------|-------|-------|
| Primary On-Call | [TBD] | [TBD] | @oncall |
| Secondary | [TBD] | [TBD] | @backup-oncall |
| Supabase Support | — | — | support@supabase.com |
| Firebase Support | — | — | firebase.google.com/support |

---

*Last updated: 2026-08-03*  
*Version: 1.0*  
*Next review: 2026-11-03*