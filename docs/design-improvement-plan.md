# Design Improvement Plan

Based on a full visual audit of every screen (desktop + mobile), this document captures what a user would find annoying, confusing, or unpolished — and proposes concrete fixes.

---

## Critical UX Issues (Things Users Would Immediately Dislike)

### 1. Floating sidebar overlaps content on mobile and lobby

**What's wrong**: The left-side floating buttons (Shop 🛒, Leaderboard 🏆, Inventory 🎒) overlap the lobby difficulty cards. On the lobby screenshot, the "Baby" card title is partially hidden behind the trophy and bag icons. On mobile, the hamburger menu icon also overlaps the "STREAK" label in gameplay.

**Fix**: 
- Hide the floating sidebar on pages that have their own navigation (lobby already has its own Shop/Leaderboard/Inventory bar at the top)
- On mobile gameplay, move the hamburger trigger to a non-overlapping position or make it a bottom sheet toggle
- Consider making the sidebar contextual: only show on Home, hide on Lobby/Play

---

### 2. The "Private Code" input bar floats over lobby cards

**What's wrong**: The fixed-bottom "ENTER PRIVATE CODE" bar sits on top of the difficulty grid, obscuring the middle row of cards on both desktop and mobile. Users scrolling through difficulties will always have this bar blocking content.

**Fix**:
- Make the private code input part of the page flow (place it above or below the difficulty grid) instead of fixed to the bottom
- Or make it collapsible/dismissible
- Or place it at the top of the lobby as a compact bar

---

### 3. Lobby difficulty grid has inconsistent card heights on desktop

**What's wrong**: The 4-column desktop grid shows cards at different heights because some difficulty names are longer. The last row has only 2 cards (Polymath, Omniscient) leaving an awkward gap.

**Fix**:
- Use consistent card dimensions with the title always on one line
- Consider a 3-column grid that fills more evenly (8 items ÷ 3 = 3 rows)
- Or use a horizontal scrolling strip for difficulties with a more compact card design

---

### 4. No visual feedback when "Public Match" is loading

**What's wrong**: When a user clicks "Public Match," there's no immediate loading indicator. The button says "Connecting..." but during the brief auth hydration race condition, nothing happens at all — the user thinks it's broken.

**Fix**:
- Add a loading spinner on the button immediately on click
- Disable all match buttons while any join/create is in progress
- Show a skeleton or "Searching for players..." overlay while matchmaking

---

### 5. The game room code overlaps the definition text

**What's wrong**: In private games, the room code ("CODE: 5D3X6S") is positioned absolute top-right and visually collides with the definition text box. It's hard to read both.

**Fix**:
- Move the room code into the header bar area or the player panel
- Or display it as a subtle badge below the "Exit Arena" button
- Make it copy-on-click with a tooltip

---

## Visual Polish Issues (Things That Feel Unfinished)

### 6. Home page feels empty and generic

**What's wrong**: The home page has a big title, one CTA button, and a tagline. For a logged-in user, it's just a "Continue to Lobby" wrapper with no useful information. The decorative star elements in the corners don't contribute meaning.

**Improvements**:
- For logged-in users, show quick stats (last session, current streak, recent activity)
- Add a "Quick Play" button that skips the lobby
- Show friends currently online or recent match results
- Consider making the lobby the default landing page for logged-in users (skip Home entirely)

---

### 7. Auth page shows header with nectar/profile when not logged in

**What's wrong**: The header shows "🍯 9530 NEWBEE" and a profile picture even on the auth page. This is confusing — if I'm on the login page, why is user data showing? (This appears to be because the user is already logged in and visiting /auth, but if a new user sees it, it would be empty/broken)

**Fix**:
- Hide the header entirely on the auth page
- Or show a minimal header (just the logo)
- Redirect logged-in users away from /auth automatically

---

### 8. Leaderboard modal is too plain

**What's wrong**: It's a simple list with no rank numbers, no podium treatment, no highlight for the current user's position. The "fire" emoji next to names seems arbitrary — unclear what it means.

**Improvements**:
- Add rank numbers (#1, #2, #3) with medal/podium styling for top 3
- Highlight the current user's row with a distinct background
- Explain what the 🔥 emoji means (active streak? recent activity?)
- Add a "Your Rank" indicator if the user isn't in the visible top

---

### 9. Friends panel is minimal and lacks personality

**What's wrong**: The friends panel is functional but feels like a bare-bones admin list. There's no indication of online status, no way to invite friends to a game, and the "Remove" button is very prominent next to "Profile."

**Improvements**:
- Add online/offline/in-game status indicators
- Add an "Invite to Game" button for online friends
- Make "Remove" harder to accidentally tap (move it behind a "..." menu)
- Show friend's current activity ("Playing baby difficulty")
- Add an empty state with a call to action ("Search for friends to play together")

---

### 10. Chat panel empty state could be warmer

**What's wrong**: "Pick a conversation" with a sparkle icon is functional but cold. The three-pane layout is good but the empty right pane wastes space.

**Improvements**:
- Show recent friend activity or suggest starting a conversation
- Add quick-reply suggestions or recent conversation starters
- Show online friends who haven't been messaged yet as suggestions

---

### 11. Gameplay "LISTENING TO HIVE..." state is unclear

**What's wrong**: When the audio is playing, the UI shows "LISTENING TO HIVE..." with a spinning speaker icon. For new users, this doesn't clearly communicate "a word is being spoken, listen carefully." The speaker button also looks like a loading state rather than "click to replay."

**Improvements**:
- Change text to "Listen to the word..." or "Word playing..."
- Make the replay button more obvious with a "Replay" label
- Add a subtle audio waveform animation to make it feel alive
- Show "Tap to hear again" after first playback

---

### 12. Timer bar turns red too late

**What's wrong**: The timer bar only turns red when below 3 seconds. For short words (5-6s total), this means you're red for half the time. The urgency signal should be proportional.

**Fix**: Turn red at the last 30% of time remaining, not a fixed 3-second threshold.

---

### 13. "ELIMINATED" state in solo play is confusing

**What's wrong**: In solo play, you can't actually be eliminated permanently — intermission restarts you immediately. But the input shows "ELIMINATED" which feels like a game-over. The word correction modal adds more confusion.

**Fix**:
- In solo mode, use "MISSED" instead of "ELIMINATED"
- Make the correction modal less dramatic — a subtle inline toast showing "The word was: X" rather than a blocking modal
- Consider removing the correction modal in favor of showing the answer inline above the input

---

## Mobile-Specific Issues

### 14. Mobile lobby is too long and repetitive

**What's wrong**: 8 difficulty cards stacked vertically with identical button pairs makes for a very long scroll. The private code input bar floats in the middle of the list.

**Fix**:
- Use a compact card design (horizontal layout with difficulty name + "Play" button inline)
- Or use a dropdown/selector for difficulty instead of a card grid
- Group by category: "Easy" (Baby, Cakewalk, Learner), "Medium" (Intermediate, Heated), "Hard" (Genius, Polymath, Omniscient)

---

### 15. Mobile gameplay has the hamburger overlapping stats

**What's wrong**: The "≡" hamburger button sits directly on top of the "STREAK" text, making both harder to read.

**Fix**: Move the menu trigger to a dedicated bottom bar or make it part of the header.

---

### 16. Definition text is too long on mobile

**What's wrong**: The definition box on mobile can take up 40%+ of the screen for long definitions (e.g., "milk" definition was 5+ lines). This pushes the actual input far down.

**Fix**:
- Truncate definitions to 2 lines with "..." and expand on tap
- Or use a smaller font size for definitions on mobile
- Or show the definition above the timer bar instead of at the top

---

## Visual Consistency Issues

### 17. Typography is inconsistent across the app

**What's wrong**: The app uses a wide letter-spacing display font for headers but switches between italic serif definitions, monospace elements (timer), and regular body text inconsistently. Some headers feel "designed" while body text feels like defaults.

**Fix**:
- Establish a clear type scale: Display (headings) → Body (descriptions) → Mono (data/timer) → Serif (definitions only)
- Remove letter-spacing from medium-sized headings — it works for "Welcome to HiveSpell" but not for "Select Difficulty"

---

### 18. Border/glow styling is overused

**What's wrong**: Almost every element has a border + subtle glow. When everything glows, nothing stands out. The lobby cards, the private code bar, the chat panel, the player list — all have identical border-and-glow treatment.

**Fix**:
- Reserve glow/borders for interactive elements (buttons, inputs, the active player)
- Use solid backgrounds with subtle elevation (shadow) for containers instead of border-glow
- Make the gameplay timer and input area the clear visual focus with stronger treatment

---

### 19. Color differentiation for difficulty levels needs improvement

**What's wrong**: Each difficulty has a different colored title (green, teal, blue, purple, pink, red-orange) which is good for differentiation. But the colors aren't labeled or explained — a new user doesn't know what "heated" means in terms of difficulty.

**Fix**:
- Add a difficulty indicator (stars, skull icons, or a numeric level)
- Add a brief hint: "Baby: Common 3-5 letter words" vs "Polymath: Complex vocabulary"
- Use color temperature more intentionally: cool blues for easy → warm reds for hard

---

### 20. Shop/Stash overlays don't have a close-on-escape behavior

**What's wrong**: The leaderboard modal couldn't be closed with Escape, clicking outside didn't dismiss it reliably, and the Shop overlay trapped the user. This was evident during testing — overlay stacking and dismissal is inconsistent.

**Fix**:
- All modals/overlays should close on Escape key
- Clicking the backdrop should always dismiss
- Only one modal should be open at a time (opening a new one closes the previous)
- Add a visible "back" button on mobile overlays

---

## Layout & Information Architecture

### 21. The sidebar (Shop/Leaderboard/Inventory) should be contextual

**What's wrong**: The floating left sidebar appears on every page including gameplay. During a game, you don't need Shop access — it's distracting.

**Fix**:
- Show sidebar on: Home, Lobby
- Hide sidebar on: Auth, Play (gameplay)
- On the Play page, only show the room-specific panels (chat, players)

---

### 22. Profile dropdown is a plain text list

**What's wrong**: The profile dropdown (Profile, Friends, Messages, Settings, Logout) is an unstyled list that appears on hover/click. It has no visual hierarchy and no icons.

**Fix**:
- Add icons to each item
- Group items: social (Profile, Friends, Messages) → settings → destructive (Logout)
- Add a separator before Logout
- Show unread message count next to Messages
- Show pending friend request count next to Friends

---

### 23. Header shows nectar on auth/home pages unnecessarily

**What's wrong**: The "🍯 9530 NEWBEE" badge is always visible, even when it's not actionable. On the home page, users can't spend nectar or do anything with this info.

**Fix**:
- Only show nectar count in contexts where it matters (Lobby, Shop, Stash)
- On Home/Auth, show a minimal header with just logo + login/profile button

---

## Proposed Priority Order

### Phase 1: Fix Blocking UX Issues (1-2 days)
1. Fix sidebar overlapping lobby cards (#1)
2. Fix private code bar overlapping cards (#2)
3. Fix room code overlapping definition (#5)
4. Add loading state to match buttons (#4)
5. Fix modal dismiss behavior (#20)

### Phase 2: Mobile Improvements (1-2 days)
6. Fix mobile hamburger overlap (#15)
7. Compact lobby for mobile (#14)
8. Truncate long definitions on mobile (#16)

### Phase 3: Gameplay Polish (2-3 days)
9. Improve "LISTENING" state clarity (#11)
10. Fix timer red threshold (#12)
11. Improve solo elimination messaging (#13)
12. Make replay button more obvious

### Phase 4: Visual Consistency (2-3 days)
13. Reduce border/glow overuse (#18)
14. Fix typography consistency (#17)
15. Add difficulty indicators to lobby (#19)
16. Make sidebar contextual (#21)

### Phase 5: Feature Polish (3-4 days)
17. Improve leaderboard (#8)
18. Improve friends panel (#9)
19. Improve profile dropdown (#22)
20. Make home page useful for logged-in users (#6)
21. Improve chat empty state (#10)
22. Contextual header (#23)
23. Fix auth page header (#7)

---

## Design Principles for Implementation

1. **Focus over decoration** — The gameplay input should always be the clearest element on screen. Remove visual noise that competes with it.
2. **Progressive disclosure** — Don't show everything at once. Use the sidebar and overlays contextually.
3. **Consistent depth model** — Flat surfaces for containers, subtle elevation for cards, strong elevation for modals, glow ONLY for the active/focused element.
4. **Mobile-first interaction** — Touch targets should be 44px+. Overlays should be full-screen sheets on mobile. Scroll should never be hijacked.
5. **Clarity over cleverness** — "Type the word you hear" is clearer than "LISTENING TO HIVE...". Use plain language for instructions, save the flavor text for non-critical areas.
