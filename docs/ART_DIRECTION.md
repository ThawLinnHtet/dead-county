# Dead County — Game Art Direction

> **Status:** Approved visual direction · **Version:** 1.3 · **Date:** 2026-11-17  
> **Applies to:** Dead County MVP v1.0 · **Engine:** Phaser 4  
> **Related documents:** `PRD.md`, `DESIGN_SYSTEM.md`, `PLAYER_CHARACTER_SPEC.md`, `ZOMBIE_CHARACTER_SPEC.md`, `MAP_DESIGN_SPEC.md`, `BUILDING_INTERIOR_SPEC.md`  
> **Reference:** `../references/dead-county-design-system.png` in the accompanying design package

## 1. Creative brief

**Dead County** is a grounded, readable **2D isometric zombie survival** game set in one abandoned suburban neighborhood. The visual experience should suggest **an ordinary place that has quietly collapsed**: overgrown yards, boarded windows, untended streets, scattered household goods, and a few wandering zombies.

The intended atmosphere is tense, lonely, and practical — not fantastical, neon, comedic, or excessively gory. It is **inspired by the genre**, not a reproduction of Project Zomboid's protected assets, visual identity, locations, names, or characters.

### Five art principles

1. **Isometric clarity:** legible geometry, grounded foot placement, consistent camera angle.
2. **Muted realism:** worn materials and subdued colors; avoid oversaturation.
3. **Readable threat:** instantly distinguish zombies, player, blocked spaces, and interactables.
4. **Restraint:** pixel detail and distress where useful, not visual noise everywhere.
5. **Asset consistency:** common perspective, scale, palette, outline weight, and shadow logic.

## 2. MVP art scope (binding)

| Asset/feature | MVP expectation | Excluded until after MVP |
|---|---|---|
| World | One handcrafted neighborhood | Streaming multi-town open world |
| Houses | Exactly three enterable houses | Multi-floor buildings, large interiors |
| Environment | Road, sidewalk, yards, fences, trees, basic static props | Dynamic destruction/weather |
| Interior | Beds, cupboards, drawers, supply boxes, basic furniture | Crafting stations, complex utility systems |
| Player | **Two selectable default survivors: male and female**, equal gameplay and full MVP animation coverage | Full character creator / cosmetic outfits |
| Zombies | One standard gameplay archetype, five approved cosmetic looks (civilian, worker, hoodie, female civilian, bloody); no stat differences | Specialty zombies, distinct speed/HP types and complex hordes |
| Weapons | Baseball bat | Guns, ammunition, durability variants |
| Loot icons | Baseball Bat, Canned Food, Water Bottle, Bandage | Huge item catalog and stacks |
| Animation | Idle, walk, sprint, attack, hurt/death when necessary | Advanced contextual animation |
| Time/lighting | Fixed daytime presentation | Day/night cycle and weather |
| Effects | Simple hit, pickup, damage, death feedback | Explosions, elaborate particles |

Art created for future systems should not be introduced into current screens or game data simply because it is available.

## 3. Camera, perspective, and tile geometry

### 3.1 Perspective

- Use a consistent **2:1 isometric tile footprint** for the MVP.
- Proposed base ground tile: **64 × 32 source pixels**. This is a starting convention; lock it after verifying the selected tileset and character proportions in Phaser.
- The game is visually isometric but gameplay collisions/pathfinding operate in a logical 2D world/grid.
- Do not mix true top-down sprites with isometric buildings or sprites using incompatible angles.

Conceptual projection from logical tile grid to screen:

```ts
screenX = (tileX - tileY) * (tileWidth / 2);
screenY = (tileX + tileY) * (tileHeight / 2);
```

Add camera/world offsets separately. Projected coordinates are for **rendering**, not a substitute for the gameplay collision/navigation coordinate system.

### 3.2 Depth and occlusion

- Ground tiles render beneath all entities.
- Walls, furniture, props, and sprites must visually overlap in a consistent near/far order.
- Characters are depth-sorted by their **ground-contact anchor/feet**, not sprite image top-left.
- Roof layers become hidden or transparent when the player enters a building and would otherwise be obscured.
- Walls may require selective fading to preserve visibility and player control.
- Avoid frequent transparency flicker at doorways: use clear interior zones and transitions.

### 3.3 Camera framing

- Desktop baseline: 1280 × 720 game viewport.
- The player should remain easy to locate and should not be concealed by the HUD.
- Keep the camera within world bounds and avoid revealing empty terrain.
- Test high-density and low-density areas for occlusion and sprite readability.

## 4. World palette and color language

UI tokens are defined in `DESIGN_SYSTEM.md`. Environment art is **related but not identical**; natural materials need their own palette while retaining the approved mood.

### 4.1 Palette direction

| Category | Visual treatment |
|---|---|
| Road | Soft charcoal, faded asphalt, muted stone grays |
| Sidewalk | Dirty warm gray; clear separation from road |
| Grass | Dusty olive, dark moss, restrained muted yellow-green |
| Trees | Dark olive foliage with subdued brown trunks |
| House siding | Weathered beige, dirty gray, desaturated muted brown |
| Roof | Aged slate, asphalt gray, dark warm red/brown where appropriate |
| Wood | Weathered walnut and dry tan with low shine |
| Metal | Dull cool gray, lightly rusted edges |
| Blood/damage | Restrained deep rust red, not bright fluorescent red |
| Interactables | Legible shape/silhouette and selective highlight, not constant saturated glow |

Suggested sample environment colors (art-direction references, **not pixel-perfect material locks**):

- Asphalt dark `#3E4140`; asphalt mid `#555956`.
- Grass olive `#596047`; shadow moss `#394635`.
- Weathered siding `#9B9787`; aged wood `#6E5A49`.
- Rust red `#8A4137`; dirt `#736650`.
- Pale concrete `#8F9187`; deepest shadow `#252B29`.

Keep value separation high enough that the player silhouette and zombie threat remain clear over every common floor type.

## 5. Pixel art, outline, and texture rules

- Favor compact, restrained pixel-art shapes with readable silhouettes and sensible material texture.
- Keep pixel density consistent across tiles, sprites, and props. Do not mix tiny-detail sprites with blurry high-resolution elements.
- Avoid aggressive anti-aliasing on pixel sprites. Configure Phaser sampling/pixel-art rendering consistently; verify actual camera scaling.
- Choose one primary outline convention. Prefer selective dark outlines and form shading rather than heavy uniform cartoon borders.
- Distressing belongs mostly in material surfaces and static title graphics, not live item text.
- Do not rely on generated image-board details as final production assets; produce or source clean, licensed game-ready sprite sheets and tilesets.

### 5.1 Texture budgets

- Roads: limited cracks and markings; avoid repeating identical debris on every tile.
- Grass: sparse weeds with clustered overgrowth around fences/edges.
- Walls: subdued wear and a few boarded windows, not every surface heavily damaged.
- Interiors: sparse storytelling props that do not hide critical interactables.
- Blood: used as a response and storytelling cue, never as the dominant color everywhere.

## 6. Environment kit (MVP)

### 6.1 Outdoor kit

Required categories:

- Ground: road, sidewalk, grass, driveway, dirt accents.
- Road details: faded center line, cracks, curb transitions.
- Structures: three distinctive residential house exteriors.
- Boundaries: fences, trees, shrubs, and walls.
- Props: at least one street-side visual point of interest, optional parked static car **as scenery only**.
- Context: a few boarded windows, overgrowth, and abandoned household details.

**Static parked cars are environmental props, not a vehicle gameplay feature.** No driving UI or mechanics.

### 6.2 House interior kit

- Three single-floor accessible interiors.
- Floors: timber, tile, or carpet variants consistent with house identity.
- Static furnishings: bed, table, couch, cabinets, drawers.
- Lootable categories: `Cabinet`, `Drawer`, `Supply Box`.
- Doors/entrances: visual openings consistent with fixed collision paths; **locks, breakable doors, and detailed open/close interactions are deferred**.
- Distinguish walkable floor from furniture collision with shape and negative space.

### 6.3 Per-house visual variation (Step 4 approved)

Every house is a distinct single-floor residential environment, with the **same logical world, isometric camera, open-doorway entry and roof system**. See `BUILDING_INTERIOR_SPEC.md` for the binding gameplay and asset requirements.

| House | Exterior mood | Interior mood | Gameplay role |
|---|---|---|---|
| `house_a` Starter | Weathered beige siding, warm-brown roof, simplest porch | Airy living area, compact kitchen/bedroom, sparse props | Starting survivor spawns **inside**, roof initially hidden; basic accessible loot/bat |
| `house_b` Supply | Desaturated gray siding, slate roof, recognizable approach | More furnished kitchen/living areas and clear cupboard/drawer spots | Greater scavenging opportunities |
| `house_c` Risk | Weathered rust-red/dark siding, patched roof, overgrowth | Clutter and scuffed floors without blocking traversal | More tension from **standard** zombies and comparatively rewarding loot |

Distinguish the three using siding/roof hue, porch/fence geometry, room organization, furniture density, and careful wear; **do not** require custom gameplay engines per house.

### 6.4 Seamless building entry and roof cutaway (Step 4 approved)

- No loading screen, teleport, top-down interior mode or scene switch: the player **walks into the open threshold** and remains on the same world/grid and camera.
- `E` is **not** required to enter; it is reserved for nearby contextual interaction and loot search.
- Each house owns an `interiorZone` and a `roofGroup`; player occupancy controls the **occupied house's** roof fade/hide, not the roof of the entire map.
- Selectively fade near-facing walls only when they obscure the player, preserving outlines, collision and room readability.
- Roof/wall visibility changes are **rendering only**: they must not alter collision, AI line of sight, or pathfinding.
- House A roof is already hidden when **New Game begins inside House A**. Recompute roof state from player position on load/restart.
- Avoid flicker when the player traverses an entrance; use a robust zone edge/tolerance or debounce.
- Zombies can traverse reachable doorways according to existing standard FSM/A* rules; never add special indoor zombie types.

### 6.5 Indoor art kit and static lighting

- Materials: weathered wood flooring, restrained tile in kitchen/washroom, aged painted siding/trim, dark furniture woods, muted domestic upholstery.
- Readable domestic assets: sofa, simple bed, table, bookshelf, refrigerator, cabinetry, drawer/dresser, lamps as static decor.
- Only explicitly authored **Cabinet, Drawer, Supply Box** instances are lootable; visual household props and outdoor mailboxes/vehicles are not extra containers.
- The MVP retains **fixed daytime**. Illustrated warm indoor light accents are acceptable, but dynamic day/night, weather, powered-lamp simulation and room fog-of-war remain post-MVP.
- Preserve negative space around walking routes and targets, especially doorways and interaction anchors.


## 7. Character and zombie visual language

### 7.1 Player

- **Two approved survivor silhouettes:** `survivor_male` with worn olive jacket, and `survivor_female` with faded rust-burgundy jacket; both carry practical brown backpacks and wear dark pants and boots.
- Both are MVP defaults selectable at the start of a new run, share identical gameplay mechanics and collision, and have equivalent animation fidelity. See `PLAYER_CHARACTER_SPEC.md`.
- Practical clothing in subdued, slightly contrasting tones; avoid bright hero colors.
- Character feet/ground anchor must be stable across idle, walk, sprint, attack, and death frames.
- Keep critical actions readable from the game's intended camera scale.
- Show both survivors unarmed at fresh-run spawn. Show the bat in hand only after the player equips it.

### 7.2 Zombie

- **Approved visual set:** five cosmetic looks — `zombie_civilian`, `zombie_worker`, `zombie_hoodie`, `zombie_female`, `zombie_bloody` — built on **one standard gameplay archetype**. See `ZOMBIE_CHARACTER_SPEC.md`.
- Include recognizable male and female civilian silhouettes. No gender-based stat or mechanic differences.
- Lean or unsteady, naturally weighted posture visibly distinct from both survivor characters; vary timing slightly to prevent synchronized robotic motion.
- Worn ordinary clothing, muted decay, restrained blood and dark wounds; portrait detail must not compromise readable gameplay silhouettes.
- Concept-board labels implying High HP, Fast or Aggressive variants are **not** implemented in MVP. All five looks share identical base HP, speed, detection, damage, cooldown and AI states.
- Zombie chase is a standard AI state and may reuse walking/shambling sprite cycles; special running zombies are future-only.
- Dead-state silhouette must clearly stop communicating threat.

### 7.3 Scale and anchor specification

- Choose and record **one** base character scale after the first playable map test. Proposed target: standing character approximately 1.5–2.5 ground-tile heights in on-screen visual height, depending on intended pixel-art resolution; test rather than blindly adopt.
- Use a consistent bottom-center/feet anchor for actors.
- All directional frames for an actor should share consistent sprite canvas/anchor rules to avoid jumpy movement.
- Shadows should be subtle ground-contact indicators, not oversized blobs.

## 8. Animation requirements

| Subject | Required MVP states | Notes |
|---|---|---|
| Both player survivors | Idle, walk, sprint, melee bat attack, death | Locomotion follows actual movement. A confirmed bite gives a brief reaction. |
| Zombie | Idle, wander/walk, chase/walk, attack, death | Chase can reuse movement frames. Give the bite a clear anticipation silhouette and recovery. |
| Loot and inventory | Transfer, Equip and Use feedback | Highlight the receiving slot, show an equipped mark and show the stat changed by Use. |
| Combat | Bat swing and confirmed damage cues | Use a short swing sound for hits and misses. A confirmed hit adds distinct impact audio and a visual cue on the damaged zombie. |
| World | Basic roof visibility transition | No weather or day/night animation |

### Directional rules

- Support eight gameplay movement directions; draw actual sprite sets at the minimum directional fidelity that looks convincing in isometric projection.
- If using fewer authored directions and mirroring, ensure weapons/attack arcs and handedness remain coherent.
- Avoid timing-dependent collision: attack detection and gameplay state should be controlled in code, coordinated with visuals.
- Keep actor animation FPS and movement speeds in centralized configuration for tuning.

### VFX

- Hits: short readable contact cue and brief feedback without continuous screen shake.
- Damage: localized flash/tint and optional subtle HUD pulse.
- Loot: selected container/row highlight or brief pickup cue.
- Death: clear final state, then Game Over transition.
- Do not use constant glowing outlines around all interactables.

## 9. Item icon art (MVP only)

| Item | Readable icon signature | State/action |
|---|---|---|
| Baseball Bat | Long wooden bat with clear grip/barrel shape | Equip/Equipped/Drop |
| Canned Food | Tin with muted label contrast | Use to reduce hunger severity |
| Water Bottle | Simple translucent blue/gray bottle | Use to reduce thirst severity |
| Bandage | Folded white/cream wrap with subtle red cross/cue | Use to heal |

- Export on transparent backgrounds; do not bake the inventory slot/background into the icon.
- All icons should share a consistent visual bounding box and line/detail density.
- All item icons remain legible at standard slot size.
- No ammo, crafting resources, guns, or durability icons in MVP exports unless merely archived for future work outside the production bundle.

## 10. Interface/world visual integration

- React overlays use **the approved UI design tokens** and fonts; sprite artwork uses the world palette.
- World artwork should remain visible around compact HUD overlays.
- The warning/highlight palette can draw attention to a selected item or active prompt; use sparingly.
- Menu backgrounds can reuse original neighborhood scenery with dimming, but must preserve text contrast.
- The Game Over screen can use darkened art and rusty red display typography, not extreme gore.
- Keep fixed UI screen-space positioning separate from the scrolling/zooming Phaser world.

## 11. Map production workflow (Tiled → Phaser)

1. Establish tile size, grid geometry, and camera zoom with a minimal proof-of-concept map.
2. Build one repeatable outdoor terrain tileset, then place the single neighborhood map.
3. Author dedicated logical layers/objects for walkability, obstacles, house interior zones, and loot containers.
4. Add three **single-story** house layouts into the same world map, with open walkable thresholds, an `interiorZone`, a `roofGroup` and selectively fadeable upper-wall sections per house.
5. Export Tiled map/tilesets in the format supported by the Phaser integration, keeping object identifiers stable.
6. Verify map rendering, collision boundaries, player feet-based depth, and zombie navigation before adding environmental polish.

### Suggested visual/logical layer names

```text
Ground
GroundDetails
RoadDetails
BelowActors
BuildingsBase
InteriorFurniture
CollisionObjects (logical)
NavigationObstacles (logical)
InteriorZones (logical)
InteractionPoints (logical)
Actors (runtime)
AboveActors
Roofs (conditional visibility)
ForegroundOccluders
```

These names may be adapted to the chosen renderer; the intent is **separate collision data from decorative graphics**. Avoid trying to use image-alpha edges as the collision system.

## 12. Asset organization and naming

```text
public/assets/
├── maps/
│   ├── neighborhood-v1.json
│   └── tilesets/
├── sprites/
│   ├── player/
│   ├── zombies/
│   ├── props/
│   └── items/
├── ui/
│   ├── backgrounds/
│   └── icons/
└── audio/
    ├── ambience/
    └── sfx/
```

**Naming pattern:** `category_subject_action_direction_variant.ext`, for example:

- `survivor_male_walk_ne.png` and `survivor_female_walk_ne.png`
- `zombie_basic_attack_sw.png`
- `item_baseball-bat_icon.png`
- `environment_house_a_roof.png`
- `ui_menu_neighborhood-bg.png`

Prefer texture atlases/spritesheets where that improves rendering and load times. Record atlas frame names and animation keys in a central manifest. Avoid duplicate source-of-truth assets with different filenames.

### Asset manifest record (suggested)

Track each production asset's ID, purpose, source/creator, license, dimensions, frame layout, anchor, animation key, and related collision/interaction data. This is especially important when using third-party asset packs.

## 13. Production and licensing guardrails

- Create original characters, maps, branding, and iconography.
- Use only self-made or explicitly licensed third-party assets; preserve attribution when required.
- Do not extract/reuse proprietary Project Zomboid sprites, sounds, screenshots, logos, or maps as shipping content.
- Design-board mockups are for direction, **not** ready-to-ship game sprites or level geometry.
- Optimize images/audio for browser loading; avoid huge uncompressed sheets and unnecessary effects.

## 14. Post-MVP visual backlog (not to design into MVP screens)

- Dynamic day/night and shadow changes.
- Weather (rain, fog, storms) and seasonal palettes.
- Detailed wounds, bleeding, infection, disease cues.
- Additional weapons including firearms, ammunition and durability UI.
- Crafting stations, buildable structures, material icons.
- New neighborhoods, forests, shops, hospitals, multi-story buildings.
- Vehicles, driving UI, garage/repair props.
- Character customization, skills, equipment layers.
- NPCs, factions, richer animations.
- Optional online/profile/cloud-save UIs.

Any such expansion needs a separate PRD scope decision and matching UI-system update before implementation.

## 15. Art review and acceptance criteria

### First vertical slice

- [ ] Isometric 2:1 projection and tile footprint validated in Phaser.
- [ ] One outdoor area feels readable without polished assets.
- [ ] **Both player characters** have equal gameplay/collision, consistent scale, foot anchors and natural movement animations.
- [ ] One zombie can move/attack without visual ambiguity.
- [ ] Near/far actor/prop ordering is consistent.

### MVP world completion

- [ ] One visually coherent neighborhood and exactly three enterable houses.
- [ ] Roof/foreground hiding reveals indoor player visibility.
- [ ] Street, yard, tree, house and interior art share consistent scale/lighting.
- [ ] Male and female players and zombies can each be distinguished from the scenery at normal zoom.
- [ ] All four item icons are readable and represent actual MVP items.
- [ ] Only active MVP systems appear in menus, scenes, and visual feedback.
- [ ] No unsupported day/night, crafting, firearm, vehicle, or durability systems shown as playable.
- [ ] UI and world visuals harmonize without excessive saturation or visual clutter.
- [ ] Asset sources and licenses are recorded before shipping.

## 16. Implementation handoff checklist for Codex

- Define or confirm tile/sprite scale using an in-engine test, **not** the design-board pixels.
- Build map collision/navigation data independently from art layers.
- Keep actor bottom-center anchors consistent; sort visually by feet/ground position.
- Keep interactive zones explicit, including containers and indoor occlusion regions.
- Start with small placeholder assets, verify gameplay, then replace systematically with production sprites.
- Use `DESIGN_SYSTEM.md` for all React UI patterns and tokens.
- Keep advanced visual systems behind post-MVP scope until separately approved.
