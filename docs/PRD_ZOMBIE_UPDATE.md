# Dead County — PRD v1.1 Zombie Visual Approval Amendment

> **Date:** 2026-11-17 · **Status:** Approved visual direction, proposed PRD integration  
> The canonical `PRD.md` has **not** been directly edited by this patch.

## MVP decision

- One **standard zombie gameplay archetype** with rule-based FSM + basic A* pathfinding; no LLM.
- Support **10–20 active zombies** within the neighborhood as already defined in the PRD.
- Approved appearance-only variants: `zombie_civilian`, `zombie_worker`, `zombie_hoodie`, `zombie_female`, `zombie_bloody`.
- Include recognizable male and female civilian zombie visuals.
- **No gameplay-stat variation between appearance IDs:** same baseline HP, detection, movement, attack reach/damage, cooldown, collision and AI transitions.
- Required visual states: idle, walk/wander (also used for chase), attack and death. Hurt feedback is optional polish. Eight-direction facing should be credible at game zoom.
- Reuse shared animation rigs, assets and logic where appropriate to keep MVP art production reasonable.

## Requirements to add or clarify

- **FR-Z12:** Each spawned zombie shall have a stable cosmetic appearance ID from the supported list.
- **FR-Z13:** Cosmetic appearance shall not alter any combat, AI, navigation or collision values.
- **FR-Z14:** The zombie character art shall include both male and female civilian silhouettes and match the approved grounded isometric art direction.
- **FR-SAVE12:** The run save shall preserve zombie appearance IDs and living/dead state across load.
- **FR-Z15:** Zombie attack, movement and death animations shall be visually clear at gameplay zoom; chase can reuse standard locomotion frames.

## Non-goals unchanged

Special enemy classes, increased speed/HP for particular outfits, zombie infection, noise/hearing systems, hordes and advanced AI remain **post-MVP**. Concept-board text that says "High HP," "Fast," or "Aggressive" is *visual exploration only* and **not an implemented gameplay requirement**.

**Detailed source:** `ZOMBIE_CHARACTER_SPEC.md`.
