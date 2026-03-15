# Gameplay Guide

## Core Idea

HiveSpell is an audio-first spelling game. Instead of reading a prompt, players hear a word and must type it correctly.

## Modes

The game ships with multiple difficulty tiers defined in [`data/words.ts`](../data/words.ts):

- `baby`
- `cakewalk`
- `learner`
- `intermediate`
- `heated`
- `genius`
- `polymath`
- `omniscient`

`omniscient` combines the full word pool.

## Round Structure

At a high level, a room follows this pattern:

1. players join a room
2. the room enters active play
3. a word is selected
4. the current player hears the word
5. the player types an answer before the timer expires
6. the room advances to the next turn or to intermission

## Turn-Based Flow

The current implementation uses turn-based progression rather than simultaneous scoring. Live room state tracks:

- the active word
- the player whose turn it is
- typing input for the active turn
- timing information for the round

Disconnect handling and host migration are also part of the gameplay flow so rooms can continue when players leave unexpectedly.

## Answer Checking

Answer validation in [`services/gameService.ts`](../services/gameService.ts) supports:

- case-insensitive checks
- selected homophone matches
- some US and UK spelling normalization

That means the game can accept certain spelling variants without requiring exact raw string equality.

## Audio

The audio system tries to play a pre-recorded word first. If that is unavailable, the game falls back to browser speech synthesis.

This behavior is implemented in [`services/gameService.ts`](../services/gameService.ts).

For debugging flaky audio loads in the browser, set `localStorage.hivespell_debug_audio = "1"` and reproduce the issue. The client will log timing and fallback details for each audio attempt.

## Definitions

The game can show a definition during play. Definitions come from:

- local definitions bundled in [`data/words.ts`](../data/words.ts)
- a fallback dictionary API request when a local definition is not present

## Stats And Progression

HiveSpell tracks persistent player progression such as:

- correct words
- wins
- title progression
- nectar and inventory-related profile state

Different parts of the app surface these stats through the header, profile modal, and leaderboard.

## Notes For Contributors

When changing gameplay:

- preserve room synchronization assumptions
- test reconnect and disconnect behavior
- test public and private room flows
- test at least one easy and one hard difficulty
