# Dead County

Dead County is an original single-player desktop browser survival game. Build the isometric MVP defined in the [master PRD](docs/PRD.md) using the [MVP specification](docs/MVP_SPEC.md) and the approved tickets.

## Work a ticket

1. Open the requested ticket in [.scratch/dead-county-mvp/issues](.scratch/dead-county-mvp/issues). For open-ended implementation requests, choose a ticket whose blockers are complete. [Ticket 01](.scratch/dead-county-mvp/issues/01-walk-through-house-a.md) starts the project.
2. Read the relevant PRD requirements, [glossary](GLOSSARY.md), and the design specs and images named in the ticket. The master PRD governs product behavior and scope. The written design specs define presentation and interactions. Use the reference images for composition, style and visual intent. Build artwork and controls as separate usable elements.
3. Implement the player-visible slice through its normal entry point. Use the planned Phaser, TypeScript, React, Tailwind, Vite, Tiled and Dexie stack where the ticket needs it. Phaser owns authoritative simulation and React renders it through typed commands and state. Keep interim art proportional to the slice. Validate the one-block prototype in-engine before expanding the map or producing full atlases.
4. Verify every acceptance criterion that the slice can exercise. Use the desktop browser flow first, then focused simulation or IndexedDB checks for repeatable edge cases. For visual work, compare at the default gameplay zoom or the documented screen viewport. Report checks run and any criteria that still need a playtest or later integration.

## Read when the task touches

| Area | Sources |
| --- | --- |
| UI layout, typography, tokens or controls | [Design System](docs/DESIGN_SYSTEM.md) and the ticket’s screen spec and visual reference |
| Map, scale, sprites or effects | [Art Direction](docs/ART_DIRECTION.md), [Map Design](docs/MAP_DESIGN_SPEC.md) and [Building Interiors](docs/BUILDING_INTERIOR_SPEC.md) |
| Survivor movement, animation or melee | [Player Character](docs/PLAYER_CHARACTER_SPEC.md) and [attack timing ADR](docs/adr/0001-preserve-attack-timing.md) |
| Zombie AI, pursuit or presentation | [Zombie Character](docs/ZOMBIE_CHARACTER_SPEC.md) |
| Inventory, item actions or containers | [Inventory UI](docs/INVENTORY_UI_SPEC.md), [Loot Search UI](docs/LOOT_SEARCH_UI_SPEC.md) and [Gameplay HUD](docs/GAMEPLAY_HUD_SPEC.md) |
| Pause, overlays, focus or time | [Pause Menu](docs/PAUSE_MENU_SPEC.md) and [independent pause reasons ADR](docs/adr/0002-independent-pause-reasons.md) |
| Save, Continue, replacement or death | [Save requirements](docs/PRD.md#11-functional-requirements--saveload-and-future-migration-p0), [ownership and revision ADR](docs/adr/0003-exclusive-local-run-and-save-revisions.md), [damaged save ADR](docs/adr/0004-confirmed-damaged-save-replacement.md), [Confirmation Dialog](docs/CONFIRMATION_DIALOG_SPEC.md) and [Game Over](docs/GAME_OVER_SPEC.md) |

Use the PRD’s acceptance criteria for required outcomes and its open parameters for tuning. Preserve established behavior across slices, especially the active simulation clock, item identity and save ownership.

## Code review

1. Identify the base ref and the ticket or PRD requirements under review. Review the actual diff from the merge base and read the relevant design specs and ADRs.
2. Check the spec and implementation standards separately. Trace each changed player flow through its normal entry point, including failure and retry. Check regressions in callers and adjacent flows. For visuals, compare the running build with the linked reference at the specified viewport or zoom.
3. Apply the [security review checklist](SECURITY.md) to changes that touch a trust boundary. Run the build and the relevant behavior checks. Distinguish results you observed from gaps that still need verification.
4. Report actionable findings first, ordered by severity within each review area. Include the file and line, the triggering condition, the player or data impact, and the violated requirement or check. Record the base ref and checks run. If there are no findings, state that and call out any untested behavior.
