# Dead County — Character Selection Screen Specification

> **Status:** Visual concept approved; ready for MVP implementation planning  
> **Version:** 1.0 · **Date:** 2026-11-18  
> **Scope:** Character Selection / Choose Survivor screen only (MVP v1.0)  
> **Tech:** React + TypeScript + Tailwind CSS; Phaser owns actual character/game initialization  
> **Source of truth:** `PRD.md` (Master v2.1), `DESIGN_SYSTEM.md`, `PLAYER_CHARACTER_SPEC.md`, `MAIN_MENU_SPEC.md`, `ART_DIRECTION.md`  
> **Approved reference:** `references/approved-character-selection.png`

## 1. Approval and boundaries

This specification translates the **approved single-screen Character Selection concept** into implementable UI. The approved composition has: a distressed cream **DEAD COUNTY** logo at upper-left; a centered **SELECT YOUR SURVIVOR** title/subtitle; **two large, equally sized** cards with full-body survivor illustrations; a visible selected-state border/check; **Back** and **Start Game** actions below; and the same atmospheric suburban background established for the approved Main Menu.

**Explicit design change:** The previous concept's right-side `Survivor (MVP)` information box was **removed at the user's request** and **must not return**. The selection screen is intentionally simple and focused.

A concept image is a visual reference, not an export-ready app screen. Text, buttons, cards, selection/focus states and backgrounds must be implemented as separate, accessible UI layers. Any incidental scene labels must not expand the PRD.

## 2. MVP scope

| Required (MVP) | Out of scope (post-MVP) |
|---|---|
| Two fixed selectable characters (`survivor_male`, `survivor_female`) | Additional character presets or unlocks |
| Equally prominent full-body visual previews, clear readable face/portrait, name labels | Customization of hair, body, skin, clothing or gear |
| Clear selected and unselected states | Traits, classes, skills, stat distributions |
| `Back` and `Start Game` actions | Account/profile/name form, avatar save slots |
| Keyboard and mouse navigation | Controller and touch/mobile adaptation |
| Confirmation if new run will overwrite a live saved run | Cloud saves, cross-device sync |

Both characters have **exactly the same** starting stats, movement, collision/hitbox, baseball-bat combat, inventory capacity, stamina, looting and survival mechanics. Selection changes appearance/animation set and the saved `characterId`, **not difficulty or balance**.

## 3. Approved survivor visuals

### Male Survivor — `survivor_male`

- Dark messy short/medium hair, natural tired/alert expression.
- Weathered **muted olive jacket**, charcoal undershirt, worn dark pants.
- Practical brown boots and canvas backpack.
- Believable adult proportions; weight-bearing stance; not heroic or exaggerated.

### Female Survivor — `survivor_female`

- Dark/brown hair tied back, restrained flyaway strands; natural alert expression.
- Weathered **faded rust-burgundy jacket**, dark shirt, worn dark pants.
- Practical brown boots and canvas backpack of the same gameplay capacity.
- Believable adult proportions and visual detail at parity with the male character.

Follow `PLAYER_CHARACTER_SPEC.md` for detailed sprite/animation requirements. The preview asset can be a high-resolution UI illustration informed by (but separate from) the small in-game sprites. Keep both preview figures on the same visual ground plane and at a comparable human scale.

## 4. Screen layout and hierarchy

**Design baseline:** 16:9 desktop, initial reference **1280 × 720**. Verify common desktop widths including 1920 × 1080; maintain usability down to a smaller desktop viewport without overlapping buttons.

1. **Full-viewport art-only background** — abandoned suburban houses, fencing, water tower, trees, old pickup and sunset/warm dusk *menu artwork*, with a dark readable foreground scrim. The gameplay world itself remains fixed **daytime** for MVP; sunset here is only static menu art.
2. **Brand region, upper-left** — distressed cream logo with a restrained red stroke. Match approved Main Menu branding and placement rhythm.
3. **Centered title region** — `SELECT YOUR SURVIVOR` in condensed display type; subtitle `Choose one survivor to start your journey.` in readable body type.
4. **Card pair, center** — two cards of equal width/height, separated by a consistent gap; full-body illustrations fill the principal visual area; bottom label bars show `Male Survivor` and `Female Survivor` clearly.
5. **Actions, below cards** — `Back` as secondary, `Start Game` as the dominant call to action; align their edges consistently and provide sufficient click targets.
6. **No right-side info box** — avoid stats lists, explanatory checklists, bonus callouts or optional panels.

**Responsive rule:** Cards must retain legible proportions and not overlap the logo/title/action area. At narrower desktop sizes, scale the two-card composition proportionately, or enable page scrolling if necessary; avoid shrinking body text or interactive hit areas below readable/accessibility targets.

## 5. Design system and interaction states

Use canonical tokens from `DESIGN_SYSTEM.md` rather than duplicating raw colors throughout components:

- Background: `color.bg = #0C0F10`; panel: `color.surface = #1B1E1D`.
- Primary text: `color.textPrimary = #EEE6D6`; muted text: `color.textMuted = #A8A8AE`.
- Border: `color.border = #49544A`.
- Selected styling from the approved concept: a **restrained weathered rust-red edge/check**, derived from the game's red brand accent. Because red also represents danger elsewhere, selection **must additionally use a check icon and clear label**. Keep actual keyboard focus **independently visible**, e.g. `color.focus = #D6AE6D`.
- `Start Game` can retain the approved **rust-red branded call-to-action treatment** on this screen; document this as a limited menu treatment, not a blanket replacement of the app-wide olive `color.accent = #686A3F` for gameplay controls. Use accessible text contrast. `Back` uses a subdued dark panel.
- Card surfaces are matte charcoal with subtle grit/texturing; avoid neon glow, bloom, gradients inside cards, or oversized rounded SaaS styling. The image's edge illumination can be recreated as a subtle outline/shadow rather than heavy neon.
- Fonts: **Bebas Neue** for major display headings/actions (or an approved condensed equivalent), **Inter** for labels/subtitles, numeric font only where appropriate.

### State matrix

| State | Visuals / behavior |
|---|---|
| Unselected | Neutral border; readable full-body figure and name; no checkmark |
| Hover | Gentle outline/brightness emphasis, not selected automatically |
| Keyboard focus | Distinct high-contrast focus ring, independent of selection |
| Selected | Red accent stroke + checkmark + selected semantics; unselected card remains available |
| Start disabled | Clearly disabled when no character is selected or a transition is active |
| Starting / confirmation | Input blocked from double-triggering; visible pending/confirmation feedback |
| Error | Actionable inline/dialog message; no silent save deletion |

The approved screenshot depicts **Male Survivor selected only as an example state**. It is not a requirement to favor him by default. **Initial selection is null** on a new visit so players deliberately choose one; `Start Game` becomes enabled only after selection.

## 6. Navigation and behavior

### 6.1 Entry

- `Main Menu → New Game → Choose Survivor`.
- **Do not delete or overwrite an active local save just by entering this screen.**
- `Continue` on the Main Menu **bypasses** Character Selection and restores the save's original `characterId`.
- Character Selection is a React menu view, not a Phaser game level or separate game world.

### 6.2 Choosing a survivor

- Clicking a card selects the corresponding stable `characterId`.
- Selecting the other card updates selection immediately; no stats, difficulty or game state have been changed yet.
- Only one card can be selected at a time; selection is communicated visually and programmatically.
- Users can move through controls by `Tab` / `Shift+Tab`; `Enter` or `Space` selects the focused character card. Left/right arrow support is recommended when implemented as a radiogroup.
- Any preview art remains decorative/informative; keyboard interaction works without pointer hover.

### 6.3 Back

- `Back` returns to the Main Menu, does not start a run and does not touch existing save data.
- `Esc` may perform the same action when no destructive confirmation is open; confirmation Esc cancels the dialog only.

### 6.4 Start Game

1. Require valid selected ID: `survivor_male` or `survivor_female`.
2. Ask the save repository for the classified slot state. A failed read or unsupported schema blocks replacement. A diagnosed damaged record requires its own explicitly confirmed recovery flow.
3. If one exists, show a distinct **overwrite confirmation** explaining that the active run will be replaced. `Cancel` leaves the save unchanged; confirmation is explicit and non-default.
4. With the required confirmation, or a verified empty slot or dead run, initialize the selected survivor and fresh world in memory. During damaged-save recovery, retain the original through selection, validation and placement.
5. Spawn at the approved safe floor position **inside House A — Starter House**; compute roof/occluder visibility immediately so interior is visible.
6. Commit the prepared run with the applicable [replacement guards](adr/0004-confirmed-damaged-save-replacement.md). Enter gameplay and show the HUD and minimap only on success. A failed guard, placement or commit leaves the stored record intact and reports the failure.

**Failure safety:** If initialization fails, remain on a recoverable menu state and do not falsely report that the game started. Avoid erasing a previous valid save until the overwrite transition is actually committed, as supported by the save design. Prevent double-click initialization.

## 7. Type contract and ownership

```ts
export type SurvivorId = 'survivor_male' | 'survivor_female';

export const SURVIVOR_OPTIONS: readonly {
  id: SurvivorId;
  label: string;
  previewAsset: string;
}[] = [
  { id: 'survivor_male', label: 'Male Survivor', previewAsset: '/assets/ui/survivors/male.webp' },
  { id: 'survivor_female', label: 'Female Survivor', previewAsset: '/assets/ui/survivors/female.webp' },
];
```

This is a proposed contract, not proof the assets already exist. React owns `selectedSurvivorId`, focus, confirmation and navigation. Phaser owns entity instantiation and gameplay stats. The save shape persists `characterId: SurvivorId` exactly as required by Master PRD v2.1.

**Do not** encode gameplay stat modifiers or attack logic in survivor option data. Do not create separate logic branches for male and female beyond selecting art/animation identifiers.

## 8. Assets and production handoff

Required production-ready assets:

- Art-only menu neighborhood background with **no text/buttons baked into pixels**; reuse the approved Main Menu backdrop where possible.
- Male Survivor full-body UI preview (transparent cutout, appropriate shadows, clean silhouette).
- Female Survivor full-body UI preview (same scale and rendering treatment).
- Readable portrait crop/asset for each character if separate portrait display is needed by the PRD or other screens; prioritize clear facial recognition within the full-body cards without adding an info panel.
- Brand wordmark (asset or live typography), minimal selected checkmark and optional subtle low-opacity grime texture.

**The approved reference image is a layout/style guide, not a functional UI or reusable sprite sheet.** Do not crop buttons/labels directly from that composite image. Character gameplay sprite sheets are governed by `PLAYER_CHARACTER_SPEC.md` and must be produced separately.

Suggested repository paths:

```text
docs/CHARACTER_SELECTION_SPEC.md
references/approved-character-selection.png
public/assets/ui/main-menu/menu-neighborhood-background.webp
public/assets/ui/survivors/male.webp
public/assets/ui/survivors/female.webp
src/components/menus/CharacterSelectionScreen.tsx
```

## 9. Acceptance criteria

- [ ] Clicking `New Game` opens the selection screen without altering or deleting the active run.
- [ ] Male and Female are both visible, equally sized, clearly labeled, visually consistent, selectable, and keyboard accessible.
- [ ] The right-side `Survivor (MVP)` box is absent.
- [ ] Only one survivor is selected at a time; selected/focused states are distinguishable and not indicated by color alone.
- [ ] No selection means `Start Game` is disabled; choosing either enables it.
- [ ] Both choices start the same stats, movement, collision, combat, inventory and other gameplay systems.
- [ ] Starting a new run with an active save requires explicit overwrite confirmation; `Cancel` preserves the old run.
- [ ] `Back`/`Esc` return to the Main Menu without launching gameplay or touching saved data.
- [ ] On confirmed start, the selected character spawns inside House A, with roof visibility correct and normal HUD/minimap active.
- [ ] `Continue` (Main Menu) bypasses selection and restores the previously saved character.
- [ ] Responsive desktop layout does not clip portraits, cards, headings or controls; labels remain readable.
- [ ] Buttons, tabs and focus rings are implemented in React, not baked into a screenshot.
- [ ] Settings, traits, customization, classes, user accounts and post-MVP options do not appear.

## 10. PRD reconciliation and change tracking

This document **implements existing requirements** in Master `PRD.md` v2.1: `FR-P10`, `FR-P11`, `FR-UI07`, `FR-G08`, `FR-SAVE11`, and Main Menu → Character Selection → New Run journey. It does **not** expand the MVP or require a PRD amendment. The old right-side info box from an early concept is explicitly rejected. If the visual design is revised later, update this spec and reference image without adding new mechanics accidentally.

**Next visual-design review (separate approval):** Gameplay HUD + circular minimap. Do not write that screen's final spec or modify scope until its concept is reviewed.
