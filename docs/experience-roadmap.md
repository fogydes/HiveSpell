# Experience Roadmap

This roadmap is the next-phase plan for HiveSpell after the recent backend hardening and gameplay refactors. It is based on a scan of the current codebase with a specific goal in mind: make room for bold, interactive themes and motion without turning the app into a pile of one-off visual hacks.

The existing architecture roadmap in [`roadmap.md`](./roadmap.md) is still the right reference for backend safety and maintainability. This document focuses on product feel, visual systems, theming, motion, and the UX work that needs to support those things.

## Project Scan Summary

The app already has some strong pieces to build on:

- realtime gameplay now lives in smaller hooks and components instead of one giant page
- a theme context exists and already persists equipped customization
- the shop, stash, profile, friends, chat, and notifications surface a real product beyond the core game
- there is now a lightweight toast pattern instead of browser alerts in the main user flows

The main design-system constraints from the current code are:

- themes are mostly color palettes, not full visual identities
- motion is scattered across components instead of being a shared system
- several major screens still hardcode colors and gradients, so they will not fully respond to future theme work
- cursor and badge effects are item-specific one-offs, not a general customization engine
- many overlays share the same modal shape but duplicate structure and animation choices
- accessibility and reduced-motion behavior are not yet a first-class part of the visual system

## New Direction: Themes As Full Packages

For the next phase, a "theme" should no longer mean "a palette plus maybe an effect." It should mean a bundled experience with its own visual language and behavior.

Each theme package should be able to define:

- color tokens
- typography choices
- surface recipes
- background layers
- SVG assets and decorative motifs
- cursor visuals and cursor behavior
- badge styling
- motion presets
- ambient effects
- gameplay reactions
- win and fail feedback treatments
- optional audio identity hooks later if we want them

This is a bigger shift than the current setup in [`../context/SettingsContext.tsx`](../context/SettingsContext.tsx) and [`../data/customizationCatalog.ts`](../data/customizationCatalog.ts), but it is the right one if the goal is truly distinct themes.

## Current Design Hotspots

These are the files that matter most for the next design phase.

### Theme backbone

- [`../context/SettingsContext.tsx`](../context/SettingsContext.tsx)
- [`../styles.css`](../styles.css)
- [`../data/customizationCatalog.ts`](../data/customizationCatalog.ts)

Current limitation:

The theme system controls colors only. It does not yet own typography, shadows, radii, gradients, background layers, scene effects, motion timing, or theme-specific interaction rules.

### Theme-breaking screens

- [`../views/Home.tsx`](../views/Home.tsx)
- [`../views/Auth.tsx`](../views/Auth.tsx)
- [`../views/Shop.tsx`](../views/Shop.tsx)
- [`../views/NotFound.tsx`](../views/NotFound.tsx)

Current limitation:

These views still contain hardcoded colors and bespoke background styling, so new themes will feel inconsistent unless they are converted to shared visual tokens and layered scene components.

### Gameplay presentation layer

- [`../views/Play.tsx`](../views/Play.tsx)
- [`../components/play/GameplayStage.tsx`](../components/play/GameplayStage.tsx)
- [`../components/play/PlayerListPanel.tsx`](../components/play/PlayerListPanel.tsx)
- [`../components/play/RoomChatPanel.tsx`](../components/play/RoomChatPanel.tsx)

Current limitation:

Gameplay now has a clean enough structure for a visual pass, but its atmosphere is still mostly one glow blob and color-driven states. This is the best place to add scene layers, reactive effects, and better state transitions.

### Customization effects

- [`../components/CustomizationEffects.tsx`](../components/CustomizationEffects.tsx)

Current limitation:

This currently supports a single cursor trail. It proves the concept, but not the system. Interactive themes will need a more general effects engine with theme-aware layers and guardrails for performance.

### Shared chrome

- [`../components/Header.tsx`](../components/Header.tsx)
- [`../components/ProfileModal.tsx`](../components/ProfileModal.tsx)
- [`../components/FriendsPanel.tsx`](../components/FriendsPanel.tsx)
- [`../components/ChatPanel.tsx`](../components/ChatPanel.tsx)
- [`../context/ToastContext.tsx`](../context/ToastContext.tsx)

Current limitation:

The app now has recognizable product surfaces, but they still use slightly different spacing, animations, shadow treatments, and background logic. A stronger shared visual language would make the product feel more intentional.

## What Needs To Improve Before "Cool Themes" Will Really Work

### 1. Theming must expand beyond color

Every theme should be able to define:

- palette
- background treatment
- text treatment
- surface texture
- border style
- shadow style
- glow style
- motion speed and easing
- icon tone
- scene overlays
- gameplay accent effects

If we do not add those token groups, every new theme will require ad hoc component edits.

### 2. Motion needs a language, not isolated animations

Right now the app uses a handful of animation utilities plus many inline transitions. That is enough for polish, but not enough for a distinct theme identity.

We need shared motion categories such as:

- entrance
- hover
- emphasis
- gameplay urgency
- reward
- failure
- background ambience

Each category should have a default behavior and an optional theme override.

### 3. Themes need an asset pipeline

If themes are going to ship with unique SVGs, cursor art, masks, overlays, and decorative assets, we need a predictable way to organize them.

That means:

- a theme manifest or registry
- a consistent asset folder structure
- rules for inline SVG vs image asset vs CSS mask
- fallback behavior if a theme asset is missing
- preload strategy for assets used in gameplay

Without that, theme work will turn into asset scavenging spread across random components.

### 4. Screens need scene layers

To build memorable themes, pages need a predictable structure:

- base background
- texture or pattern layer
- ambient light layer
- interactive accent layer
- content layer

Right now many screens jump straight from page container to content. That limits how expressive themes can get.

### 5. Theme-specific cursor and accessory behavior needs a real model

If each theme may have its own cursor, badge treatment, and animation personality, then customization cannot stay as flat items only.

We will likely need:

- a theme package that declares its default cursor set
- optional theme-exclusive accessories
- shared customization slots with theme-aware rendering
- rules for whether cursors are universal, theme-bound, or both

Right now [`../components/CustomizationEffects.tsx`](../components/CustomizationEffects.tsx) is proving the cursor idea, but not the architecture for many different cursors.

### 6. Performance guardrails have to exist from day one

Interactive themes can get expensive fast. We should assume future effects may include:

- particle trails
- parallax layers
- animated gradients
- streak bursts
- timer pressure pulses
- win-state celebration layers

That means we need:

- reduced-motion support
- low-spec fallback behavior
- effect count caps
- throttled pointer-driven effects
- a clear rule for when an effect belongs in CSS vs canvas vs DOM

## Experience Roadmap

## Phase 1: Define The Theme Package Contract

Objective: decide what a theme is before building more themes.

Steps:

1. Replace the idea of a theme as a simple `ThemeId -> colors` record with a richer package shape.
2. Define a theme manifest that can describe:
   - visual tokens
   - motion tokens
   - SVG and image assets
   - cursor definitions
   - optional badge styling
   - effect hooks
3. Decide how themes relate to inventory:
   - theme unlock
   - included cursor
   - optional bonus items
4. Add a home for theme assets such as `public/themes/<theme-id>/...` or a similar organized structure.

Exit criteria:

- we have a stable contract for what makes up a theme package
- new themes can be added without custom wiring in unrelated components

## Phase 2: Build A Real Visual Token System

Objective: turn the current theme palette model into a full art-direction system.

Steps:

1. Expand [`../context/SettingsContext.tsx`](../context/SettingsContext.tsx) theme definitions to include:
   - background gradients
   - surface elevation
   - shadow recipes
   - glow recipes
   - border recipes
   - motion timings
   - accent textures
2. Move repeated visual recipes out of page components and into shared CSS variables or theme objects.
3. Replace hardcoded screen colors in Home, Auth, Shop, and NotFound with theme-aware tokens.
4. Add semantic naming for surfaces such as `hero`, `panel-muted`, `danger`, `success`, `overlay`, and `stage`.

Exit criteria:

- a theme can change the app identity without editing every screen
- pages no longer have to hardcode their own base palette

## Phase 3: Add A Scene Layer Architecture

Objective: give each major screen a structure that can host interactive themes cleanly.

Steps:

1. Create reusable scene wrappers for:
   - full-page hero screens
   - gameplay arena screens
   - modals and overlays
2. Standardize layer order:
   - backdrop
   - pattern
   - atmosphere
   - interactive FX
   - content
3. Use this first in:
   - [`../views/Home.tsx`](../views/Home.tsx)
   - [`../views/Auth.tsx`](../views/Auth.tsx)
   - [`../views/Play.tsx`](../views/Play.tsx)
   - [`../views/Shop.tsx`](../views/Shop.tsx)

Exit criteria:

- every major screen can host a theme-specific atmosphere without layout hacks

## Phase 4: Build A Theme FX Engine

Objective: make interactive themes a system instead of a series of special cases.

Steps:

1. Evolve [`../components/CustomizationEffects.tsx`](../components/CustomizationEffects.tsx) into an effect host that can render:
   - cursor effects
   - ambient theme effects
   - gameplay burst effects
   - SVG-driven decorative layers
   - theme-specific cursor variants
2. Give each theme optional effect definitions:
   - idle ambience
   - pointer reaction
   - win burst
   - error state response
   - accessory-specific reactions
3. Separate decorative effects from gameplay-critical UI so readability stays intact.
4. Add effect guardrails for:
   - maximum DOM nodes
   - pointer throttling
   - reduced motion

Exit criteria:

- new themes can ship with real interactivity, not just recolors
- effects can be turned down without breaking the interface

## Phase 5: Define A Motion System

Objective: make animations feel authored and consistent.

Steps:

1. Replace scattered animation choices with shared motion tokens in [`../styles.css`](../styles.css).
2. Introduce named motion primitives such as:
   - reveal
   - drift
   - bloom
   - pulse
   - streak
   - collapse
   - victory
3. Audit current one-off animation classes and inline transition values.
4. Add `prefers-reduced-motion` support.
5. Define when motion should communicate information vs pure decoration.

Exit criteria:

- animations feel cohesive across screens
- themes can alter motion personality without component rewrites

## Phase 6: Redesign The Core Screens

Objective: make the product feel deliberate before adding more cosmetic content.

Priority order:

1. Home
2. Auth
3. Play
4. Shop
5. Stash
6. Header and profile surfaces

What to improve:

- stronger typography hierarchy
- better spacing rhythm
- more distinctive empty states
- more branded modal structure
- better mobile behavior
- fewer hardcoded decorative decisions

Exit criteria:

- the app feels like one product, not a set of separate screens

## Phase 7: Theme The Gameplay Dramatically But Carefully

Objective: make the arena feel alive without compromising legibility.

Potential gameplay-theme hooks:

- streak thresholds trigger visual escalations
- timer pressure subtly changes stage intensity
- correct answers create themed micro-bursts
- eliminations change room atmosphere
- intermission has a distinct visual state
- winner reveal gets a dedicated celebration layer

Rules:

- typed text and prompt clarity always win over spectacle
- urgency effects should never hide the timer or input
- contrast must remain readable for every theme

Exit criteria:

- the arena feels dynamic and thematic, not just tinted

## Phase 8: Polish Supporting Product Surfaces

Objective: bring the social and customization surfaces up to the same quality bar.

Targets:

- leaderboard modal in [`../components/Header.tsx`](../components/Header.tsx)
- friends and chat panels
- notifications
- profile modal
- stash and shop relationship
- toast styling and variants

Improvements:

- standard modal anatomy
- clearer feedback states
- better icon rhythm
- better loading and empty states
- theme-aware panel styling

Exit criteria:

- the non-game parts of the app feel as intentional as the arena

## Phase 9: Accessibility And Performance Pass

Objective: make rich visuals safe to ship.

Steps:

1. Add reduced-motion fallbacks.
2. Audit contrast theme by theme.
3. Check keyboard navigation for modals and overlays.
4. Cap expensive DOM-based effects.
5. Measure animation impact on lower-end mobile devices.

Exit criteria:

- interactive themes do not punish accessibility or performance

## Recommended First Theme Concepts

These are good candidates because they can be visually unique without turning unreadable.

### 1. Cathedral Hive

Mood:

Golden stained-glass bee sanctuary.

Interaction ideas:

- stained-light beams drift across the arena
- win states trigger a radiant rose-window pulse
- timer pressure narrows the light and deepens shadow
- custom cursor becomes a stained-glass bee shard with warm trailing embers
- panels use ornamental SVG tracery instead of plain borders

### 2. Stormglass

Mood:

A rain-streaked electric observatory.

Interaction ideas:

- subtle window condensation and drifting rain lines
- correct answers spark thin electric traces
- high streaks cause distant lightning flickers
- cursor becomes a refracted storm pointer with tiny chromatic splits
- the timer can use rotating storm-band SVG sweeps

### 3. Mycelium Court

Mood:

Bioluminescent fungal hive.

Interaction ideas:

- soft spore drift in background layers
- cursor movement nudges glowing motes
- success states send branching vein pulses through surfaces
- the cursor becomes a glowing spore cluster that sheds short-lived particles
- badges can feel grown rather than stamped

### 4. Arcade Apiary

Mood:

A premium retro machine, not generic neon vaporwave.

Interaction ideas:

- split-flap counters
- scanline glass layer
- punchy score pops and compressed reward bursts
- cursor can become a premium arcade reticle instead of a browser pointer
- SVG cabinet trim can frame panels and overlays

### 5. Astral Archive

Mood:

A scholar's observatory full of constellations and moving charts.

Interaction ideas:

- correct words light up faint constellation nodes
- timer uses orbital sweep motion instead of a plain bar glow
- badges feel like earned sigils instead of stickers
- cursor can become a star-chart pointer with faint orbital tails
- SVG chartwork can animate subtly in page corners

## Recommended Build Order For The Design Phase

1. full visual token expansion
2. theme asset and manifest structure
3. scene layer wrappers
4. motion system cleanup
5. one flagship theme prototype
6. gameplay FX integration
7. screen-by-screen redesign pass
8. accessibility and perf cleanup

This order matters. If we jump directly to theme art without the token and scene systems, we will end up hardcoding every effect into individual components.

## What I Would Personally Do First

If we start this next phase together, my recommended first implementation slice is:

1. expand the theme model beyond colors
2. define the asset and cursor contract for themes
3. convert Home and Auth into theme-aware hero screens
4. build one flagship interactive theme end to end
5. only then spread the pattern into Play, Shop, and Stash

That gives us one real visual language to prove out before we duplicate effort.
