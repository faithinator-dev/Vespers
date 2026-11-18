# Vespers Security Specification (Payload-First TDD)

## 1. Data Invariants
1. **Strict Owner Isolation**: Every user profile (`/users/{userId}`), journal entry (`/users/{userId}/entries/{entryId}`), and mood log (`/users/{userId}/moodLogs/{dateKey}`) is readable and writable exclusively by the authenticated, email-verified user whose `request.auth.uid == userId`.
2. **No Cross-Tenant Listing**: `allow list` on `/users` is denied entirely (`if false`). `allow list` on `/users/{userId}/entries` and `/users/{userId}/moodLogs` enforces `isOwner(userId) && resource.data.userId == request.auth.uid`.
3. **Immutable Ownership & Creation Timestamps**: `uid` / `userId`, `id`, and `createdAt` cannot be modified after creation. `createdAt` must equal `request.time` on create; `updatedAt` must equal `request.time` on create and update.
4. **Master Gate**: Subcollection creates (`entries`, `moodLogs`) verify `exists(/databases/$(database)/documents/users/$(userId))` so orphaned records cannot be created without a parent user profile.
5. **Bounded Payloads & Strict Keys**: Every write validates exact key allowlists (`hasAll` + `hasOnly` on create, `affectedKeys().hasOnly(...)` on update), valid regex IDs (`^[a-zA-Z0-9_\-]+$`), valid date keys (`^\d{4}-\d{2}-\d{2}$`), bounded string sizes, integer word counts (`>= 0 && <= 20000`), and allowlisted mood enum values.

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated Read/Write**: Read `/users/u1/entries/e1` with `auth = null`.
2. **Cross-User Entry Read**: User `u2` attempts `get` on `/users/u1/entries/e1`.
3. **Cross-User Entry Write**: User `u2` attempts `create` on `/users/u1/entries/e1` with `userId: 'u2'`.
4. **Identity Spoofing in Body**: User `u1` creates `/users/u1/entries/e1` with `userId: 'u2'`.
5. **Unverified Email Bypass**: User `u1` with `email_verified: false` attempts to create a journal entry.
6. **Shadow / Ghost Field Injection**: User `u1` creates an entry containing an extra key `isAdmin: true`.
7. **Orphaned Subcollection Write**: User `u1` creates `/users/u1/entries/e1` when `/users/u1` does not exist.
8. **Client-Spoofed Timestamp**: User `u1` creates an entry with `createdAt: Timestamp(2020-01-01)`.
9. **Immutable Field Mutation**: User `u1` updates `/users/u1/entries/e1` changing `createdAt` or `userId`.
10. **Path Variable ID Poisoning**: User `u1` creates `/users/u1/entries/bad$id!` (invalid characters) or 200-char ID.
11. **Denial-of-Wallet Oversized String**: User `u1` writes a 100,000-character `contentHtml` or 500-character `title`.
12. **Invalid Enum / Type Poisoning**: User `u1` writes `mood: "ecstatic"` or `wordCount: -5` or `preferredLampWarmth: 99`.
