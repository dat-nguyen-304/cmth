# Chưởng Môn Tí Hon (Web) — Project Plan

> A web-based remake inspired by VNG's discontinued game *Tiểu Võ Lâm*: a 2D chibi
> wuxia auto-battler where characters charge into each other automatically and the
> player clicks portraits to fire ultimates.
>
> **Note:** This document was rewritten after a requirements interview. It corrects
> several material errors in the original AI-generated draft (see §10).

---

## 1. Concept Summary

A **server-backed, account-based 2D chibi wuxia auto-battler** played in the browser.

- Your team auto-fights an enemy team: characters run in, trade auto-attacks, get
  knocked back, and charge in again.
- Each character has **one ultimate** tied to their **sect (bang phái)**.
- The player's only active input during combat: **click a character's portrait to
  fire their ult** once its energy bar is full.
- Winning fights yields gold/exp → **cultivation (tu luyện)**: level up, raise
  stats → tackle harder stages.
- Characters belong to **sects**; rare characters (inspired by classic wuxia heroes)
  are unlocked by collecting **shards** via a **layered gacha**.

### Design constraints / decisions
- **Platform:** Web (browser). No downloadable/desktop build.
- **Server-backed:** Real backend with player accounts. The server is the source of
  truth for the wallet and progression (because real money is involved).
- **Monetization:** A premium currency (**diamonds**) is sold for **real money via
  manual fulfillment** — a player contacts the admin directly, pays out-of-band, and
  the admin credits diamonds to their account. **No automated payment processor.**
- **UI language:** **Vietnamese.**
- **IP / originality:** Do **not** copy VNG's original art or directly reuse
  copyrighted characters (e.g. Kim Dung / Jin Yong heroes). Use **inspired-by**
  designs with original names and self-made sect names.

---

## 2. Combat Spec

- **Team size:** 6 characters per side (6v6).
- **Battlefield:** **1-D horizontal clash on a single shared row.** ALL units (both
  teams) stand on one horizontal line; the left team moves right, the right team moves
  left; nobody moves up or down. Units start in a file but **all charge in at once** —
  it's a simultaneous melee scrum, *not* turn-based or one-at-a-time. A soft body
  separation keeps them from stacking on a single point.
- **Movement & targeting:** fully automatic, horizontal only. Each unit closes on its
  **nearest enemy by x-distance** (ties by id) and attacks the moment it's within its
  own attack range — so **everyone engages together**.
- **Attack range (melee vs ranged):** range is per-character. Melee units must close
  in; **ranged characters (e.g. Ma Giáo casters, Nga Mi support) attack from a
  distance** and hang back behind the melee instead of charging into it.
- **Player input:** the *only* active input is **clicking a portrait to fire that
  character's ult**.
- **Time model:** real-time *feel*, implemented as a **deterministic fixed-timestep
  simulation** (seeded RNG, sim logic fully separated from rendering).
- **Win/lose:** eliminate the enemy team.

### Determinism is a hard requirement
Because **async PvP is planned** (see §6) and real-money currency is in play, the
combat sim must be **deterministic and headless-runnable** from day one. For PvP the
client sends inputs + seed and the **server re-runs the same sim** to validate the
result — reusing one codebase. Building combat coupled to rendering would force a
full engine rewrite later, so this is non-negotiable.

---

## 3. Ultimates

- Each character has an **independent energy bar**.
- The bar fills from **dealing and taking damage** (combat participation).
- When full, the player **clicks the portrait to fire**. Multiple ults can be ready
  at once; the player chooses firing order.
- One ultimate per character, flavored by sect.

---

## 4. Sects, Roster & Progression

### Sects (5) and roles
| Sect | Role / identity |
|------|-----------------|
| Thiếu Lâm | Tank / defense |
| Cái Bang | Physical damage |
| Nga Mi | Healing / support |
| Võ Đang | Control / sustain |
| Ma Giáo | High-risk burst damage / debuffs |

### Default roster (7) + rares
- Thiếu Lâm — 1 default (male)
- Võ Đang — 1 default (male)
- Nga Mi — 1 default (female)
- Cái Bang — 2 defaults
- Ma Giáo — 2 defaults
- Each sect also has **a few rare unlockable characters**.

### Team-building
- **Free pick:** any 6 owned characters, any sects, no forced synergy.
- **One copy of each character** on the field (duplicate pulls convert to resource).

### Progression ("tu luyện")
- **Per-character** XP leveling → stat growth.
- **Gold-spend upgrades** for stats and ult power now. A real **equipment/item
  system is deferred** to a possible future expansion.
- Core stats: **HP, ATK, DEF, SPD** (energy-fill rate is an implicit lever).

---

## 5. Economy & Monetization

### Currencies & resources
| Item | Source | Spent on |
|------|--------|----------|
| **Gold** (soft) | Winning fights, dailies, events | Gacha rolls, stat/ult upgrades |
| **Diamonds** (premium) | **Real money, manual admin grant** | Premium gacha / shop |
| **Character shards** | Gacha pulls, dailies, events | Accumulate → unlock a specific rare |
| **Daily-participation currency** (stamina-style) | Replenishes over time | Entry into daily activities |
| **Upgrade resource** (generic) | Duplicate character pulls | Upgrading other characters |

### Rare unlock model — layered
Gacha rolls give **random shards**; shards accumulate to a **guaranteed unlock** at a
threshold (pity-like). No pure random "win or nothing."

### Monetization flow (manual fulfillment)
1. Player contacts the admin and pays out-of-band (bank transfer / e-wallet).
2. Admin uses an **admin tool** to look up the player's account and **credit diamonds**.
3. The wallet is **server-authoritative**, so diamonds cannot be forged client-side.

---

## 6. Game Modes

- **Campaign** — the core PvE ladder: clear stages → gold/exp → harder stages.
- **Daily activities** — repeatable content gated by the daily-participation currency.
- **Limited-time events** — server-scheduled, grant shards/resources, often tied to a
  featured rare.
- **Gacha / summon screen** — roll for shards toward rare unlocks.
- **Async PvP arena — planned for later (not v1):** fight other players' saved team
  snapshots (AI-controlled). Requires **server-side combat validation** — the reason
  the sim is deterministic from day one.

---

## 7. Architecture & Tech Stack

- **TypeScript monorepo:** `packages/sim`, `packages/client`, `packages/server`.
  The deterministic combat sim is **one shared module** imported by both client and
  server.
- **Frontend:** **PixiJS** for battle rendering (sprites, tweens, particles) +
  **React** for menus and the admin UI.
- **Backend:** **Node** (TypeScript) with a **REST/HTTP** API.
- **Database:** **PostgreSQL** (ACID transactions for wallet / diamond grants).
- **Auth:** **email + password** accounts.
- **Server authority:** server owns the **wallet, progression, and inventory**; the
  **client simulates combat** and reports results. (PvE result-faking only inflates a
  player's own soft progress; diamonds stay admin-gated. PvP will be server-validated.)

---

## 8. Art Pipeline

The art is the expensive part, but it is **deferred**.

- **Placeholder block art** through the prototype and systems phases.
- Real character art enters **last**, only once the game proves fun.
- Art method (self-run SD + LoRA / hosted AI tools / commission) is **TBD** and will
  be decided when we reach that point.
- Animation is done **in code, not AI video**: charge/knockback = tween x position;
  basic attack = lunge + flash + particles; ultimate = scale-up + sect-colored effect.

---

## 9. Build Plan (phased)

Estimates are in **build iterations**, not calendar time. Only Phase 1 stays
client-only; everything after is backend-backed.

### Phase 1 — Core loop fun test (client-only)
- Deterministic sim + PixiJS battle + click-to-ult + per-character leveling,
  ~5–6 characters, **placeholder block art**, local state only.
- Goal: *Is it fun? Does it capture the vibe?* before building the backend.

### Phase 2 — Backend & systems
- Node + PostgreSQL, email/password accounts, **server-side wallet & progression**,
  layered gacha, campaign stages, daily activities, and the **admin tool** for
  diamond grants.

### Phase 3 — Events, polish & art
- Limited-time events, balance/stat tuning, quality-of-life, and **real art**
  replacing placeholders.

### Future
- **Async PvP arena** (server-side combat validation).
- Real **equipment/item system**.

---

## 10. Corrections vs. the original AI-generated draft

The first draft captured the *vibe* but was wrong on the load-bearing parts:

1. **"No server, no real money, not live-service" → FALSE.** The project is
   server-backed with real-money diamonds (manual fulfillment), dailies, and events.
   This was the largest error and reshaped the whole plan.
2. **"4 sects, each 2 defaults (male+female)" → WRONG.** There are **5 sects**
   (Ma Giáo was missing) with **uneven defaults** (7 total).
3. **"Keep the latest exported game file as canonical" → DEAD.** State is
   server-side per account; there is no exported single-file build.
4. **No tech stack, auth, economy, or PvP were specified** — all major gaps now
   filled.
5. **Phasing assumed client-only** — only Phase 1 survives that assumption.

---

## 11. Open items (not yet resolved)

- Daily-participation currency: replenishment rate, cap, daily reset rules.
- Admin tool: feature scope beyond diamond-granting (refunds, bans, audit log?).
- Specific rare-character roster and their ultimates.
- Event scheduling: cadence, event types, reward tables.
- Gacha rates and pity thresholds (exact numbers).

---

## 12. Immediate Next Step

**Build Phase 1:** client-only core loop with placeholder block art — deterministic
sim, auto-battle, click-to-ult, per-character leveling, a few characters across one
or two sects. Then evaluate fun before building the backend and systems.
