# Improvement Plan

This plan addresses the findings from a full project audit covering security, code quality, database design, and application architecture. It complements the existing [roadmap](./roadmap.md) and [data-ownership plan](./data-ownership.md) without duplicating them.

Work is organized into six tracks that can be executed in parallel where noted. Each track is broken into concrete tasks with priority, effort estimate, and dependencies.

---

## Track 1: Security Hardening

**Goal**: Eliminate exploitable vulnerabilities in Firebase rules, hosting config, and client trust boundaries.

### 1.1 — Fix Firebase Realtime Database Rules (Critical, ~2h)

**Problem**: Several rules are too permissive and allow data leakage or manipulation.

**Tasks**:

1. **Restrict `users` read access**
   - Change `.read: true` to `.read: "auth != null"` at minimum.
   - Ideally scope to `$uid: { ".read": "auth != null" }` so users can only read their own doc (unless a public profile subset is needed).

2. **Scope `presence` writes to own key**
   ```json
   "presence": {
     ".read": "auth != null",
     "$uid": {
       ".write": "auth != null && $uid === auth.uid"
     }
   }
   ```

3. **Restrict `gameState` sensitive fields to host-only**
   - `currentWord`, `winnerId`, `winnerName`, `currentTurnPlayerId`, `turnOrder` should only be writable by the room host:
   ```json
   "currentWord": {
     ".write": "auth.uid === data.parent().parent().child('hostId').val()",
     ".validate": "newData.isString() || !newData.exists()"
   }
   ```
   - Fields like `currentInput` and `currentPlayerWpm` can remain writable by the current turn player.

4. **Add chat message validation**
   ```json
   "chat": {
     "$messageId": {
       ".validate": "newData.hasChild('text') && newData.hasChild('sender') && newData.child('text').isString() && newData.child('text').val().length <= 500 && newData.child('sender').val() === auth.uid"
     }
   }
   ```

5. **Test all rules changes** against normal gameplay flows before deploying.

**Dependencies**: None. Can start immediately.  
**Risk**: Overly strict rules break gameplay. Mitigate by testing each change in isolation.

---

### 1.2 — Add Security Headers to Hosting (Medium, ~30min)

**Problem**: No CSP, clickjacking protection, or content-type enforcement.

**Task**: Update `firebase.json` hosting config:

```json
"headers": [
  {
    "source": "**",
    "headers": [
      { "key": "X-Frame-Options", "value": "DENY" },
      { "key": "X-Content-Type-Options", "value": "nosniff" },
      { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
      { "key": "Permissions-Policy", "value": "camera=(), microphone=(self), geolocation=()" },
      {
        "key": "Content-Security-Policy",
        "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https://api.dicebear.com https://*.supabase.co data:; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://*.supabase.co wss://*.firebaseio.com https://api.dictionaryapi.dev; font-src 'self'; media-src 'self' blob: https://*.supabase.co; frame-ancestors 'none'"
      }
    ]
  }
]
```

**Dependencies**: None.  
**Note**: CSP will need tuning as third-party integrations are discovered. Start in report-only mode if unsure.

---

### 1.3 — Remove Client-Side Reward Fallback (High, ~1h)

**Problem**: `profileService.ts` falls back to a direct upsert if the backend RPC doesn't exist. A malicious client can trigger this to self-award arbitrary progression.

**Tasks**:

1. Verify that `award_profile_win` and `apply_correct_answer_reward` RPCs are deployed in all environments.
2. Remove the `isMissingRpcError` fallback code path from `profileService.ts`.
3. If the RPC is missing, throw an error and surface it to the user rather than silently falling back.
4. Add a health-check utility that verifies RPC availability at startup (development only).

**Dependencies**: Requires backend RPCs to be deployed first.

---

### 1.4 — Strengthen Room Code Generation (Low, ~15min)

**Problem**: `Math.random()` is predictable.

**Task**: Replace in `multiplayerService.ts`:

```typescript
const code = Array.from(crypto.getRandomValues(new Uint8Array(4)))
  .map(b => b.toString(36).padStart(2, '0'))
  .join('')
  .substring(0, 6)
  .toUpperCase();
```

**Dependencies**: None.

---

### 1.5 — Strip Debug Logs from Production (Medium, ~1h)

**Problem**: `console.log` calls expose room IDs, player data, and internal flow in production.

**Tasks**:

1. Create a `utils/logger.ts` module that only logs in development:
   ```typescript
   export const log = (...args: unknown[]) => {
     if (import.meta.env.DEV) console.log(...args);
   };
   ```
2. Replace all `console.log` calls in services and contexts with `log()`.
3. Keep `console.error` and `console.warn` for genuine errors.
4. Consider adding a Vite plugin to strip console calls in production builds as an additional safety net.

**Dependencies**: None.

---

## Track 2: Database & Backend Integrity

**Goal**: Ensure data consistency, proper access control at the Supabase layer, and schema reliability.

### 2.1 — Audit and Document Supabase RLS Policies (High, ~3h)

**Problem**: No RLS policies are visible in the codebase. If they're misconfigured, any authenticated user could read/write any profile.

**Tasks**:

1. Connect to Supabase dashboard and export current RLS policies for all tables.
2. Document expected policies:
   - `profiles`: Users can read any profile. Users can only update their own row (`auth.uid() = id`).
   - `friendships`: Users can read rows where they are requester or addressee. Write restricted to involved parties.
   - `messages`: Users can read/write messages where they are sender or receiver.
   - `notifications`: Users can only read/update their own notifications.
3. If policies are missing, create them via migrations.
4. Add an RLS test script that verifies expected access patterns.

**Dependencies**: Requires Supabase project access.

---

### 2.2 — Implement Proper Schema Migrations (Medium, ~2h)

**Problem**: Only one ad-hoc SQL file exists. No migration framework.

**Tasks**:

1. Initialize Supabase CLI migrations: `supabase db init` (if not already done).
2. Create migration files for the current schema as the baseline.
3. Move `docs/sql/add-equipped-theme.sql` into the proper migration directory.
4. Document the migration workflow in `docs/development.md`.
5. Add a CI step that validates migrations can be applied cleanly.

**Dependencies**: Supabase CLI (`supabase` is already in devDependencies).

---

### 2.3 — Add Room TTL and Server-Side Cleanup (Medium, ~3h)

**Problem**: Zombie rooms persist indefinitely. Client-side cleanup in `findPublicRoom` is unreliable.

**Options** (choose one):

- **Option A — Firebase Scheduled Function**: A Cloud Function that runs every 5 minutes and deletes rooms older than 1 hour with all players disconnected.
- **Option B — Client-side TTL enforcement**: When subscribing to a room, check `createdAt + TTL < now` and auto-delete. Less reliable but requires no backend deployment.

**Recommended**: Option A if Firebase Functions are available. Option B as interim.

**Dependencies**: Firebase Functions billing/setup.

---

### 2.4 — Complete `.env.template` (Low, ~5min)

**Task**: Add missing Supabase entries:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

**Dependencies**: None.

---

## Track 3: Code Quality & Architecture

**Goal**: Reduce complexity, improve type safety, and make the codebase more maintainable.

### 3.1 — Decompose AuthContext (High, ~4h)

**Problem**: Single 200+ line context handles Firebase auth, Supabase profile loading, migration, and state merging.

**Tasks**:

1. Extract `useFirebaseAuth()` hook — handles `onAuthStateChanged` and returns `user`.
2. Extract `useProfileLoader(user)` hook — loads Supabase profile and returns `userData`.
3. Extract `useLegacyMigration(user, firebaseData)` hook — handles one-time Firebase→Supabase migration.
4. Simplify `AuthProvider` to compose these hooks.
5. Add error recovery: if profile load fails, retry with exponential backoff instead of silently continuing.

**Dependencies**: Should happen after Track 2.1 (RLS audit) to avoid hitting permissions issues during refactor.

---

### 3.2 — Fix MultiplayerContext Memoization (Medium, ~1h)

**Problem**: Functions in the context value are recreated every render despite `useMemo`.

**Tasks**:

1. Wrap `createGameRoom`, `joinGameRoom`, `joinPublicGame`, `leaveGameRoom` with `useCallback`.
2. Use stable references (refs) for values that change frequently but shouldn't trigger re-renders of consumers.
3. Verify with React DevTools Profiler that consumers don't re-render unnecessarily.

**Dependencies**: None.

---

### 3.3 — Add React Error Boundary (Medium, ~1h)

**Problem**: Any unhandled exception crashes the entire app to a white screen.

**Tasks**:

1. Create `components/ErrorBoundary.tsx` with a user-friendly fallback UI.
2. Wrap `AppRoutes` in the error boundary.
3. Add error reporting (even just `console.error` with component stack for now).
4. Consider a "Retry" button that resets state.

**Dependencies**: None.

---

### 3.4 — Eliminate Type Assertions (Medium, ~2h)

**Problem**: `as Room`, `as any`, `as Player` throughout the codebase hide type errors.

**Tasks**:

1. Audit all `as` casts and `any` types in `context/` and `services/`.
2. Replace with proper type guards or narrowing.
3. Where Firebase returns `unknown`, create a `parseRoom(data: unknown): Room | null` validator.
4. Enable stricter TypeScript options (`noUncheckedIndexedAccess`) incrementally.

**Dependencies**: None. Can be done file-by-file.

---

### 3.5 — Pin Dependency Versions (Low, ~15min)

**Problem**: `^` ranges allow minor/patch updates that could break the build.

**Task**: Replace `^` with exact versions in `package.json` for all production dependencies. Keep `^` for devDependencies where breakage is less impactful.

**Dependencies**: None.

---

### 3.6 — Remove Dead Code and Developer Comments (Low, ~30min)

**Tasks**:

1. Remove the developer comment in ChatPanel's empty-state UI.
2. Remove unused imports (run `npx tsc --noEmit` and check for warnings).
3. Remove any commented-out code blocks.

**Dependencies**: None.

---

## Track 4: Frontend Resilience

**Goal**: Make the app more robust against network failures, race conditions, and edge cases.

### 4.1 — Add Retry Logic for Supabase Calls (Medium, ~2h)

**Problem**: Network failures in Supabase calls throw silently. Users see stale or missing data with no recovery path.

**Tasks**:

1. Create a `utils/retry.ts` utility with exponential backoff:
   ```typescript
   export async function withRetry<T>(
     fn: () => Promise<T>,
     maxAttempts = 3,
     baseDelay = 500
   ): Promise<T> { ... }
   ```
2. Apply to critical paths: profile loading, reward RPCs, friend operations.
3. Surface persistent failures to the user via toast notifications.

**Dependencies**: None.

---

### 4.2 — Add Offline/Connectivity Awareness (Medium, ~2h)

**Problem**: If the user loses connectivity, Firebase operations fail silently and the UI shows stale state.

**Tasks**:

1. Create a `useOnlineStatus()` hook that tracks `navigator.onLine` and Firebase `.info/connected`.
2. Show a subtle banner when disconnected.
3. Disable destructive actions (room creation, friend requests) while offline.
4. Auto-reconnect room subscriptions when connectivity returns.

**Dependencies**: None.

---

### 4.3 — Validate Chat and Message Content (Medium, ~1h)

**Problem**: User-generated content in chat could contain malicious payloads.

**Tasks**:

1. Audit all places where user content is rendered. Ensure React's default escaping is used (no `dangerouslySetInnerHTML`).
2. Add max-length enforcement client-side before sending messages.
3. Sanitize display names when rendering (truncate, strip control characters).
4. Firebase rules already enforce server-side (after Task 1.1).

**Dependencies**: Track 1.1.

---

## Track 5: Accessibility & UX

**Goal**: Make the app usable for all users and polished for production.

### 5.1 — Add ARIA Labels and Keyboard Navigation (Medium, ~3h)

**Tasks**:

1. Audit all icon-only buttons and add `aria-label` attributes.
2. Add `role="dialog"` and `aria-modal="true"` to all modal overlays.
3. Implement focus trapping in modals (FriendsPanel, ChatPanel, ProfileModal).
4. Ensure Escape key closes all modals consistently.
5. Add skip-to-content link for keyboard users.

**Dependencies**: None.

---

### 5.2 — Replace Native `confirm()` Dialogs (Low, ~1h)

**Problem**: `confirm()` in FriendsPanel breaks the design language and isn't accessible.

**Task**: Create a reusable `ConfirmDialog` component that matches the app's visual style and supports keyboard/screen reader usage.

**Dependencies**: None.

---

### 5.3 — Add Loading Skeletons (Low, ~2h)

**Problem**: Panels show spinners or blank space while loading.

**Task**: Create skeleton placeholder components for:
- Friend list items
- Chat conversation list
- Profile modal content
- Leaderboard rows

**Dependencies**: None. Cosmetic improvement.

---

## Track 6: Developer Experience & CI

**Goal**: Make contributing safer and faster.

### 6.1 — Add Linting (Medium, ~1h)

**Tasks**:

1. Add ESLint with `@typescript-eslint` and React hooks plugin.
2. Configure rules: no `any`, no unused vars, hooks exhaustive-deps.
3. Add `"lint": "eslint . --ext .ts,.tsx"` to `package.json`.
4. Add lint step to CI workflow.

**Dependencies**: None.

---

### 6.2 — Add Pre-commit Checks (Low, ~30min)

**Tasks**:

1. Add `lint-staged` and `husky`.
2. Run typecheck and lint on staged files before commit.
3. Document in `CONTRIBUTING.md`.

**Dependencies**: Track 6.1.

---

### 6.3 — Expand CI Pipeline (Medium, ~1h)

**Tasks**:

1. Add test execution to the GitHub Actions workflow.
2. Add typecheck step.
3. Add build verification.
4. Consider adding a Lighthouse CI check for performance/accessibility.

**Dependencies**: None.

---

### 6.4 — Add Integration Tests for Room Lifecycle (High, ~4h)

**Tasks**:

1. Set up Firebase emulator for local testing.
2. Write tests for: room creation, player join, player leave, room cleanup.
3. Test Firebase rules against the emulator (security rules unit tests).
4. Add to CI.

**Dependencies**: Firebase emulator setup.

---

## Execution Order

The tracks can be parallelized, but within each the ordering matters. Here's the recommended global priority:

### Week 1: Security (Critical Path)
- Track 1.1 — Firebase rules fix
- Track 1.2 — Security headers
- Track 1.3 — Remove reward fallback (if RPCs are deployed)
- Track 2.4 — Complete .env.template

### Week 2: Stability & Backend Integrity
- Track 2.1 — RLS audit
- Track 2.2 — Schema migrations
- Track 3.3 — Error boundary
- Track 1.4 — Room code generation
- Track 1.5 — Strip debug logs

### Week 3: Code Quality
- Track 3.1 — Decompose AuthContext
- Track 3.2 — Fix memoization
- Track 4.1 — Retry logic
- Track 4.3 — Content validation
- Track 3.5 — Pin dependencies

### Week 4: Polish & DX
- Track 5.1 — Accessibility
- Track 6.1 — Linting
- Track 6.3 — CI expansion
- Track 3.4 — Eliminate type assertions
- Track 3.6 — Clean dead code

### Ongoing
- Track 2.3 — Room TTL (depends on Firebase Functions decision)
- Track 4.2 — Offline awareness
- Track 5.2, 5.3 — UX polish
- Track 6.2, 6.4 — DX improvements

---

## Success Criteria

The improvement plan is complete when:

- No critical or high-severity security issues remain in Firebase rules or hosting
- Supabase RLS policies are documented and tested
- Client code cannot self-award progression in production
- AuthContext is decomposed and testable
- An error boundary prevents white-screen crashes
- CI runs lint, typecheck, tests, and build on every PR
- Core gameplay and room flows have integration test coverage
- All modal/overlay components are keyboard-accessible

---

## Relationship to Existing Roadmap

This plan covers security and quality concerns that the existing [roadmap](./roadmap.md) touches lightly. The roadmap's phases 2–4 (data ownership, trusted backend, shop) remain the strategic direction. This plan provides the tactical foundation that makes those phases safer to execute.

Specifically:
- Track 1 enables safe gameplay rule changes
- Track 2 enables confident schema evolution
- Track 3 reduces the blast radius of future refactors
- Track 6 catches regressions introduced by roadmap work
