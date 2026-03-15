# Supabase Contracts

This document is for maintainers and contributors working on backend-connected features. It describes the application-side expectations for Supabase resources used by HiveSpell.

## Overview

Supabase is used for profile, social, messaging, storage, and shop-related features.

Primary integration points:

- [`services/supabase.ts`](../services/supabase.ts)
- [`context/AuthContext.tsx`](../context/AuthContext.tsx)
- [`services/friendService.ts`](../services/friendService.ts)
- [`services/messageService.ts`](../services/messageService.ts)
- [`services/notificationService.ts`](../services/notificationService.ts)
- [`views/Shop.tsx`](../views/Shop.tsx)
- [`views/Stash.tsx`](../views/Stash.tsx)

## Expected Tables

### `profiles`

Expected usage in the app suggests these fields:

- `id`
- `username`
- `current_nectar`
- `lifetime_nectar`
- `inventory`
- `equipped_theme`
- `equipped_cursor`
- `equipped_badge`
- `corrects`
- `wins`
- `title`
- `avatar_url`
- `avatar_seed`

Schema helper:

- [`docs/sql/add-equipped-theme.sql`](./sql/add-equipped-theme.sql) adds the equipped customization columns used by the settings and stash flow

### `friendships`

Expected fields:

- `id`
- `requester_id`
- `addressee_id`
- `status`
- `created_at`

### `messages`

Expected fields:

- `id`
- `sender_id`
- `receiver_id`
- `content`
- `read`
- `created_at`
- `attachment_url`
- `attachment_type`
- `attachment_name`

### `notifications`

Expected fields:

- `id`
- `user_id`
- `type`
- `title`
- `message`
- `data`
- `read`
- `created_at`

## Expected Storage Buckets

### `avatars`

Used for uploaded profile images.

### `chat-attachments`

Used for image, file, and voice uploads in direct messages.

### `word-audios`

Used for pre-recorded spelling word playback before falling back to browser TTS.

## Expected RPC

### `purchase_item`

The shop calls a Supabase RPC named `purchase_item` with:

- `p_user_id`
- `item_id`
- `cost`
- `category`

Expected behavior:

- verify the user can afford the purchase
- deduct nectar or equivalent currency
- update inventory
- return a payload containing at least a success signal

The current frontend expects an object-like response containing fields similar to:

- `success`
- `message`

## Realtime Expectations

The notification and direct-message panels subscribe to realtime changes. If those features stop updating live, verify:

- table realtime is enabled
- row-level security allows the expected visibility
- the client is connected to the correct project

## Important Notes

- The frontend assumes Firebase authentication identity maps cleanly onto Supabase profile ownership through the same UID
- Schema changes to these resources should be reflected in the docs and tested in the affected user flows
