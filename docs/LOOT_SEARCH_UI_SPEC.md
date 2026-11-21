# Dead County — Loot / Search UI Specification

> **Status:** Approved visual direction, MVP-safe implementation rules  
> **Version:** 1.0 — 2026-11-18  
> **Design step:** 7.2 — Loot / Search Panel  
> **Stack:** React + TypeScript + Tailwind CSS overlay; Phaser 4 gameplay and interaction authority  
> **Related specifications:** `PRD.md` (master v2.1), `DESIGN_SYSTEM.md`, `BUILDING_INTERIOR_SPEC.md`, `GAMEPLAY_HUD_SPEC.md`, `INVENTORY_UI_SPEC.md`  
> **Reference:** `references/approved-loot-search-concept.png` (approved for layout/art direction, **not** for out-of-scope mechanics)

---

## 1. Approval and scope boundary

The approved design shows a compact, weathered **Loot Container** panel on the left, the player's **Inventory** in the center, and contextual **selected-item details** at the right, all above the same dimmed isometric game scene. Keep dark-charcoal panels, thin weathered borders, readable cream text, restrained red/olive accents, square item cells, selected-item highlighting, and visible background gameplay.

**This approval is for layout and overall visual language.** The pictured reference also contains a day/night clock, item quantity badges, an implied hotkey bar and `E Take` / `R Take All` shortcuts. Those are **not part of the approved MVP mechanics** and must not be copied literally. Display **elapsed Survival Time**, use **one item per occupied slot**, do **not** show enemy dots on the minimap, and provide a clearly labeled **Transfer** action without adding new keyboard shortcuts.

### Explicitly in MVP

- Lootable **Cabinet**, **Drawer**, and **Supply Box** inside the three approved enterable houses only.
- Exactly **four** item kinds: Baseball Bat, Canned Food, Water Bottle, Bandage.
- **12 inventory positions**, laid out **4 columns × 3 rows**, one item instance per position.
- A compact loot panel reflecting the selected container's **remaining individual item instances**.
- Drag a container item onto Inventory, or select it, inspect its details and activate **Transfer**. Both actions move one item to the next free inventory slot.
- Accurate `Inventory full` feedback; container depletion persists in the existing local save.

### Not included

- `E Take` or `R Take All` shortcuts, automatic bulk transfers, stack counts, weight/encumbrance, ammo, guns, axes, medkits as separate items, durability, item trading, arbitrary house-door searching, outdoor mailbox/vehicle looting, randomized global loot tables, live day/night clock, enemy map pins, or additional storage capacity.
- Reverse transfer (moving inventory items **back into** a searched cabinet) is **not required** by the current PRD. The concept's left-pointing arrow is illustrative, not an authorization to implement container storage/deposit mechanics.

---

## 2. Player flow

1. The survivor moves by WASD **through a fixed open doorway** into House A, B, or C. Entry is seamless; **no `E` input** is used to enter a house. The roof hides automatically according to the building spec.
2. The player approaches a mapped indoor Cabinet, Drawer, or Supply Box. When that container wins the shared interaction selection, show **`E Search`** anchored above it.
3. Pressing `E` while that container is the active valid target opens the combined **Loot / Inventory** overlay. The panel header displays the container type (optionally a short grounded description, e.g. `Kitchen Cabinet`).
4. The player selects an available item from the loot list/grid. A nearby detail area displays that item's name, type, brief description and real gameplay effect. Selecting an item **does not** take or use it.
5. The player drags an item onto Inventory or activates **Transfer**. The first available slot is indicated during a drag. On success, exactly one instance leaves the container and appears in that vacant slot. The HUD strip reflects the updated inventory.
   Briefly highlight the receiving slot in the open Loot panel after the transfer succeeds.
6. If the inventory is full, **nothing moves** and the user sees `Inventory full`. Selection and remaining loot stay intact.
7. Esc or Close dismisses Loot and clears its pause reason. On return to gameplay, recompute the interaction prompt from the current world state.

### Interaction validation

- The same gameplay-owned eligibility logic must govern **both** prompt visibility and pressing `E`: mapped container ID, indoor type, not emptied, reachable, unblocked, inside a tunable interaction distance.
- Searchable containers and dropped items compete for one prompt under the shared [HUD selection rules](GAMEPLAY_HUD_SPEC.md#42-trigger-priority-and-dismissal). Display `E Search` only when the container wins.
- `E Search` **never appears beside an entrance just because it is a door**, nor beside a decorative mailbox, trash can, outdoor crate, parked car, fence, wall or unrelated furniture.
- On opening, save the target's immutable instance ID; validate it again before transfer. Never transfer from an obsolete, wrong, depleted or inaccessible container instance.
- The visible reference depicts the prompt near a cabinet. **That placement is correct only if the cabinet is actually in range**, not merely visible in the background.

---

## 3. Layout and hierarchy

**Desktop target:** Responsive from 1280×720 up to 1920×1080. Do not cover the entire game world with opaque background art; instead retain a dimmed, paused game scene behind one logical modal overlay.

**Preferred composition (matching approved screenshot):**

- **Left — Loot Container:** Smaller dark panel, title / container icon, selected-item border, compact grid/list of available **individual** items. Show only the contents belonging to the open container.
- **Center — Inventory:** Larger dark panel titled `Inventory`, **4×3 = 12** fixed slots; full inventory state is visible, including empty squares.
- **Between panels — Transfer:** One clear arrow or button pointing **from Loot to Inventory**, with a visible label **`Transfer`**. Button is enabled only when a container item is selected and a free inventory slot exists.
- **Right — Item Details:** Context panel beside the inventory if desktop width permits, otherwise tuck beneath the inventory. Show only information derived from item definitions, e.g. `Canned Food — Reduces Hunger severity`; avoid fixed fabricated numeric effects such as `+40 Hunger`.
- **Top-right of modal:** One clear **Close `×`** control for the entire coordinated panel. Do not implement two close icons that can desynchronize independent overlays.

Use the screenshot's proportions as a **visual direction**, not as a mandatory pixel-perfect geometry or extra slot capacity. If the screen is narrow, wrap the details below the grids while preserving the 12 inventory cells, a readable Transfer control, and a visible Close control. No mobile/touch optimization is required by the MVP.

### Simple implementation wireframe

```text
  ┌──── LOOT: KITCHEN CABINET ────┐       ┌────────── INVENTORY ───────────┐    ┌──── ITEM DETAILS ────┐
  │ [food] [water] [bandage]      │       │ [1]  [2]  [3]  [4]            │    │ Canned Food          │
  │ [    ] [     ] [       ]      │──→    │ [5]  [6]  [7]  [8]            │    │ Food                 │
  │   one item instance/cell     │Transfer│ [9] [10] [11] [12]           │    │ Reduces Hunger       │
  │                               │       │  one item per occupied slot    │    │ severity on Use      │
  └───────────────────────────────┘       └─────────────────────────────────┘    └──────────────────────┘
                                         [ Close ]
```

The 3-column **loot-side** example is purely a presentation grid; it is **not** a new fixed capacity for every container. The available entries reflect that specific container's predefined remaining inventory. The inventory-side **4×3** is fixed.

---

## 4. Item selection and details

| Approved kind | Label | Detail text / consequence | Transfer behavior |
|---|---|---|---|
| `baseball_bat` | Baseball Bat | Melee weapon; equip **after** transfer using Inventory actions | Move one bat instance into inventory |
| `canned_food` | Canned Food | Consumable; **decreases Hunger severity** when used later | Move one can instance |
| `water_bottle` | Water Bottle | Consumable; **decreases Thirst severity** when used later | Move one bottle instance |
| `bandage` | Bandage | Consumable; restores Health when used later, capped at 100 | Move one bandage instance |

- Multiple instances of the same kind appear in **separate cells/rows**; never as a stack `×2` / `×3`.
- Selecting an item only updates focus, highlight and details; it must **not** auto-transfer, auto-equip or auto-consume it.
- When no item is selected, show `Select an item to transfer` and disable the Transfer action.
- After a successful transfer, maintain consistent selection: move to the next valid remaining container item if one exists, or clear selection.
- If the source container is empty after a transfer, show a quiet `Nothing left to search` / `Empty` state within the open panel. On closing it, do **not** keep an actionable `E Search` world prompt for the depleted container.
- A container's remaining items are run-state data, not a new randomized population each time the screen opens.

---

## 5. Input, pause and overlay state

| Input / state | Required result |
|---|---|
| `E` in world, Search displayed | Open the selected container in the combined Loot / Inventory overlay |
| `E` in world, Pick up displayed | Transfer the indicated dropped item directly if a slot is free |
| `E` in world, no eligible target | No action |
| Mouse click on a loot item | Select item; update details |
| Click **Transfer** | Move one selected item if capacity allows |
| Esc or Close | Dismiss Loot once and clear only its own pause reason |
| `I` while Loot is open | Do not spawn a second standalone Inventory modal; continue using the coordinated Inventory section |
| Click anywhere on the modal or minimap behind the scrim | Do not perform a Phaser melee attack or interact with obscured world controls |
| `WASD`, `Shift`, `E`, `Left Mouse Click` while overlay is active | **World inputs blocked** |

Opening Loot freezes world movement, attacks, survival and elapsed time. Closing clears only the Loot reason. After returning from a hidden tab, the player must also choose Resume. One Escape event dismisses only the foreground panel.

The top-right minimap and bottom quick slots can remain visible in the dimmed HUD. Loot blocks both controls. The map omits zombie markers and the timer displays **elapsed survival time**.

---

## 6. Visual system and affordances

Follow the approved `DESIGN_SYSTEM.md` instead of treating generated art as a token source. Typical tokens used by the inventory spec include matte `#1B1E1D` surface, `#49544A` border, cream `#EEE6D6` primary text, olive `#686A3F` accent and warm focus highlight `#D6AE6D`; adjust to the canonical design tokens in the implementation.

- **Surface:** Weathered charcoal with light texture, subtle edge highlights; maintain contrast over detailed gameplay.
- **Typography:** Bebas Neue for prominent labels/headings, Inter for item names, effects, buttons and quantities (there should be no stack quantities).
- **Selected loot:** High-contrast border/ring and an explicit selected state. Keyboard focus must also be visible.
- **Transfer affordance:** A restrained arrow toward Inventory, paired with the **word `Transfer`**; disabled state remains readable.
- **Empty container:** Muted grid / message; do not show fake ghost items, pickup prompts or animation suggesting restocking.
- **Errors:** Compact `Inventory full` near the transfer action; message must be readable without relying on a red color alone.
- **No out-of-scope visual indicators:** weight readout, durability bar, extra gear slots, ammunition, new item categories, loot rarity or day/night display.

Use real buttons/keyboard-focusable controls in React, accessible names for icon-only controls, and text alternatives for item icons. Recommended interactive targets are at least approximately 44px where the layout permits.

---

## 7. Data authority and save-safe transfer

Phaser/gameplay state (or the canonical shared game store used by Phaser) owns source-of-truth **container contents**, **inventory slot state**, player reachability and pause state. React renders a read-only snapshot and dispatches commands; do not maintain an independent inventory source of truth in two separate panels.

Illustrative shared shapes (adapt to the repository's existing types rather than duplicating them):

```ts
type ItemKind = 'baseball_bat' | 'canned_food' | 'water_bottle' | 'bandage';

type ItemInstance = {
  instanceId: string; // unique, stable identity per individual item
  kind: ItemKind;
};

type LootContainer = {
  instanceId: string;
  kind: 'cabinet' | 'drawer' | 'supply_box';
  houseId: 'house_a' | 'house_b' | 'house_c';
  remainingItems: readonly ItemInstance[];
};

type LootOverlayState = {
  openContainerId: string | null;
  selectedLootItemInstanceId: string | null;
  // Actual inventory has exactly 12 positions; use the same data
  // source as the standalone Inventory view.
};
```

**Atomic transfer contract:**

1. Resolve and revalidate current `containerId`, selected `itemInstanceId`, and any relevant interaction eligibility before completing the command.
2. Verify item still belongs to that container and exists exactly once.
3. Scan slots 0 through 11 in row order and choose the first empty slot. If all are occupied, return `inventory_full` and keep the instance in the container.
4. As a single gameplay transaction, remove **exactly one** instance from the container and place **that same instance ID** into the vacant slot.
5. Publish one new canonical snapshot to React; invalidate/recompute the interactive `E Search` prompt if the container is now depleted.
6. Save the updated inventory **and** changed per-container contents in the same versioned IndexedDB/Dexie active-run snapshot during the existing manual save flow.

Transfer must be idempotent against double clicks / rapid action repetition (the same instance cannot be transferred twice). UI `loading`/disabled state may be used during an in-progress transfer, but correctness must be guaranteed in the state layer, not by a button alone.

House A’s designated starter container begins each fresh run with exactly one Baseball Bat and at least one Water Bottle. It uses the same `E Search` prompt, Loot panel, simulation pause, individual Transfer action and saved contents as every other container. Transfer leaves the bat unequipped and the water unconsumed. At zero Thirst, Use stays disabled. If the player takes only the bat, reopening or continuing shows the remaining water. Once depleted, the normal empty-container behavior applies. House C retains its separate food and water minimum.

After Save & Exit → Continue: selected male/female survivor, inventory items/equipment, remaining container loot and elapsed time all restore as saved. Opening the same cabinet does **not** refill its taken items. Death invalidates the active run in accordance with the master PRD.

House B’s designated kitchen container holds at least one Canned Food on every fresh run. It uses standard **E Search** and **Transfer**. The player may carry the can for later. Its **Use** action stays disabled at zero Hunger. During a revisit or Continue, retain the transferred instance in inventory and restore only the container’s remaining stock.

---

## 8. Acceptance criteria

- [ ] Only mapped reachable **indoor Cabinet / Drawer / Supply Box** objects display `E Search`; never a front door, porch, mailbox, outdoor prop or distant/out-of-reach container.
- [ ] When a valid nonempty container wins selection, its anchored `E Search` opens that container.
- [ ] Player crosses House A/B/C's open doorway seamlessly; roof auto-hides; no `E to Enter` or house `E Search` is shown.
- [ ] Search UI uses the approved **left loot panel + center 4×3 inventory + right item details** hierarchy, styled consistently with the Inventory spec.
- [ ] All loot entries use **only** Baseball Bat, Canned Food, Water Bottle and Bandage. Multiple same-kind items occupy separate positions; no stack or quantity badge.
- [ ] Selecting loot changes item details but does not consume or transfer it.
- [ ] Clicking **Transfer** moves precisely **one** selected instance to one free inventory slot; no reverse deposit behavior or `Take All` shortcut is required.
- [ ] With 12 occupied slots, transfer is refused, `Inventory full` appears, and the source item remains untouched.
- [ ] Depleted containers show a truthful empty state and do not refill after panel close/reopen or save/continue.
- [ ] Inventory and container contents persist together in the correct local IndexedDB/Dexie save snapshot.
- [ ] Loot freezes simulation and active time. Closing Loot reevaluates all pause reasons and any pending Resume.
- [ ] UI clicks, selection, and transfer do not trigger Left Mouse Click world attacks; `I` does not create a second inventory overlay.
- [ ] HUD displays **elapsed Survival Time** and minimap with **no enemy markers** while visible in the dimmed background.
- [ ] No out-of-scope controls from the generated image (`E Take`, `R Take All`, numeric hotbar shortcuts, ammo, durability, stacks) are implemented accidentally.
- [ ] Focus states, legible text, disabled Transfer explanations and dialog close behavior are keyboard accessible.

---

## 9. Handoff / next design step

**Approved:** Step 7.2 Loot / Search Panel's visual direction and this PRD-aligned specification. The image in the package is an approved **visual reference only**; implement the corrected UI behaviors specified here.

**No master PRD change required:** all functional rules already follow `PRD.md` v2.1. The next independent design stage is **Step 8 — Pause / Save / Game Over**, to be reviewed **one screen/image at a time** before individual specs are written.
