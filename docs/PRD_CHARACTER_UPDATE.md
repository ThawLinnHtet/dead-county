# Dead County — PRD v1.1 Player Character Amendment

> Add this approved change to the canonical `PRD.md`. The original PRD in the conversation has not been directly edited.

## Scope update

- **MVP:** Exactly **two playable default characters**, Male Survivor (`survivor_male`) and Female Survivor (`survivor_female`). Both are equal starting options with the same gameplay stats, collision, combat, movement, inventory and interactions.
- **MVP:** `New Game → Choose Survivor → Start Run`. Character portraits, full-body previews and a selected state are required.
- **MVP:** Persist and validate `characterId` in the IndexedDB `GameSave`. `Continue` restores it.
- **MVP:** Both characters have equal animation coverage: idle, walk, sprint, melee bat attack and death; short hurt feedback is optional polish.
- **Post-MVP only:** Character creator, outfits, customization, skill/trait choices, additional avatars and gear cosmetics.

## Requirement additions

- **FR-P10:** The player shall select either Male Survivor or Female Survivor before starting a new run.
- **FR-P11:** Both survivors shall have identical player stats and gameplay systems.
- **FR-UI07:** The React UI shall present a two-option Choose Survivor screen with accessible keyboard selection and equal visual prominence.
- **FR-G08:** New Run begins with the selected character; Continue restores the saved character.
- **FR-SAVE11:** The save schema shall persist and validate the selected `characterId`.

## Acceptance

- Male and Female survivors can each start, move, sprint, fight, loot, save, continue, die and restart.
- Gameplay mechanics and effective hitbox are identical for both.
- Saving and loading never silently swaps characters.
- No additional gameplay systems are implied by visual concept equipment.

**Full visual and implementation spec:** `PLAYER_CHARACTER_SPEC.md`.
