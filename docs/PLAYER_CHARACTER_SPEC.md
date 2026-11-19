# Dead County — Player Character Specification

> **Status:** Visual concept approved; implementation specification v1.0  
> **Date:** 2026-11-17  
> **Scope:** MVP v1.0 — **player characters only**  
> **Reference:** `references/dead-county-mvp-survivor-pair.png`  
> **Related:** `PRD.md`, `DESIGN_SYSTEM.md`, `ART_DIRECTION.md`

## 1. Approved decision

Dead County's MVP shall include **two equally supported, selectable default survivor characters**:

- `survivor_male` — male survivor.
- `survivor_female` — female survivor.

Both are **fully playable from the first release**. Neither is a premium unlock, unlockable reward, or secondary/unfinished appearance. The player chooses one at the beginning of each new run. They have identical gameplay mechanics, stats, hitboxes, speeds, stamina costs, weapon rules, inventory capacity, and interactions. The selected character is a **visual identity**, not a difficulty or class selection.

This supersedes earlier MVP wording that specified a single player sprite or deferred all character selection. **Character selection of these two fixed options is MVP; detailed character customization remains post-MVP.**

### Source of truth

The approved survivor-pair concept board is a **visual reference**, not a finished pixel-perfect sprite atlas. Production sprites must be authored/exported with consistent frames, transparency, anchors and animation timing. This specification takes precedence over incidental items or animation labels visible on the concept board where they conflict with the PRD.

## 2. Art goals

- **Grounded and believable:** ordinary people surviving a ruined neighborhood, not fantasy warriors or action heroes.
- **Alive rather than stiff:** breathing, natural weight transfer, grounded footfalls, shoulder/hip counter-motion, small secondary movement in clothing and packs.
- **Readable at game scale:** players stand out from roads, grass and interiors through shape and value, without a bright outline or glowing effect.
- **Same art quality:** male and female concepts, frames and UI portraits receive equivalent detail and polish.
- **Consistent isometric view:** feet, floor contact, shadow direction and relative proportions remain stable at all angles.

Avoid chibi proportions, exaggerated anatomy, fashion-model poses, photorealistic assets mixed with pixel sprites, cartoon-thick outlines, extreme gore, overly glossy gear, and an immaculate/heroic look.

## 3. Default survivor appearance

### 3.1 Male survivor — `survivor_male`

| Attribute | Approved direction |
|---|---|
| Build | Ordinary adult, average proportion and realistic posture |
| Head / hair | Dark brown, short-to-medium, slightly messy hair |
| Expression | Alert, tired, restrained; not a perpetual angry grimace |
| Outer layer | Worn muted olive field/work jacket |
| Under layer | Charcoal/dark gray hoodie or shirt |
| Pants | Worn dark gray work trousers/jeans |
| Footwear | Scuffed brown practical boots |
| Pack | Medium worn brown canvas backpack; visually consistent in game |
| Wear | Dirt, frayed seams and slight abrasions; blood only for damage feedback |
| Silhouette | Jacket shoulders and medium backpack distinguish him without exaggerated bulk |

### 3.2 Female survivor — `survivor_female`

| Attribute | Approved direction |
|---|---|
| Build | Ordinary adult, realistic proportions and practical stance |
| Head / hair | Brown hair tied back in a simple loose ponytail/bun, with restrained flyaways |
| Expression | Focused, alert and tired; visually equal in resolve to male survivor |
| Outer layer | Worn faded brick/rust-burgundy utility jacket |
| Under layer | Muted charcoal/dark gray shirt |
| Pants | Dark gray functional trousers/jeans |
| Footwear | Scuffed brown practical boots |
| Pack | Medium worn brown canvas backpack; shared pack volume/utility |
| Wear | Modest dirt and fabric wear; no decorative accessories that interfere with movement |
| Silhouette | Distinct hairstyle and jacket cut, without exaggerated body shape |

**Rules for the pair:** Same overall height target, animation fidelity, collision footprint, equipment capability, weapon reach, and interaction reach. Minor anatomical differences can appear in sprite art but **must not** change gameplay calculations.

### 3.3 Character palette

The characters belong to the muted world palette in `ART_DIRECTION.md` and should harmonize with the approved dark/olive/rust UI. Illustrative art-painting ranges below are **not exact pixel locks**:

| Role | Suggested direction |
|---|---|
| Male jacket | Dusty olive `#596046` / dark shadow `#394133` |
| Female jacket | Desaturated rust-burgundy `#75463F` / dark shadow `#4A302C` |
| Undershirt | Charcoal `#383C39` |
| Trousers | Dark worn slate `#444849` |
| Backpack | Warm weathered canvas brown `#776044` |
| Boots | Brown leather `#594736` |
| Blood/damage | Muted dark rust red, used sparingly |

Preserve contrast over grass, asphalt, dirt and wood floors; inspect both survivors side-by-side at **actual intended game zoom**, not only in enlarged portraits.

## 4. Character selection flow (MVP)

1. Player opens **New Game** from the React main menu.
2. Display a **Choose Survivor** screen containing equally prominent **Male Survivor** and **Female Survivor** cards, each with approved portrait and small full-body preview.
3. Player selects one character; visually indicate selection. No gameplay-stat difference is advertised or implied.
4. On **Start Run**, either survivor starts at the same position with Health 100, Stamina 100, Hunger 0 and Thirst 0 (all out of 100). All 12 inventory slots start empty and neither survivor has a weapon equipped. Both can collect the guaranteed bat and water from House A’s designated starter container.
5. **Continue** bypasses character selection and restores `characterId` from the active saved run.
6. Starting a new run while an active save exists uses the existing overwrite confirmation before replacing the saved run.

**UX rules:** React owns the selection screen, selection focus and inputs. Phaser creates the selected game actor. The screen follows `DESIGN_SYSTEM.md` tokens, type and components. Keyboard selection/focus states must be visible. The two cards must not label one as “main” or “advanced.”

**No MVP customizer:** No hair picker, skin-tone editor, body sliders, clothing swaps, named biographies, traits, classes, appearance unlocks, or additional avatar types.

## 5. Movement and animation specification

Both characters must support the same gameplay states and animation coverage. Movement logic and attacks remain owned by Phaser; visual frames are not authoritative for damage or collision decisions.

| State | MVP requirement | Motion/art direction |
|---|---|---|
| Idle | **Required** | Small believable breathing and weight shift; feet stay planted |
| Walk | **Required** | Smooth stride with clear contact/passing poses; no sliding feet |
| Sprint / Run | **Required** | Longer, urgent gait; slight forward lean, arms and backpack react |
| Melee attack (bat) | **Required** | Readable anticipation → swing/contact → follow-through/recovery |
| Death | **Required** | Controlled loss of balance and clear final non-active pose |
| Bite feedback | **Required cue** | Brief visible reaction on confirmed damage. A dedicated hurt animation is optional. |

**No sneaking/crouching, jumping, climbing, swimming, firearm reload, vehicle animations or alternate weapon-specific combat animations in MVP.** The concept illustration's extra props are exploratory, not approved equipment mechanics.

### 5.1 Natural motion requirements

- The center of mass should move naturally during walking/running, without excessive vertical bounce.
- Contact foot should visibly stay planted during each step; avoid moonwalking/sliding.
- Shoulders, head and arms should move subtly in relation to the hips.
- Backpacks and jacket hems can move slightly after major body movement, without cartoon oscillation.
- Attack should read as physical effort with a brief wind-up and recovery.
- Idle should look alive, without obvious repetitive exaggerated gestures.
- Animation timing and frame count shall be tuned in Phaser at target zoom: **do not treat the concept-board image's displayed frame sequences as production frame counts**.

### 5.2 Directionality

- WASD supports eight screen-relative directions. W projects up, S down, A left and D right. Convert the combined screen direction to a logical isometric world vector, then normalize it for the configured gait speed. Use the resulting world movement for collision and facing.
- When sprinting exhausts Stamina, return immediately to walking. A Shift key held through exhaustion cannot reactivate sprint during recovery. Release it and press it again with enough Stamina to sprint.
- Select the locomotion animation from actual displacement and current gait. Settle into idle when collision fully blocks movement. As sprint speed drops to walking speed, show the walk cycle. Attack and death presentation follow their gameplay states.
- Aim for visually convincing eight-direction representation in the final atlas. Author direction-specific angles where required for believable baseball-bat swings; careful mirroring is permissible only where it preserves pose, handedness and silhouette.
- During the first vertical slice, prove one facing direction and movement sequence before producing the complete two-character atlas.
- Character facing must remain consistent with world-space movement despite the isometric projection.

### 5.3 Mouse-directed melee controls (MVP)

- Use **Left Mouse Click** within the Phaser gameplay world to initiate an equipped baseball-bat swing; **Space is not an MVP attack key**.
- At the press that starts the swing, convert the pointer through the camera and isometric transform. Lock that world-space direction for the whole swing. Quantize the facing for animation display.
- A near-zero aim vector preserves the last valid facing to avoid jitter. Mouse-facing for attacks may differ from movement-facing without changing collision or movement direction.
- Bat swings still obey attack eligibility, aim arc, cooldown, obstruction, range, and hit frames. Mouse cursor placement is **not** auto-targeting.
- A swing can hit one zombie once. Rank eligible zombies at contact by angle to the locked centerline, then distance, then stable zombie instance ID in ordinal string order.
- Swinging costs zero stamina. A survivor can finish a swing after a nonlethal bite, including at zero stamina. Check reach at contact.
- Both survivors can take slow steps from wind-up through recovery. A swing immediately slows a sprinting survivor to this pace. The survivor can sprint again when recovery ends and stamina permits.
- Blocking React UI (including the minimap), pause, death, or an unequipped weapon disables attack input. UI clicks must not pass through to Phaser.
- No right-click aim stance, push/shove, or alternative weapon action in the MVP. Both default survivors use exactly the same input, attack timing, aim math, effective collision body and reach.

### 5.4 Provisional production animation budgets

These are *planning ranges*, not hard-coded numbers or user-approved frame layouts:

- Idle: about **4–6** frames per authored facing.
- Walk: about **6–8** frames per authored facing.
- Run: about **6–8** frames per authored facing.
- Melee bat attack: about **6–10** frames per required facing.
- Death: about **6–10** frames per needed facing.
- Optional hurt: about **2–4** frames or one timed flinch/tint.

Reduce redundant art production through careful re-use where it does not compromise visual believability. Avoid generating hundreds of frames before validating the game scale, controls, one walk cycle and one attack in the actual engine.

## 6. Isometric sprite geometry

- World convention: proposed **2:1 isometric** tiles, **64 × 32 source-pixel ground tile**, subject to the first in-engine test.
- Use **bottom-center foot/ground anchor** consistently for every animation frame and both survivors.
- Record sprite-frame bounds and logical collision footprint independently of visible pixels.
- The two characters share the **same logical player collision body**, independent of clothing or backpack silhouettes.
- Standing pixel height and collision radius are **not finalized** by the concept board. Set them after testing a survivor beside a door, bed, cabinet, sidewalk and zombie at the intended camera zoom.
- Keep the shadow small and grounded; shadow follows the actor's feet, not the full backpack silhouette.
- Maintain equivalent sprite silhouette/canvas bounds and z/depth ordering across outfits, directions and animation states.
- Use the same light direction, selective outline style and pixel density as environment art.

**Depth:** Sort by foot-ground position as defined in `ART_DIRECTION.md`. The sprite must remain visible under roof/wall occlusion transitions and must not draw through solid geometry incorrectly.

## 7. Equipment and visual state

### MVP supported

- **Baseball Bat** is the only equippable weapon.
- **Unarmed** visual state when the bat is not equipped.
- **Bat equipped** visual state with a consistent grip, idle carry and melee attack.
- A backpack is part of the **fixed character outfit art**; it is not a separate equip slot or inventory expansion mechanic.
- A confirmed bite briefly cues the survivor and updates the Health meter. Critical-need damage is identified on the relevant need meter.

### Concept elements not authorized for MVP gameplay

Flashlight, axe, frying pan, optional hats/gloves as interchangeable gear, clothing customization, weapon durability and extra inventory slots are **future-only/unapproved**. The character concept can show these as mood/detail references but must not cause new mechanics, icons, inventory items or menus to ship.

## 8. Data and save contract

Use stable values rather than display names:

```ts
type SurvivorCharacterId = 'survivor_male' | 'survivor_female';

interface RunCharacterSelection {
  characterId: SurvivorCharacterId;
}
```

`GameSave` must include `characterId`, and the save loader must validate that it belongs to the supported ID set. **Continue** must recreate the same character, not silently revert to male. Both characters use the same `PlayerStats`, collision, movement and combat calculations.

The MVP has **one active IndexedDB save slot**. No authentication, cloud saves or per-character separate save slots. Save migration/versioning must account for the addition of `characterId`; for any pre-character-selection development saves, explicitly reset test saves or implement a documented migration rather than guessing a value.

## 9. Suggested asset inventory and file conventions

```text
public/assets/
├── sprites/
│   └── player/
│       ├── survivor_male/
│       │   ├── survivor_male_idle_<dir>.png
│       │   ├── survivor_male_walk_<dir>.png
│       │   ├── survivor_male_run_<dir>.png
│       │   ├── survivor_male_attack_bat_<dir>.png
│       │   └── survivor_male_death_<dir>.png
│       └── survivor_female/
│           ├── survivor_female_idle_<dir>.png
│           ├── survivor_female_walk_<dir>.png
│           ├── survivor_female_run_<dir>.png
│           ├── survivor_female_attack_bat_<dir>.png
│           └── survivor_female_death_<dir>.png
└── ui/
    └── portraits/
        ├── survivor_male.png
        └── survivor_female.png
```

Here `<dir>` means an authored facing direction, e.g. `ne`, `se`, `sw`, `nw`. Individual PNG sequences can later be packed into atlases; the central animation manifest must describe final frame keys, dimensions, pivot and timing.

All animation sprites must have transparent backgrounds. Exported production files must not include concept-board text, borders, art-board shadows, sample scenery or adjacent unrelated frames. Store provenance and licensing in the asset manifest; use original assets, not copied Project Zomboid artwork.

## 10. Implementation tickets

1. **CHAR-01 — Character IDs and data:** Add typed two-character catalog and `characterId` to the run/save model.
2. **CHAR-02 — React selection screen:** Equal cards, selection/focus, New Game → select → Start Run, Continue restores chosen character.
3. **CHAR-03 — Player actor shared logic:** One player controller with same stats/collision/physics and character-dependent art asset selection.
4. **CHAR-04 — Male visual proof:** In-engine idle + walking + bat attack on one facing, inspect at intended zoom.
5. **CHAR-05 — Female parity proof:** Same tests, identical in-game scale and logical collision.
6. **CHAR-06 — Directional animations.** Complete the required facings, sprint and death for both survivors. Give each a brief visible bite reaction.
7. **CHAR-07 — Gameplay/release verification:** Both character choices can begin, fight, loot, save, continue and die without parity defects.

## 11. Acceptance criteria

- [ ] The New Game flow shows **Male Survivor** and **Female Survivor** as equal selectable options.
- [ ] Both characters have distinct, approved visual identities and consistent overall style.
- [ ] Both look naturally animated in actual Phaser gameplay at normal camera zoom.
- [ ] Both support idle, walking, sprinting, melee bat attack and death.
- [ ] Both use Left Click + world-space mouse-facing for bat attacks; `Space` is unassigned, and attacks never trigger through React overlays/minimap or while paused.
- [ ] Eight-direction gameplay movement behaves correctly, and visual facing remains believable.
- [ ] Collision, speed, stamina, health, damage, melee range and inventory are identical for both.
- [ ] Unarmed/equipped bat presentation matches game state.
- [ ] Inventory/UI never displays unapproved flashlights, guns, crafting or durability features.
- [ ] Save/Continue preserves the selected character correctly.
- [ ] Scene restart, game over and New Run do not swap character accidentally.
- [ ] All character visual assets share consistent pivots, scales and ground contact.
- [ ] Visual quality remains consistent between the two characters; neither is a placeholder.

## 12. Cross-document changes required

The approval changes **MVP scope** from “one survivor sprite” to “two selectable default characters.” The canonical `PRD.md` must update:

- **Feature matrix:** `Two selectable default survivors — MVP: Yes`; `Full character customization — Post-MVP`.
- **Player controller:** Both character IDs are valid; gameplay statistics/mechanics are identical.
- **Main menu / run lifecycle:** `New Game → Choose Survivor → Start Run`; `Continue` restores saved selection.
- **Persistence:** Add validated `characterId` to `GameSave`.
- **MVP definition of done:** Both survivors are playable and tested.

`DESIGN_SYSTEM.md` should include a **Choose Survivor** screen; `ART_DIRECTION.md` should explicitly require parity between the two default survivor sprite sets. Neither update authorizes any zombie, environment or building redesign yet.

**Next creative checkpoint:** Review a **zombie-only** concept image after this player-character spec has been accepted. Do not write the zombie specification before its image is approved.
