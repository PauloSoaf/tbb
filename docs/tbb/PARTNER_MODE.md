# Partner Mode / Together — Phase 1

## Ownership model

Two workspaces can connect to share data **without merging or copying it**. Each workspace keeps owning its own rows (`FinanceTransaction`, `Habit`, etc.) exactly as before. "Together" is always a live query across two authorized workspaces, never a materialized/synced copy. Disconnecting stops access immediately; it never deletes data on either side.

```
Workspace A ──┐
              ├── PartnerConnection ── (Together = query over A + B, authorized)
Workspace B ──┘
```

## Schema

- `PartnerConnection` — one row per pairing. `status`: `PENDING → ACCEPTED` (or `DECLINED`/`REVOKED`/`BLOCKED`). Created by the requester as a `PENDING` row carrying only a **hashed** invite token (`inviteTokenHash`, sha256) and an `inviteExpiresAt` (7 days). The raw token exists only in the URL handed to the invitee — it is never persisted in plaintext, matching how `UserSession` handles session tokens.
- `PartnerSharingPolicy` — one row per `(connectionId, ownerWorkspaceId, module)`, `enabled: Boolean`. Directional: A's row controls what A shares with B; B's row is separate and controls the reverse. Seeded for all 9 modules × 2 directions (`enabled: true`) the moment a connection is `ACCEPTED` — "share everything shareable by default," per product decision. A workspace can only ever update **its own** `ownerWorkspaceId` row (enforced in code, not just UI).

V1 constraint: **at most one `ACCEPTED` connection per workspace.** Enforced in `acceptPartnerInvite` (checked for both sides). This matches the product's singular Me/Partner/Together framing; a future "family mode" would relax this without touching the sharing-policy or authorization model.

## Authorization — `src/lib/tenancy/partnerAccess.ts`

```ts
getPartnerContext(module)     // ctx (from session) -> null | { ctx, connection, partnerWorkspaceId }
requirePartnerContext(module) // same, throws AuthorizationError if null
```

Mirrors the existing `getCurrentTenantContext`/`getWorkspaceContext` nullable/throwing pair and reuses the existing `AuthorizationError`. **Never trust a `workspaceId`/`connectionId` from the client** — `partnerWorkspaceId` is always derived server-side from the session-backed `ctx.workspaceId` plus the `ACCEPTED` connection row, the same way `assertTenantOwnership` already works. All mutation actions in `src/features/partner/actions.ts` take no workspace-identifying parameters from the client at all (except the invite token itself, which is a high-entropy bearer secret, not a guessable id) — this makes the IDOR class of bug structurally unreachable rather than something that has to be remembered at every call site.

## Invite lifecycle

1. `createPartnerInvite()` — requires `WRITE` permission, rate-limited (`allowAttempt`, 5/15min per workspace). Generates a random token, stores only its hash, returns the raw token **once** (never persisted, never re-displayable — same tradeoff as an API key or a password-reset link). Auto-revokes any older pending invite from the same workspace.
2. Invitee opens `/partner/accept/[token]` while authenticated (unauthenticated → redirected to `/login` by the existing `(app)` layout guard). Server looks the token up **by its hash**.
3. `acceptPartnerInvite(token)` — rejects: unknown/expired/non-pending token, self-accept, either side already connected. On success: sets `receiverWorkspaceId`/`acceptedByUserId`, status `ACCEPTED`, nulls the token hash (single-use), seeds the 18 sharing-policy rows.
4. `disconnectPartner()` — soft: `status = REVOKED`. Access stops resolving via `getPartnerContext` immediately; no rows are deleted.

## Together aggregation formulas (Finance)

Combined values are **summed directly**, not derived from a synced dataset:

- Net worth, income, expenses → `me + partner` (cents fields, always valid to add).
- Savings (balance) → `combined income − combined expenses` (not `me.savings + partner.savings` re-derived — same result algebraically, computed once from the combined totals).
- Savings rate → `combined savings ÷ combined income` — **not** an average of each side's rate (averaging rates would be wrong whenever incomes differ).

## What Phase 1 does *not* cover

Deliberately deferred — see the roadmap below rather than half-implementing them:
- Finance side-by-side transactions and the Combined grid (Owner column, read-only partner rows) — needs structural `FinanceDataGrid` work.
- Habits Together, shared streaks — needs a `SharedHabitChallenge` join model (does not touch `HabitEntry`).
- Gamification (XP, achievements), Financial Weekly Check-in.
- Together Today dashboard, Weekly Review, shared goals, calendar aggregation, notifications/nudges.
- Assistant/Search partner-awareness.

Only the Finance Overview page reacts to `?scope=me|partner|together` in Phase 1; other pages ignore the query param harmlessly. The topbar switcher is hidden entirely until a connection exists.
