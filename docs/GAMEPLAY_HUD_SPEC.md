# Dead County — Gameplay HUD & Contextual Search Specification

> **Status:** Visual direction accepted; implementation rules clarified by the approved `E Search` decision  
> **Version:** 1.0 · **Date:** 2026-11-18  
> **Scope:** Single-player desktop gameplay HUD, contextual search prompt, circular minimap, and basic HUD interactions  
> **Implementation:** Phaser 4 gameplay world + React/TypeScript/Tailwind HUD overlay  
> **Primary authority:** `PRD.md`, `DESIGN_SYSTEM.md`, `MAP_DESIGN_SPEC.md`, `BUILDING_INTERIOR_SPEC.md`, `PLAYER_CHARACTER_SPEC.md`  
> **Preferred visual reference:** `references/approved-gameplay-hud-concept.png`

---

## 1. Approval boundary and priority

The preferred visual direction is the **user-selected, cinematic isometric neighborhood HUD**: a survivor with a baseball bat against ordinary zombies, detailed single-story houses and roadside clutter, compact four-stat panel at upper-left, time and circular minimap at upper-right, a bottom-centered item strip, a compact control legend at the right, and a small contextual interaction prompt near an actual interactable.

The user explicitly confirmed that **`E Search` appears only when the survivor is near a lootable container**. It must **not** appear merely because the survivor is near a doorway or a whole house. Open entrances are traversed by walking through them; no door interaction key is needed.

**Priority rule:** Screenshots communicate arrangement and mood. The master PRD governs mechanics. Elapsed Survival Time remains distinct from the approved in-game day and time. Doors and windows use Open or Close prompts. Search prompts identify reachable containers.

The **bottom 10-cell bar** mirrors the canonical inventory and provides click access to carried items under FR-I17. See §5 for its interactions.

---

## 2. Game HUD content and desktop layout

**Baseline viewport:** 1280×720 16:9 desktop, also verify 1920×1080 and narrower desktop browser windows. Use anchored responsive regions rather than hard-coded screen-space art. Keep the center of the street/interior and player combat arc unobstructed.

| Region | Required information | Presentation |
|---|---|---|
| **Upper-left** | Selected survivor portrait, Health, Stamina, Hunger, Thirst | Compact dark translucent/matte panel; 4 labeled bars, icons, and `value / 100` numbers |
| **Upper-right, beside minimap** | **Elapsed survival duration** | Small time panel, e.g. `Survived 00:42:17`; count active gameplay time only, **not** a world clock |
| **Upper-right** | Circular minimap | Approx. 150px diameter as an initial design baseline, dark outer ring, `N` label, roads/houses/player arrow |
| **Bottom-center** | Equipped bat / quick inventory | Restrained 10-cell row with clickable occupied slots. See §5. |
| **Lower-right** | Compact optional static controls legend | `I Inventory`, `M Map`, `Esc Pause`; no interactive clicks required for passive legend |
| **Near a valid in-world target** | `E Search` or `E Pick up <item name>` | One prompt anchored to the selected container or dropped item (see §4) |

### 2.1 Survival bars and numeric semantics

| Stat | Meaning of 0 | Meaning of 100 | Color family |
|---|---|---|---|
| **Health** | Dead | Fully healthy | Muted danger red |
| **Stamina** | Exhausted | Full | Olive/green |
| **Hunger** | Fed (no hunger) | Critically hungry | Weathered amber |
| **Thirst** | Hydrated (no thirst) | Critically thirsty | Muted blue |

**Important:** Hunger/Thirst values are **severity**. Higher values mean **worse**, unlike Health/Stamina. Display their actual 0–100 severity consistently; never silently invert the values in UI or save data. Indicate critical states with a text/icon warning rather than color alone. Round/clamp display safely to 0–100. The bars are tied to actual gameplay state, not mockup numbers.

Use the hunger or thirst meter to warn which supply the player needs while there is still time to make a supply run. If both needs are critical, keep both warnings visible. When one need falls below its critical threshold, clear only its warning. During playtesting, check whether a player in House A can recognize the warning and reach food or water in time. [Survival requirements](PRD.md#82-survival-stats)

Health updates for any confirmed damage. A bite briefly cues the survivor. For Health drain from critical needs, identify the cause by the relevant meter with a label or icon, keeping both warning states visible when both needs are critical.

### 2.2 Survivor portrait

- Use the selected male/female survivor portrait and corresponding playable sprite, not a fixed male portrait.
- Portrait appearance changes only with `characterId`; stats and controls stay identical.

### 2.3 Visual treatment

- Use the established design system: matte charcoal panels, subtle border, muted distressed framing, cream legible text; restrained red for danger and amber for warnings.
- Bebas Neue is for large menu/display headings; live gameplay numbers and labels use readable Inter / tabular numeric font.
- Avoid giant opaque HUD blocks, neon glow, excessive weathered texture on small text, or a permanent game logo overlay.
- The image's cinematic warm dusk is a **visual reference only**. MVP world lighting remains **fixed daytime**—no running day/night simulation or clock.

---

## 3. Circular minimap

- Appears at top-right **indoors and outdoors**.
- Draw a simplified map of the *same fixed neighborhood*: roads, house/building footprints and a player arrow; static yards/vegetation may appear with subdued color.
- **North-up is fixed**. Rotate the player arrow to match facing; do not rotate the map as the survivor turns.
- **No zombie/enemy red dots, hidden loot, cabinet markers, quest markers, threat pings or fog of war.** A zombie appearing in the main gameplay world does not add a minimap indicator.
- Clicking/keyboard-activating the minimap, or pressing `M`, opens the approved **full neighborhood map** and pauses simulation. `M`, `Esc`, or its Close control dismisses that overlay.
- Minimap data comes from cached/simplified local geometry, not live enemy positions or an internet map service.
- Minimap and full map must agree about road layout and player position; keep player arrow visible as the camera moves and when inside a house.
- A minimap click must be **consumed by React/UI** and must not trigger Phaser's Left Click melee attack.

---

## 4. Contextual search and pickup

### 4.1 The rule

`E Search` is displayed **only** for a nearby, valid, directly reachable instance of one of the three **indoor lootable container types**:

1. **Cabinet**
2. **Drawer**
3. **Supply Box**

The player must be **in interaction range** of the specific container and have a valid unobstructed interaction path/line of reach. The precise range in logical world units is a **gameplay tuning constant**, not a fixed number inferred from concept pixels. Use the same definition for the prompt and actual `E` interaction eligibility.

**Never display `E Search` just because the player is beside:** the front door, doorway, house exterior/porch, mailbox, trash bin, parked car, decorative crate, fence, window, generic furniture, or an out-of-range container. An art prop is not a lootable container without an explicit mapped container instance/ID.

### 4.2 Trigger, priority and dismissal

- Consider reachable dropped items and reachable nonempty searchable containers within interaction range. Select the nearest in world space. At equal distance, select a drop before a container and break ties within the same kind by stable instance ID. Show exactly one prompt anchored to the winner.
- Anchor the prompt just above the selected object. Track its projected screen position as the camera moves and keep the text readable at screen edges.
- `E Search` opens the selected container. `E Pick up <item name>` transfers the displayed drop directly into a vacant slot. A full inventory leaves the drop on the ground and shows `Inventory full`. If the displayed target becomes invalid, refresh the prompt and wait for a fresh press.
- Hide the prompt immediately when the player exits range, the target is no longer reachable/valid, the selected object changes, the player dies, or another blocking overlay opens. On returning to gameplay, recalculate eligibility.
- If the container has been completely looted, do **not** offer an actionable `E Search` leading to phantom loot. An empty state may be shown inside an already-open loot panel, but there are no infinite or regenerated items.
- `E` while no eligible target is selected does nothing; it must not target an arbitrary distant container.

### 4.3 Door and interior behavior

- Exterior doors start closed on a fresh run. Press **E** at **Open door** and walk across the threshold with WASD. Cedar Workshop shows **Locked door**, **Unlock door** with the key, or **Unlatch door** from inside. Continue restores each opening's saved state.
- Show the wedged state in the door prompt. The player applies a wedge through Inventory from inside beside the closed door.
- Entering makes that house's roof hide/fade automatically (with wall occlusion handled by the approved interior system).
- When an indoor cabinet, drawer or supply box wins selection, anchor `E Search` at that container.
- Zombies use the same doorway and world navigation; search prompts do not alter collision/pathfinding.

### 4.4 Loot panel behavior

- The panel pauses/suppresses world simulation as established by the master PRD's blocking-overlay convention.
- Transfer the authored supplies carried by the selected container. Report capacity limits in the Loot interface.
- Inventory is **12 fixed slots**, **one item instance per slot**, **no stacks or quantity badges**.
- A full inventory prevents transfer without item loss/duplication and gives a clear error.
- Transferred/depleted contents are persisted to the local run save.

### 4.5 Reference-specific correction

The preferred concept image depicts `E Search` near a front entrance. **That placement/text is illustrative and is not approved implementation behavior.** In the playable build, move this prompt to an **actual indoor Cabinet, Drawer or Supply Box** and show it **only when the survivor is within eligible interaction range**. Walking up to the entrance by itself should show **no `E Search`**.

---

## 5. Bottom item strip / equipped weapon

The user specifically preferred the reference with a **bottom-centered horizontal cell strip**, compared with the alternate mockup that moved only a baseball-bat panel to the bottom-left. Preserve that **composition** as a visual direction.

- Render a compact **10-cell quick inventory** mirroring the first 10 positions. The full **12-slot** inventory opens with `I` or the strip’s **Inventory** control.
- Clearly highlight the currently **equipped Baseball Bat** in its mirrored position; if unequipped show a coherent unarmed state. One baseball-bat weapon type only.
- Use only the four canonical item icons. The red-cross *medkit* illustrated in the concept should be represented as the approved **Bandage**, not a new item category.
- Do not copy image quantity badges (`×2`, etc.): all MVP items are **unstacked**, one item per occupied slot.
- Click or keyboard-activate an occupied bat slot to equip that instance. Repeating the action leaves that bat equipped. An active swing or recovery locks weapon changes.
- Activating a consumable opens Inventory on that item. **Use** applies the existing eligibility and consumption rules. Empty slots have no action. Arrange slots in the full Inventory grid.
- Quick slots have no `1`–`0` bindings or extra capacity. The strip owns its clicks so they cannot trigger world attacks.

---

## 6. HUD and combat controls

| Input | Effect in MVP |
|---|---|
| `W` `A` `S` `D` | Move up, left, down or right on screen. Combine keys for diagonals. |
| `Shift` + movement | Sprint subject to Stamina. After exhaustion, release and press Shift again. |
| Mouse cursor over **game world** | Determine bat attack facing in logical world coordinates |
| **Left Mouse Click** on active game world | Eligible baseball-bat melee attack; obey range, arc, obstruction and cooldown |
| **`E`** | Perform the displayed Search or Pick up action |
| `I` | Open/close 12-slot inventory (blocking panel) |
| `M` | Toggle full neighborhood map (blocking overlay) |
| Click circular minimap | Open full neighborhood map (must not attack) |
| `Esc` | Close foreground overlay or pause/resume as appropriate |
| `Space` | Unassigned in MVP |

Attacks must not fire from React pointer events on any HUD region, minimap, strip, dialog or menu. Phaser must ignore world melee input while the run is paused, a blocking overlay is open, the player is dead, the bat is unequipped, or an attack is on cooldown. Facing uses mouse world coordinates after camera/isometric transformations; UI cursor hovering must not count as an attack or pick an auto-target.

---

## 7. Game state, data contracts and integration

**Authority:** Phaser gameplay systems own world status, interaction selection, player facing/combat, inventory/equipment and run time. React owns presentation and accessible UI controls. Avoid React recomputation of collision or loot reachability.

Suggested (illustrative) UI projection; adapt names to the codebase's canonical shared types:

```ts
type HudView = {
  survivorId: 'survivor_male' | 'survivor_female';
  health: number;          // 0..100, high = healthy
  stamina: number;         // 0..100, high = capable
  hunger: number;          // 0..100, high = worse
  thirst: number;          // 0..100, high = worse
  elapsedActiveSeconds: number;
  equippedItemId: string | null;
  inventoryPreview: readonly (string | null)[]; // 0..10 mirrored, not new storage
  interactable: null | {
    instanceId: string;
    action: { kind: 'search'; type: 'cabinet' | 'drawer' | 'supply_box' }
          | { kind: 'pick_up'; itemName: string };
    screenX: number;
    screenY: number;
  };
  minimap: {
    playerX: number;
    playerY: number;
    facingRadians: number;
    mapId: string;
  };
  runState: 'playing' | 'paused' | 'blocking_overlay' | 'game_over';
};
```

- Emit HUD view updates only when relevant state changes and at a sensible throttled cadence for timing/position. Static map geometry is cached separately.
- The game world exposes the selected drop or container as one `interactable`, or `null` when none qualifies. React renders the action supplied by the game.
- Commands should carry the selected `instanceId` and revalidate reach/eligibility when `E` executes, avoiding stale prompt exploits.
- Use the existing typed React–Phaser bridge. Unmount/restart must not double-install keyboard or pointer handlers.
- Elapsed time and remaining loot are saved in IndexedDB/Dexie; loading restores both. Time does not advance while paused, the inventory/loot/full map is open, or at main menu/death.
- Verify z-index and input propagation for all React overlays; gameplay canvas stays beneath UI.

---

## 8. Required states

1. **Outdoor playing:** all four stat bars, survivor portrait, elapsed time, minimap, item strip and optional legend visible; no `E Search` near non-searchable house doorway.
2. **Entering a house:** seamless walk-in, roof hide, persistent HUD and minimap, **no entrance prompt**.
3. **Container selected.** Anchor `E Search` at the selected container. When a drop wins selection, show `E Pick up <item name>` at the drop.
4. **No reachable target.** Hide the prompt. Pressing `E` does nothing.
5. **Loot panel open:** world paused, prompt hidden, inventory transfer rules and save-safe depletion enforced.
6. **Inventory/full map/pause open:** gameplay inputs suppressed, timer frozen; map may open via `M` or minimap click.
7. **Weapon unequipped or death:** no valid world melee; HUD shows unarmed or transitions to Game Over appropriately.
8. **Resume from save:** correct elapsed time, survivor portrait, meters, equipment, container depletion and map position; no stale prompt for a depleted or now-distant container.

---

## 9. MVP acceptance checklist

### Layout and data

- [ ] HUD composition follows the chosen reference at 1280×720 and remains legible at 1920×1080.
- [ ] Portrait matches selected survivor (male/female), both mechanically identical.
- [ ] Health/Stamina/Hunger/Thirst show actual game values with the documented good/bad semantics.
- [ ] Time is **elapsed survival duration**, not `Day 1` or `07:40 AM`.
- [ ] Bottom item strip preserves visual preference without extra slots, stacks or unauthorized hotkeys.
- [ ] Only the four canonical items render; no medkit, extra tools, ammo or durability bar.

### Search and houses

- [ ] Standing at the entrance of any house **alone** displays no `E Search`.
- [ ] Walking through an open doorway works without `E`, screen transition or teleport; roof hides on entry.
- [ ] When an indoor Cabinet, Drawer or Supply Box wins selection, `E Search` appears at that object.
- [ ] Leaving range, moving behind blocking geometry, opening an overlay or depleting the container hides or invalidates the prompt appropriately.
- [ ] When two containers are close, exactly one deterministic nearest eligible target is selected.
- [ ] Pressing `E` executes only the displayed search or pickup. With no eligible target it does nothing.
- [ ] Loot cannot duplicate or disappear on full inventory; depletion persists across save/load.

### Minimap, combat and lifecycle

- [ ] North-up circular minimap shows roads/buildings/player orientation indoors and outdoors.
- [ ] No zombie markers, threat red dots, hidden loot markers or quest pings appear on map/minimap.
- [ ] `M` or minimap click opens the full neighborhood map and pauses the world; close works and restores focus.
- [ ] Clicking minimap/HUD never attacks zombies, while clicking eligible game world does.
- [ ] Mouse-world attack facing remains correct when camera follows/zooms; `Space` does not attack.
- [ ] Timer, zombie AI and stats freeze on blocking overlays and resume consistently.
- [ ] Saving/reloading indoors restores elapsed time, correct portrait, camera/world and roof state.

---

## 10. Implementation sequencing

1. **HUD shell:** stat panel, portrait, survival timer and responsive anchors, using dummy view state before wiring Phaser.
2. **Map integration:** cached circular minimap and keyboard/click-open full map with correct input isolation.
3. **World interaction projection:** define mapped container IDs, eligibility queries, one target selection, and contextual prompt anchor.
4. **Loot-panel bridge:** `E` opens correct panel, transfer and persistence honor 12 slots and no stacking.
5. **Equipped-item/quick inventory:** mirror existing slots and equipment. Verify direct equip, focused consumable details, and click isolation from gameplay.
6. **Combat/overlay safety + QA:** left-click world-only attacks, pause/focus handling, 20-zombie performance baseline and acceptance checklist.

### Deferred questions (not blockers for MVP)

- Exact screen-pixel offset/range for `E Search` should be tuned after a Phaser collision prototype.
- A fully functional numbered 10-slot hotbar requires separate PRD approval; visual preference alone does not define new input bindings.

**Final locked interaction statement:** **Walk into houses; search only reachable lootable indoor containers.** `E Search` never identifies a house entrance. No zombie markers on the minimap.
