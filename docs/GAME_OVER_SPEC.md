# Dead County — Game Over Screen Specification

> **Status:** Step 8.2 visual concept approved; this document defines the MVP-safe implementation  
> **Version:** 1.0 · **Date:** 2026-11-18  
> **Platform:** Desktop browser · React + TypeScript + Tailwind CSS UI over Phaser 4  
> **Source of truth:** `PRD.md` v2.1 → `DESIGN_SYSTEM.md` → `ART_DIRECTION.md`; align with `MAIN_MENU_SPEC.md`, `CHARACTER_SELECTION_SPEC.md` and `PAUSE_MENU_SPEC.md`  
> **Visual reference:** `references/approved-game-over-concept.png` (composition and mood only; not a specification for additional features)

---

## 1. Approval and MVP boundary

The approved **single-screen Game Over** concept uses a restrained, cinematic pixel-art aftermath: large distressed cream **GAME OVER** lettering and red underline; a short **You didn’t survive.** message; a compact centered duration panel; vertically stacked **New Game** and **Main Menu** buttons; a dramatic rust-red sky with distant houses, zombie silhouettes and water tower; and a fallen survivor in the lower-left foreground. Reuse established Dead County branding, muted/charcoal weathered UI surfaces and readable type.

**Explicit correction to the image:** Remove the **`Day Reached` / `Day 1`** row. The MVP has **fixed daytime** and tracks only **elapsed active survival duration**, *not* a calendar, world clock, day counter or day/night progression.

**Exactly two gameplay actions:**

1. **New Game** — Go to the existing **Choose Survivor** screen and begin a fresh run after character selection; use the standard clean-world initialization flow.
2. **Main Menu** — Go to the already-approved Main Menu.

There is **no** `Continue`, `Load Game`, `Restart from Save`, `Retry`, `Settings`, `Quit to Desktop`, multiple-save-slot picker, achievements, kill scoreboard, or post-death recovery action in this MVP screen. Illustrative elements in earlier design boards do not grant permission to add them.

---

## 2. Entry trigger and transition

- When the active player's **Health reaches 0**, gameplay enters the terminal `GameOver` state **exactly once**. Do not trigger separately for each damage event or animation frame.
- Freeze the game world on death: player movement, zombie motion/AI/attacks, combat, stamina/hunger/thirst progression, loot interactions and the active survival timer must stop.
- Record the **final elapsed active-run duration** at the moment of death, and use this frozen value for the Game Over UI. Death animation/transition effects must not increase the result.
- If a short death animation is available, play it once and then reveal the Game Over screen. Keep the timer frozen during the animation; avoid a separate mandatory cutscene or loading screen.
- Revoke all world-interaction eligibility, including `E Search`, `I`, `M`, Left Click melee attacks and pause. An `Esc` press must **not** open the Pause Menu on top of Game Over.
- Show the approved full-viewport Game Over composition once the game reaches its terminal state. UI transition should not leave the old HUD clickable.

### 2.1 Permadeath and active save

Dead County MVP has **one active save slot** in IndexedDB/Dexie. Death **ends the current run permanently**:

- Mark the dying run non-continuable in the shared save repository. Check the owner token, expected slot revision and run identity in the death transaction. A stale death callback cannot modify a newer run.
- The Main Menu `Continue` action must be hidden/disabled if the saved run is dead, invalidated, corrupt or incompatible.
- An earlier manual Save Game cannot act as a checkpoint to undo death.
- Do not automatically make a new alive save or silently restore an older snapshot.
- The game-over screen is display-only; it does not offer a save operation.
- If persistence cleanup fails, **never advertise the dead run as resumable**. Surface a recoverable storage issue as appropriate; enforce the dead-run eligibility check consistently in `Continue` validation. Do not claim an invalidation write succeeded until storage confirms it.
- A New Game creates a clean run and resets zombies, loot/container contents, player stats, inventory, duration and world state. It does not revive the old run.

The death result and the main-menu eligibility check should use a shared canonical run lifecycle rather than independent UI flags. New Game following a dead run should not require overwrite confirmation for the already-invalidated dead save; keep the existing overwrite confirmation rule for any **other** still-valid unfinished run.

---

## 3. Layout and composition

**Baseline:** 16:9 desktop (design around 1280×720; verify 1920×1080 and reduced desktop viewport sizes).

1. **Full-bleed atmospheric art** — a red/charcoal post-apocalyptic suburb with receding roads, shadowed houses, overgrown silhouettes and distant water tower. The mood may be a dramatic symbolic scene rather than the gameplay camera. **Do not mistake red-sunset menu art for a playable day/night cycle.**
2. **Brand mark** — smaller, distressed **DEAD COUNTY** wordmark near the top center, not competing with the primary title. Branding remains consistent with the approved Main Menu.
3. **Primary heading** — **GAME OVER** centered at a large display scale, distressed cream with a muted red underline. Ensure it remains readable as an accessible live heading or paired with hidden semantic text if using a decorative graphic.
4. **Subtitle** — one restrained line, **You didn’t survive.** in clean, readable UI text.
5. **Single result panel** — centered weathered-charcoal rectangle with a clear clock icon/label and the final **Survival Time** value in `HH:MM:SS` (with support for longer runs); use tabular numbers and accessible text. **No `Day Reached` row.**
6. **Action buttons** — stacked vertically beneath the result panel, equal width and good separation: `New Game` primary; `Main Menu` secondary. No third option. Keep buttons readable in front of the art.
7. **Fallen survivor artwork** — left or lower-left foreground, away from button hit targets. The approved illustration depicts the male survivor, but the implemented scene must not misleadingly substitute a male character when the user selected the female survivor. Prefer a **matching death illustration/variant for each selected survivor**, or a neutral/silhouette treatment if both variants are unavailable at MVP time.

The user approved the **visual composition**, not fixed screenshot pixels. Recreate artwork/background separately from live React text and controls; don't turn the reference into a flattened screenshot with noninteractive buttons. Avoid overlaps with wide headings, OS/browser scaling or different fonts.

### 3.1 Layout hierarchy (diagram)

```text
             [ DEAD COUNTY wordmark ]

                  GAME OVER
               ─────────────
              You didn’t survive.

             ┌─────────────────────┐
             │ Survival Time       │
             │      00:42:17       │
             └─────────────────────┘

             ┌─────────────────────┐
             │      New Game       │
             └─────────────────────┘
             ┌─────────────────────┐
             │      Main Menu      │
             └─────────────────────┘

   [fallen survivor art, decorative]    [ruined neighborhood art]
```

**Keep the focus on the run's ending.** Don't add extra charts or celebratory scoreboards to fill the space left by `Day Reached`.

---

## 4. Visual language and design tokens

Use **`DESIGN_SYSTEM.md` tokens** and the existing reusable React button/card primitives. The illustration may contain brighter sunset reds without changing the app's semantic palette.

| Element | Implementation guidance |
|---|---|
| Background | Cinematic original/license-safe pixel-art game-over scene with readable darkening behind content |
| Surface | `color.surface` `#1B1E1D` with restrained weathering |
| Border | `color.border` `#49544A`; subtle highlight on panel edges |
| Primary text | `color.textPrimary` `#EEE6D6` |
| Secondary text | `color.textMuted` `#A8A8AE`, adjusted for contrast |
| Display accent | `color.danger` `#B14A3A` for underline, emphasis and environmental art; not a cue that every button is destructive |
| Primary action | `color.accent` `#686A3F` per system button policy; image's rust-red button is a **visual reference**, not a token override |
| Focus | `color.focus` `#D6AE6D`, visible separately from default selected state |
| Wordmark/title | Bebas Neue / approved distressed lettering; preserve readability |
| Body/buttons | Inter / existing button text styles; no distressed fine-print |
| Elapsed time | UI monospace / tabular numerals, prominent and stable-width |

Respect accessible contrast; ensure visual texture never obscures text. The important `Survival Time` value must not rely only on a decorative clock icon.

---

## 5. User actions and input behavior

| Input/action | Behavior |
|---|---|
| Click **New Game** | Navigate to **Choose Survivor**; new run begins only after its `Start Game` action |
| Click **Main Menu** | Return to Main Menu; dead run remains non-continuable |
| `Tab` / `Shift+Tab` | Navigate between the two actionable buttons with visible focus |
| `Enter` / `Space` on a focused button | Activate it using ordinary button semantics |
| Mouse/keyboard game-world controls | Disabled in Game Over; no attack or movement leakage |
| `Esc` | Does not resume the dead run or reveal Pause; optional no-op (do not imply an unapproved Back action) |

- Default emphasis goes to **New Game**, but keyboard focus and pointer hover must remain unambiguous and accessible; no forced auto-click.
- Use semantic button elements, clean labels and a single heading hierarchy. If focus is set programmatically, avoid accidentally activating the default action.
- Avoid stacking Game Over on top of a still-open Inventory/Map/Pause dialog. Clear or replace blocking overlays as part of terminal transition.
- Use single-fire navigation callbacks to prevent double-click creating multiple Phaser runs or duplicated event listeners.

---

## 6. State/data contract and integration

The **Phaser game lifecycle** owns health/death, frozen run duration and world termination; the **React screen** only renders those values and routes the two user actions.

Illustrative shared projection (adapt naming to your codebase):

```ts
type SurvivorId = 'survivor_male' | 'survivor_female';

type GameOverView = {
  runId: string;
  survivorId: SurvivorId;
  finalSurvivalSeconds: number; // elapsed active time, >= 0
  state: 'game_over';
};

// Engine/lifecycle -> UI:
// onPlayerDeath(finalSurvivalSeconds, survivorId, runId)
// UI -> navigation/lifecycle:
// navigateToCharacterSelection()
// navigateToMainMenu()
```

- Clamp/validate `finalSurvivalSeconds` to a finite nonnegative value; format elapsed duration without treating it as a clock time. Choose an unambiguous long-duration format if active survival exceeds 24 hours (e.g., hours may exceed 24).
- Lock the value once per run; rerenders, saving cleanup and UI animation must not change it.
- Main Menu checks repository save eligibility, not the presence of a stale item in IndexedDB alone.
- On leaving Game Over, dispose of Phaser world/scene/timers/listeners exactly once. Don't leave zombies or keyboard handlers running behind the menu.
- Keep death status and save validity coherent if the page is reloaded or a save is corrupted. A dead or invalid save must not pass the Continue validator.

---

## 7. Required visual / interaction states

1. **Player dies:** Final timer freezes, input blocked, death animation/transition if available, terminal UI appears.
2. **Game Over idle:** Background/illustration, heading, subtitle, one Survival Time row, exactly two buttons.
3. **New Game focused/hovered:** Visible focus or hover state; activation opens Choose Survivor, no resurrected world.
4. **Main Menu focused/hovered:** Visible focus/hover; activation returns to Main Menu with Continue disabled for the dead run.
5. **Persistence invalidation error:** Do not misrepresent the run as alive or reopen gameplay; guard Continue and communicate any actionable storage problem without turning the screen into a new save manager.
6. **Alternate survivor:** Scene matches selected character or uses an intentionally neutral treatment; stats and mechanics remain identical.
7. **Responsive desktop:** No cropped call-to-action or overlapped result text at common resolutions.

---

## 8. Acceptance checklist

- [ ] On Health reaching `0`, Game Over opens **once**, and player/zombie game logic, survival meters and timer stop.
- [ ] Screen contains approved wordmark, `GAME OVER`, `You didn’t survive.`, **Survival Time**, **New Game**, **Main Menu**.
- [ ] **No `Day Reached`, `Day 1`, in-world clock or day/night information** is displayed.
- [ ] **No Continue, Load Game, Retry From Save, Settings or Quit** button is shown.
- [ ] Duration equals the final active survival time, is formatted consistently, and doesn't progress during death animation or UI display.
- [ ] New Game navigates to character selection, allows either survivor, and produces a fully reset new run after Start Game.
- [ ] Main Menu navigates cleanly; `Continue` is unavailable for a dead run even if a previous alive snapshot existed.
- [ ] On death, the single active IndexedDB/Dexie save is invalidated/non-continuable via the shared repository, including protection against stale/corrupt resumes.
- [ ] No mouse clicks or keyboard actions reach Phaser combat/movement when the Game Over UI is active.
- [ ] Any inventory, loot, map or pause overlay closes cleanly; no stacked modal or duplicated world instance remains.
- [ ] Both selected survivor appearances are represented correctly if rendering a specific fallen character.
- [ ] The approved dramatic pixel-art style persists, without treating menu artwork as proof of a playable day/night cycle.
- [ ] UI is keyboard-accessible and keeps text readable and separate from the background image.

---

## 9. Handoff

**Approval recorded:** Step 8.2 Game Over **visual layout and atmosphere**; implementation corrections above are mandatory and are **not new scope**.  
**No PRD amendment needed:** The existing Master PRD v2.1 already defines Game Over, elapsed active time, New Run, Main Menu and permadeath.  
**Suggested next activity:** Review the remaining Step 8 confirmations and the Step 9 effects/production-asset handoff before beginning Phaser/React implementation. Continue the agreed **one screen/image → review → approve → spec** workflow whenever a new visual requires approval.

> **Developer warning:** `references/approved-game-over-concept.png` intentionally includes the illustrative **Day Reached** row. Follow `GAME_OVER_SPEC.md` and `PRD.md` for actual behavior, never copy that row into production UI.
