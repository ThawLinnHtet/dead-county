# Dead County — UI Design System

> **Status:** Approved visual direction · **Version:** 1.3 · **Date:** 2026-11-18  
> **Applies to:** Dead County MVP v1.0 · **Platform:** Desktop browser  
> **Implementation:** React + TypeScript + Tailwind CSS over a Phaser game canvas  
> **Related documents:** `PRD.md`, `ART_DIRECTION.md`  
> **Reference:** `../references/dead-county-design-system.png` in the accompanying design package

## 1. Purpose and authority

This document translates the approved Dead County design board into actionable, repeatable rules for the React UI. Its decisions are **binding for the MVP** unless an explicit product/design decision updates them. The PRD defines *what the game does*; this document defines *how that gameplay is visually communicated*. `ART_DIRECTION.md` governs sprites, tiles, environmental graphics, and in-world visual effects.

The reference board is concept art, **not a literal UI specification**. Where labels, colors, or features in generated artwork conflict with this document or the PRD, follow the written requirements. In particular, **crafting, ammunition, weapon durability, item stacking, day/night clocks, cloud saves, vehicles, and firearms are not in the MVP**.

### Design principles

1. **Immersive:** weathered, grounded survival-horror atmosphere, never glossy SaaS styling.
2. **Readable:** high-contrast information, explicit labels, clear numeric status.
3. **Minimal:** prioritize playable screen area over decoration.
4. **Consistent:** one shared token scale and component vocabulary across every panel.
5. **Functional:** predictable keyboard, mouse, focus, and gameplay-state feedback.

Do not introduce neon gradients, glassmorphism, inflated rounded cards, gratuitous bloom, tiny pixel fonts for text, or decorative controls without a gameplay purpose.

## 2. Visual vocabulary

**Mood:** abandoned suburban America, subdued and practical, worn utility equipment.  
**UI motif:** dark matte metal/painted panel; subtle rough edges and fine borders; olive controls; cream lettering; restrained rust-red danger.  
**Shape language:** mostly rectangular, sharp or very slightly softened corners.  
**Texture:** low-contrast surface grain and occasional distressed *display* title treatment; never reduce body-text legibility.

## 3. Color tokens (canonical)

The values below follow the **approved regenerated board**. Use their semantic names in components, not raw hex values repeated throughout JSX.

| Token | HEX | Usage |
|---|---|---|
| `color.bg` | `#0C0F10` | Global overlay / menu backdrop |
| `color.surface` | `#1B1E1D` | Standard panels, menus, modal content |
| `color.surfaceElevated` | `#343A33` | Selected/raised subsections and grouped surfaces |
| `color.accent` | `#686A3F` | Primary buttons and olive selection context |
| `color.danger` | `#B14A3A` | Damage, destructive emphasis, game-over title |
| `color.warning` | `#D6AE6D` | Alerts, caution, keyboard focus/highlights |
| `color.textPrimary` | `#EEE6D6` | Titles, body text, active controls |
| `color.textMuted` | `#A8A8AE` | Hints, descriptions, subordinate information |
| `color.border` | `#49544A` | Dividers, container lines, input/slot outlines |

**Extended functional tokens**, added to ensure accessible, unambiguous states:

| Token | HEX | Meaning |
|---|---|---|
| `color.accentHover` | `#77794A` | Hover emphasis; verify contrast with label |
| `color.accentPressed` | `#525432` | Pressed primary button |
| `color.dangerFilled` | `#963C33` | Destructive filled button with cream label |
| `color.focus` | `#D6AE6D` | Visible keyboard-focus ring |
| `color.health` | `#B14A3A` | HP meter |
| `color.stamina` | `#4B8058` | Stamina meter |
| `color.hunger` | `#B37A3C` | Hunger *severity* meter |
| `color.thirst` | `#3B7FA6` | Thirst *severity* meter |
| `color.scrim` | `rgb(0 0 0 / 70%)` | Menu/modal overlay over game world |

**Accessible color rules:** Use primary text on dark surfaces. The accent and danger colors can be used as colored indicators; do not rely on hue alone. Avoid using muted text on the olive or red fill for small button labels. Keep normal UI text at approximately WCAG AA contrast (4.5:1), adjusting the affected element if necessary. Warnings, errors, and critical states must also have a label or icon.

### Proposed CSS token mapping

```css
:root {
  --dc-bg: #0c0f10;
  --dc-surface: #1b1e1d;
  --dc-surface-elevated: #343a33;
  --dc-accent: #686a3f;
  --dc-accent-hover: #77794a;
  --dc-accent-pressed: #525432;
  --dc-danger: #b14a3a;
  --dc-danger-filled: #963c33;
  --dc-warning: #d6ae6d;
  --dc-text: #eee6d6;
  --dc-text-muted: #a8a8ae;
  --dc-border: #49544a;
  --dc-focus: #d6ae6d;
  --dc-health: #b14a3a;
  --dc-stamina: #4b8058;
  --dc-hunger: #b37a3c;
  --dc-thirst: #3b7fa6;
  --dc-scrim: rgb(0 0 0 / 70%);
  --dc-font-display: 'Bebas Neue', Impact, 'Arial Narrow', sans-serif;
  --dc-font-body: 'Inter', system-ui, sans-serif;
  --dc-font-numeric: ui-monospace, 'Cascadia Code', Consolas, monospace;
}
```

Tailwind utilities may reference these CSS variables or corresponding theme tokens. Do not install an unrelated design-system theme that overrides these values.

## 4. Typography

| Role | Family | Default size | Weight/style | Usage |
|---|---|---:|---|---|
| Brand wordmark | Bebas Neue | 64–80px | Display, optionally distressed graphic | Main menu title |
| Main screen heading | Bebas Neue | 32–40px | Regular | Inventory, Game Over, Pause |
| Panel heading | Bebas Neue | 22–28px | Regular | Panel and subpanel labels |
| Primary action | Bebas Neue | 20–24px | Regular | New Game, Resume, Save |
| Body / item label | Inter | 14–16px | Medium/Regular | Item names, explanations |
| Secondary UI | Inter | 12–14px | Regular | Small hints and key prompts |
| Numeric HUD | UI monospace stack | 14–18px | Medium, tabular numerals | HP 85/100, elapsed time |
| Game-over duration | UI monospace stack | 30–40px | Bold/tabular | Survival duration |

- Display typography can carry texture; live labels, instructions, and inventory details **must remain clean**.
- Use sentence case for item names and descriptions; uppercase for major display headings and main commands.
- Letter spacing: moderate for display headings; normal for body text.
- Never encode important text inside a raster image when it can be accessible React text.
- Font fallback must not break layout or clipping.

## 5. Layout, spacing, and surfaces

**Baseline:** 1280 × 720 desktop gameplay viewport. Test at 1920 × 1080 and at smaller usable desktop windows; scale or compact overlays rather than covering gameplay. Desktop mouse + keyboard only for MVP; touchscreen controls are future scope.

| Token | Value | Examples |
|---|---:|---|
| `space.0_5` | 4px | Icon-to-text micro gap |
| `space.1` | 8px | Tight slot spacing |
| `space.2` | 16px | Component padding |
| `space.3` | 24px | Main panel padding |
| `space.4` | 32px | Large layout spacing |
| `radius.sm` | 4px | Buttons, item slots |
| `radius.md` | 6px | Standard panels |
| `radius.lg` | 8px | Dialog outer shells |
| `border.thin` | 1px | Ordinary surface border |

- Use the spacing scale above; avoid improvised 13/19/27px margins.
- Matte surface + fine border is the standard panel treatment; reserve stronger shadows for dialogs.
- Maintain consistent padding around text and do not place tooltips beyond viewport bounds.
- Use a 70% black scrim behind paused/confirmation overlays as needed, not heavy blur.
- In-game overlays should not block the central movement/action region unless a menu is intentionally open.

## 6. Component specifications

### 6.1 Buttons

**Variants:** primary, secondary, destructive, disabled.  
**States:** default, hover, pressed, keyboard focus, disabled, loading only when a real async operation needs it.

| Variant | Background | Border | Label |
|---|---|---|---|
| Primary | Accent olive | Warm pale edge | Cream uppercase display text |
| Secondary | Surface | Border | Cream text |
| Destructive | Darkened rust red | Danger edge | Cream text |
| Disabled | Muted dark surface | Subtle border | Reduced emphasis, still legible |

Minimum practical interactive target: 40–44px high for prominent controls. Primary actions use the most visible olive fill, never more than one primary emphasis per immediate action group.

### 6.2 Panels and modals

- Reusable `GamePanel` with 1px outline, dark surface, 16–24px interior padding.
- Section header may use a restrained distressed label strip; live text stays readable.
- Modal focus is contained appropriately; Escape closes cancelable dialogs.
- Opening a modal must suppress unintended gameplay input.

### 6.3 Inventory slot

- Grid: **4 columns × 3 rows = 12 fixed slots**.
- Square slots with subtle dark fill, 1px border, and 8px spacing.
- Hover: mild contrast change. Selected: bright warning/olive outline, not a glow-heavy effect.
- Show only one item instance per occupied slot; **no item stacks/quantity badges in MVP**.
- Empty slot should be visually empty, not a placeholder locked item.
- Selected item opens or updates an item-details area.
- Item icons use consistent scale and transparent backgrounds.

### 6.4 Item details and actions

**Only four MVP item types:** Baseball Bat, Canned Food, Water Bottle, Bandage.

- Baseball Bat: category `Melee weapon`; `Equip` action when unequipped, `Equipped` indicator when equipped; `Drop` action if allowed. **No durability, damage-stat UI is optional, not a durability meter**.
- Canned Food: `Use`/`Eat` reduces hunger severity; `Drop`.
- Water Bottle: `Use`/`Drink` reduces thirst severity; `Drop`.
- Bandage: `Use` restores health within the configured limit; `Drop`.
- Only display actions that are meaningful for the selected item. Do not show an enabled `Use` for an equipped bat.
- Disabled actions should explain why when practical (e.g., full health).

### 6.5 Loot container panel

- Header displays container identity (`CABINET`, `DRAWER`, `SUPPLY BOX`).
- List only remaining predefined loot item instances.
- Row contains small icon + item name + selectable state.
- `Transfer` takes selected item if inventory capacity allows; otherwise show `Inventory full` feedback.
- Container state must not visually reset after item transfer; close with `Esc` or the close control.

### 6.6 Interaction prompt

- Small rectangular keycap **`E`** followed by **`SEARCH`**, **`INTERACT`**, or contextual verb.
- Shown only within permitted interaction distance; not an always-on HUD fixture.
- Avoid duplicate prompt/modal controls when menus are open.

### 6.7 HUD status bars

All meters include icon, label, fill, and value. Use the canonical semantic colors.

| Meter | Meaning of 0 | Meaning of 100 | Color |
|---|---|---|---|
| Health | Dead | Full health | Danger red |
| Stamina | Exhausted | Full stamina | Muted green |
| Hunger | Fed / best | Starving / worst | Warm brown |
| Thirst | Hydrated / best | Dehydrated / worst | Desaturated blue |

**Crucial:** Hunger and Thirst show **severity**, not remaining food/water. A value of `0/100` is healthy, `100/100` is critical. Do not invert the data model just to imitate a typical resource bar. Pair numeric values with semantic indicators (`Fed`, `Hungry`, `Starving` or equivalents) when feedback is needed.

- HP/stamina values may drain downward; hunger/thirst values rise as needs worsen.
- Survival time is **elapsed duration** (`HH:MM:SS`, optionally days elapsed) — **not an in-world day/night clock**.
- Equipped weapon area shows `Baseball Bat` or `Unarmed`, never ammunition/durability.
- Keep the primary HUD pinned near the top/edge, leaving world center unobstructed.

### 6.8 Notifications and feedback

- Short transient messages: `Inventory full`, `Saved`, `Save failed`, `Item used`, `Cannot interact`.
- Color conveys severity but text must communicate meaning independently.
- No permanent success banners. Save feedback only after persistence actually succeeds.
- Damage feedback should be clear but not obscure the player or enemy.

## 7. Screen specifications (MVP)

### S1 — Main menu

**Composition:** atmospheric, original abandoned-neighborhood artwork or a static/game-rendered scene; large branded title aligned away from action buttons.  
**Actions:** `New Game`, `Continue`, `Controls`.  
**Rules:** `New Game` opens **Choose Survivor**, then starts a run with `survivor_male` or `survivor_female`; neither is preferred or locked. `Continue` disabled/hidden without a valid unfinished local save, and restores the saved character. Starting a new run when one exists requires overwrite confirmation.

### S1a — Choose Survivor (MVP)

**Composition:** Two equally prominent survivor cards on the same charcoal/olive/rust design system. Show a full-body preview and a readable portrait for **Male Survivor** and **Female Survivor**. The selected card uses the established focus/selection border.  
**Actions:** `Start Run`, `Back`.  
**Rules:** Both are fixed default appearances with identical gameplay stats; no skins, clothing sliders, trait selection, unlocks, or gender-based difficulty modifiers. New Game must not silently preselect one as the sole default. Selected `characterId` is passed to Phaser and stored in the active save. See `PLAYER_CHARACTER_SPEC.md`.

### S2 — Gameplay HUD

**Composition:** minimal overlay, persistent four meters, elapsed survival duration, equipped weapon. Interaction prompts appear near the relevant in-world target or in a compact anchored overlay.  
**Rules:** Show the approved **top-right circular north-up minimap** with player position/facing; clicking it or pressing `M` opens the full neighborhood map and pauses simulation. No quest log, day/night clock, crafting button, ammo counter, or durability indicator for MVP.

### S2a — Full neighborhood map (MVP amendment)

**Composition:** readable full-map overlay from cached/static local world data, showing roads, three houses and player arrow. **Controls:** open by minimap click or `M`; close by `M`, `Esc` or visible X. Pause the existing game simulation while open, suppress movement/attack/loot commands, and preserve proper focus. No fog of war, enemy/hidden-loot markers, custom pins or day/night clock. See `MAP_DESIGN_SPEC.md`.

### S3 — Inventory

**Composition:** 12-slot grid + selected-item details/actions, dark matte panel.  
**Controls:** `I` toggles; mouse/keyboard selection where practical; gameplay input paused/suppressed while open.  
**Rules:** Only meaningful actions visible; never show future item systems.

### S4 — Loot container

**Composition:** compact container list with item rows and `Transfer`; contextual `E` prompt initiates.  
**Rules:** container cannot yield duplicated items; full inventory shows clear error and does not lose loot.

### S5 — Pause menu

**Actions:** `Resume`, `Save Game`, `Save & Exit`.  
**Rules:** pause game simulation and input; saving is manual; show pending/failed/success state accurately. `Esc` resumes if safe to do so.

### S6 — Game over

**Composition:** restrained rust-red `GAME OVER`, elapsed survival duration, atmospheric backdrop.  
**Actions:** `New Run`, `Main Menu`.  
**Rules:** dead run is not continuable; do not present `Continue` for a dead run.

### S7 — Controls reference (simple MVP view)

Display the current MVP keyboard and mouse controls. WASD moves, Shift sprints, the mouse aims, and Left Click swings an equipped bat. E searches the indicated container or picks up the indicated dropped item. I opens inventory, M opens the neighborhood map, and Esc pauses or closes the foreground panel. Space is unassigned. Shove, a right-click combat stance and control remapping are future candidates.

**Pointer interaction rule:** Only clicks within the active Phaser game world may trigger melee input. Clicks on React UI (buttons, inventory, loot panels, HUD interactive controls, minimap, full map and dialogs) must never fall through to Phaser. Suppress combat while the world is paused, a blocking panel is open, the character is dead, the baseball bat is unequipped, or the attack is on cooldown. Keep mouse-world facing consistent through camera scroll, zoom and isometric transforms.

### S8 — Confirmation dialog

Used for destructive run overwrite and other genuinely consequential operations. Clear question, safe `Cancel`, explicit confirming action. Avoid generic confirmations for trivial actions.

## 8. Interaction, keyboard, and accessible behavior

- All React controls use native buttons where appropriate; indicate accessible names and visible keyboard focus.
- The game canvas is keyboard-driven, but React overlays must prevent duplicate input reaching Phaser.
- Focus starts at a sensible control when a menu opens and returns appropriately when closed.
- Hover states must not be the only way to discover functionality.
- Prefer legible text at 100% display scaling; test at 125%/150% browser zoom where practical.
- `prefers-reduced-motion` may reduce UI animations without changing the underlying game logic.
- Do not couple gameplay decisions to frame-dependent UI animations.

## 9. React / Phaser integration guidance

- **Phaser owns** player, zombie, combat, inventory truth, and run lifecycle.
- **React owns** rendering of menus, HUD, item panels, and action controls.
- Use a typed event/command bridge (`PAUSE`, `RESUME`, `EQUIP_ITEM`, `USE_ITEM`, `TRANSFER_LOOT`, `SAVE_REQUEST`, etc.).
- HUD may receive throttled snapshots; never force React to re-render on every Phaser frame.
- Closing panels must restore focus and player input only when the run returns to the playing state.
- The design system is independent of persistence: IndexedDB/Dexie for MVP; optional Supabase later.

## 10. Component inventory and suggested ownership

| Component | MVP | Notes |
|---|---|---|
| `GameButton` | Yes | Primary/secondary/destructive/disabled |
| `GamePanel` | Yes | Common panel and section treatment |
| `GameDialog` | Yes | Destructive confirmation/focus |
| `MainMenu` | Yes | New, Continue, Controls |
| `CharacterSelectScreen` | **Yes** | Two equal default survivor cards, Start Run |
| `SurvivalHUD` | Yes | Four meters + elapsed duration |
| `EquippedWeapon` | Yes | Bat or Unarmed |
| `InventoryPanel` | Yes | 4×3 fixed slots |
| `InventorySlot` | Yes | Empty/occupied/selected |
| `ItemDetails` | Yes | Valid actions by item category |
| `LootContainerPanel` | Yes | Predefined container contents |
| `InteractionPrompt` | Yes | E + contextual action |
| `PauseMenu` | Yes | Resume, Save, Save & Exit |
| `GameOverScreen` | Yes | Duration, New Run, Main Menu |
| `ControlsReference` | Yes | Static keyboard guide |
| Crafting/Firearms/Map/Skill UI | **No** | Post-MVP only |

## 11. UI acceptance checklist

- [ ] Uses the exact canonical background/surface/olive/cream/red design tokens.
- [ ] Bebas Neue heading + Inter body are consistent across all MVP screens.
- [ ] 12 inventory slots, no stacks, no future weapons.
- [ ] Four item types only; `Baseball Bat` has no durability UI.
- [ ] Health/Stamina/Hunger/Thirst semantics are labeled correctly.
- [ ] Survival time is elapsed duration, not day/night time.
- [ ] Main menu, **Choose Survivor (male and female)**, HUD, Inventory, Loot, Pause, Game Over, Controls, and confirmations are present.
- [ ] Continue is conditional on valid active save; dead runs cannot continue.
- [ ] Buttons have visible hover, focus, pressed, disabled states.
- [ ] No unrelated SaaS/dashboard elements or post-MVP systems appear.
- [ ] UI is readable at the desktop target viewport and does not obstruct core play.

## 12. Change policy

Changes to **scope or functionality** go through the PRD first. Changes to **UI tokens, patterns, and screens** go through this document. Changes to **world assets, animation, lighting, or tile standards** go through `ART_DIRECTION.md`. Keep cross-document terminology consistent.
