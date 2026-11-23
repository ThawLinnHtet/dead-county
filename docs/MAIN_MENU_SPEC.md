# Dead County — Main Menu Design & Interaction Specification

> **Status:** Visual concept approved; MVP implementation rules locked by Master PRD v2.1  
> **Version:** 1.0 · **Date:** 2026-11-18  
> **Scope:** Main Menu screen only (the Character Selection screen will be reviewed and specified separately)  
> **Implementation:** React + TypeScript + Tailwind CSS (Phaser runs the gameplay, not the menu)  
> **Primary references:** `docs/PRD.md`, `docs/DESIGN_SYSTEM.md`, `docs/ART_DIRECTION.md`  
> **Approved concept image:** `references/approved-main-menu.png`

## 1. Purpose and approval boundary

This document converts the **single, approved Dead County Main Menu image** into an implementable desktop-browser MVP screen. The approved design establishes its **visual composition**: distinctive distressed cream wordmark with restrained red distress, a left-hand stack of rugged rectangular actions, and a cinematic abandoned-suburb scene with a weathered water tower, decaying houses, vegetation, roads, and an abandoned truck.

**Important:** The approved illustration shows `Settings` and `Quit` in addition to the three approved core actions. These are **visual-concept extras**, not authorized MVP gameplay features. The shipping MVP Main Menu includes exactly **New Game**, **Continue**, and **Controls** per Master PRD v2.1. Do **not** create nonfunctional Settings/Quit buttons, a fake desktop Exit action, Credits, or a back-end/account flow. If product scope changes later, add such features through a PRD change first.

The illustration also shows orange-red sunset light; this is **static menu splash artwork**, not permission to add a day/night clock or change the **fixed daytime** MVP gameplay setting. The image must **not** be used as a flat screenshot with embedded clickable buttons; render actual text, buttons, and focus states in React.

## 2. Visual goal

- **Mood:** isolated, grounded, abandoned neighborhood; quiet tension rather than dramatic gore or fantasy horror.
- **Style:** gritty, detailed isometric/pixel-art scenery consistent with approved map and character art.
- **Brand:** large `DEAD COUNTY` wordmark in distressed warm cream; subtle weathered red smear/underline.
- **Composition:** left-aligned visual identity and navigation; the right and middle-right remain open to showcase the neighborhood scene.
- **UI appearance:** low-contrast black/charcoal scrim behind menu; dark matte rectangular buttons, fine borders, cream labels; one muted-olive primary button.
- **Avoid:** neon glows, glossy SaaS controls, large rounded cards, excessive blood, complex menu animation, extra gameplay destinations.

### 2.1 Canonical colors

Use shared semantic tokens already defined in `DESIGN_SYSTEM.md`:

| Token | Approved value | Main-menu use |
|---|---|---|
| `color.bg` | `#0C0F10` | Base background/fallback |
| `color.surface` | `#1B1E1D` | Secondary buttons / panel backing |
| `color.surfaceElevated` | `#343A33` | Hoverable elevated treatments |
| `color.accent` | `#686A3F` | **New Game** primary fill |
| `color.accentHover` | `#77794A` | Primary hover |
| `color.accentPressed` | `#525432` | Primary pressed |
| `color.danger` | `#B14A3A` | Brand distress and destructive contexts, **not** standard primary action |
| `color.warning` / `color.focus` | `#D6AE6D` | Keyboard focus ring |
| `color.textPrimary` | `#EEE6D6` | Labels and wordmark |
| `color.textMuted` | `#A8A8AE` | Subtitle, version, disabled hints |
| `color.border` | `#49544A` | Buttons / subtle edges |

Do not sample the illustration's brighter red/orange button as a new UI primary color. Artwork lighting may contain warmer sunsets without changing the token system. Verify contrast of cream labels against olive fills and use a darker fill if needed.

### 2.2 Typography

- **Brand:** Bebas Neue, visually distressed *only in a dedicated brand treatment*; target 64–80px at 1280×720, responsive scaling as needed.
- **Buttons:** Bebas Neue, roughly 20–24px, with consistent casing (prefer uppercase live labels if matching design system; displayed language remains the same).
- **Supporting label/version:** Inter, 12–14px.
- **Brand wordmark:** a dedicated branded asset is permitted if necessary to achieve texture, but accessible text or an accessible label must remain available.
- No gameplay instructions should be rasterized into the background artwork.

## 3. Layout specification

- **Baseline:** 1280 × 720 desktop; also verify 1920 × 1080 and a smaller practical desktop viewport.
- **Full-viewport background:** artwork cover-cropped without stretching. Important story elements (water tower, homes, street and truck) should remain legible at common 16:9 sizes.
- **Contrast zone:** adjustable left-to-right dark scrim/gradient behind the brand and buttons, with sufficient contrast in all supported crops.
- **Left content column:** aligned to a consistent desktop safe margin (start with ~48–72px; adapt responsively), occupying roughly 28–36% of width.
- **Visual hierarchy:** wordmark → optional small genre subtitle → vertical button stack → unobtrusive app version near bottom-left.
- **Action spacing:** use the design system's 8px/16px spacing increments; uniform full-width buttons about 280–360px on desktop and at least 44px high.
- **Buttons:** slightly softened 4px corners, matte distressed edges, readable icons if the project already provides matching licensed icons; icons are optional, never required to understand actions.
- **Avoid a large solid card** blocking the neighborhood illustration. Use a restrained scrim and button surfaces instead.

### 3.1 Required screen regions

1. `MainMenuBackground`: atmospheric original art, responsive crop, optional subtle vignette.
2. `GameWordmark`: large clear title with restrained weathered-red accent.
3. `MainMenuActions`: semantic vertical stack of three actionable controls.
4. `AppVersionLabel`: small version string sourced from build/package configuration; never hard-code a fake release status.
5. `MenuFeedback`: contextual error/status text when checking/loading saved games (only when needed).
6. `OverwriteConfirmationDialog`: displayed only if a new run would overwrite a valid unfinished save.

## 4. MVP menu behavior (binding)

| Action | When available | Result |
|---|---|---|
| **New Game** | Available when no other tab owns the slot and no transition is pending | Open Choose Survivor. Acquire slot ownership and confirm replacement of a valid unfinished run before committing. |
| **Continue** | A compatible, alive save exists and the slot is available | Acquire ownership, read and validate the latest committed IndexedDB state, then restore it. While another tab owns the slot, show “This run is open in another tab.” |
| **Controls** | Always | Open a simple readable controls reference screen/panel. `Back`/`Esc` returns to the Main Menu. |

**Not MVP:** Settings, Quit/Exit, Credits, account/profile, key remapping, language selector, premium store, cloud save. A website cannot meaningfully offer a native-app-style `Quit`; do not implement a dummy action just because the concept image depicts one.

### 4.1 New Game + saved-run protection

- If no resumable save is present, `New Game` proceeds to Choose Survivor immediately.
- If a resumable save exists, **do not erase it merely by opening the character picker**. Before committing a fresh run and overwriting the current one, show an explicit dialog with a safe `Cancel` option and a clear `Start New Run`/`Replace Save` confirmation.
- Cancel leaves the original save intact and returns to the appropriate screen without starting gameplay.
- The new run begins in **House A — Starter House** with the selected survivor and clean state.
- The interface must not silently favor either survivor; Character Selection is a different, separately approved UI milestone.

### 4.2 Continue behavior

- Query the existing `SaveRepository` abstraction for metadata/existence/validity; avoid coupling React menu components directly to Dexie/IndexedDB implementation details.
- A release notification or menu refresh only updates availability. Wait for the player to choose **Continue**, attempt exclusive acquisition once, then read the latest committed IndexedDB save under that ownership. If another tab wins, show “This run is open in another tab.” A later release again enables a choice on the menu.
- While save validity is being checked, show a nonmisleading disabled/pending state instead of an active `Continue` that fails immediately.
- When Continue is available, show the committed location, day and neighborhood time beneath the button. Describe the saved checkpoint, which may be an autosave or a manual save.
- Hide or disable `Continue` if there is no valid, alive, schema-compatible save (disabled with short explanation is preferred for discoverability).
- A failed read retains any frozen run and offers **Try reading again**. Retry only the read after verifying ownership. Only a successful read showing an absent record establishes an empty slot.
- Inspect the save-schema version before validating the payload. Disable Continue for a newer unsupported schema and show “This save uses a newer save format. Open it with a compatible version of Dead County.” Preserve it across menu navigation.
- Offer **Replace damaged save** only for positively diagnosed malformation after a successful read. Route New Game through the same protections. [Recovery requirements](PRD.md#112-local-run-ownership-and-save-shape)
- A dead run is non-continuable.
- Resume preserves the survivor ID, position, items, stats, looted containers, zombie state and elapsed duration.

### 4.3 Controls panel content

| Input | MVP command |
|---|---|
| `W A S D` | Move up, left, down or right on screen. Combine keys for diagonals. |
| `Shift` + movement | Sprint. After exhaustion, release and press Shift again once Stamina recovers. |
| `Left Mouse Click` on game world | Baseball bat melee attack (when equipped/eligible) |
| Mouse position in game world | Face/aim toward cursor |
| `E` | Search the indicated container or pick up the indicated dropped item |
| `I` | Inventory |
| `M`, minimap click | Full neighborhood map |
| `Esc` | Pause/close overlay |

`Space` is **not** assigned to melee attacks in MVP. No right-click combat stance, shove, firearm actions, remapping, or touch controls are included. The Controls screen shall not introduce extra commands from older images.

## 5. UI interaction states and accessibility

- Buttons have default, hover, pressed, focus-visible, disabled, and—when actually necessary—pending states.
- Use real HTML/React buttons; keyboard `Tab` moves focus and `Enter`/`Space` activates a focused button according to normal browser behavior. **This does not assign Space to a game-world attack.**
- Keep a clearly visible focus ring using `color.focus`; avoid autofocus that accidentally activates New Game.
- `Continue` is disabled during validation or if no valid save exists; disabled style remains readable and reason can be provided via supporting text.
- On navigating back from Controls/Choose Survivor, return focus to the menu action that opened the view where practical.
- Screen-reader accessible names are required for menu actions and the main title; background artwork is decorative.
- Mouse clicks on React buttons must never be forwarded as Phaser melee input; suppress world input until gameplay is active.
- Do not run zombie AI, survival timers or player movement while Main Menu is visible.
- If the artwork fails to load, show the same usable menu over a solid fallback background.

## 6. Architecture / implementation notes

- Build menu as React UI independent from Phaser simulation. Initialize/start gameplay on `Start Run` or `Continue` as the app architecture permits without duplicate Phaser instances.
- Separate view state from game state. A minimal state machine is adequate: `MainMenu → Controls → MainMenu` and `MainMenu → ChooseSurvivor → Playing`; `Continue → Playing` on successful load.
- Start with simple reusable components: `MainMenuScreen`, `MenuActionButton`, `MenuBackground`, and `OverwriteConfirmationDialog`. Reuse approved design system components instead of creating a second theme.
- Save repository must support async existence/validity checks and load errors. Treat browser storage as untrusted; validate schema and version.
- Avoid unnecessary global state libraries for a single menu. Add shared UI state only if it reduces real complexity.
- Provide explicit loading state for asset initialization and continue operation; do not invent a loading-screen mechanic for entering houses.

## 7. Art assets and handoff

Required deliverables for a production implementation:

- `menu-neighborhood-background.webp` (or appropriately optimized PNG/WebP): **art-only** scene without embedded menu text, logos, buttons or watermarks.
- `dead-county-wordmark.svg/png` or live styled title: distressed cream wordmark with restrained red accent; ship only original/licensed fonts/assets.
- Optional low-opacity grain/vignette layer; it must not obscure text or add excessive image weight.

**Important:** `approved-main-menu.png` is a **concept screenshot**, not a production background asset—because the generated image contains UI text and controls baked into the pixels. Recreate the neighborhood as an art-only backdrop, then layer accessible React UI over it.

Recommended repository locations:

```text
public/assets/ui/main-menu/menu-neighborhood-background.webp
public/assets/ui/main-menu/dead-county-wordmark.png  # optional
src/components/menus/MainMenuScreen.tsx
src/components/menus/MenuActionButton.tsx
references/approved-main-menu.png

docs/MAIN_MENU_SPEC.md
```

## 8. Out-of-scope detail from concept art

The approved image's **Settings** and **Quit** labels do **not** expand the approved v1.0 scope. They are omitted from implementation until separately approved. The visual sunset scene is static and does **not** add a playable day/night cycle. The water tower is allowed as atmospheric background/brand scenery and does not create an extra enterable building or explorable MVP destination.

## 9. Acceptance criteria

1. Menu matches the approved image's **layout, art style, wordmark, mood and visual hierarchy**, while using canonical design tokens for functional buttons.
2. Only `New Game`, `Continue`, `Controls` are present as interactive MVP menu options.
3. Clicking `New Game` leads to the male/female selection flow; an unfinished save is never overwritten without confirmation.
4. `Continue` is disabled/hidden when unavailable and restores a compatible live run when available.
5. `Controls` correctly shows **Left Click = Bat Attack**, mouse aim, `E` interact, `I` inventory, `M` map, `Esc` pause, `Shift` sprint and WASD movement; it does not show Space attack.
6. Menus work with mouse and keyboard and show clear focus, hover, disabled and error states.
7. Mouse interaction with menus never triggers melee combat or gameplay input.
8. Main Menu does not advance the world simulation or survival timer.
9. The screen renders legibly at 1280×720 and 1920×1080; content stays visible at smaller usable desktop sizes.
10. Art assets can fail gracefully without preventing access to the core actions.
11. No production background contains baked-in fake clickable controls or inaccessible essential menu text.
12. Production build works on Vercel without a backend/authentication service.

## 10. Next design gate

**Next:** Generate and review a **separate Character Selection screen** showing the two approved default survivors with equal prominence. Write `CHARACTER_SELECTION_UI_SPEC.md` **only after that screen is visually approved**. Do not infer character selection UI approval from the Main Menu approval.
