# Code Quality & Architecture Improvements

## Phase 1: Quick Fixes
- [x] Delete SECURITY.md
- [x] Add include/exclude to tsconfig.json

## Phase 2: Fix Firebase `as any` Casts
- [x] firebase.ts — proper modular imports
- [x] Auth.tsx — proper modular imports
- [x] Header.tsx — proper modular imports
- [x] AuthContext.tsx — proper imports + real User type + removed deprecated `stars` from UserData
- [x] Play.tsx — proper imports (runTransaction, onDisconnect), renamed stars→nectar local vars

## Phase 3: Architecture Cleanup
- [x] MultiplayerContext.tsx — removed dead sendBeacon code
- [x] Header.tsx — simplified nectar display (removed stars fallback)

## Phase 4: Extract Word Data
- [x] Created data/words.ts with word lists, definitions, MODE_ORDER, wordBank, getWordDifficulty
- [x] Slimmed gameService.ts to logic-only (~280 lines vs ~1428), re-exports from data/words

## Verification
- [x] `tsc --noEmit` passes
- [x] `npm run build` succeeds
