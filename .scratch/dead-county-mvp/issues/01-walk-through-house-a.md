# 01: Walk through House A

**What to build:** Start in a small playable Phaser block and walk between House A and the street through a real doorway. Use this slice to establish the isometric camera, sprite scale and collision.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

## Acceptance criteria

- [ ] The desktop browser build opens a one-block Tiled scene with one survivor walk cycle and a reachable indoor spawn. Character feet anchor to the walkable ground.
- [ ] WASD projects up, left, down and right on screen. Cardinal and diagonal movement share one logical-world speed. Collision stops movement at walls and solid props.
- [ ] Walk into and out of House A through the same threshold in one continuous scene. Roof and nearby occlusion respond to occupancy while the camera and world remain continuous.
- [ ] Compare the in-engine view with the building and survivor references at gameplay zoom. Validate tile scale, floor contact and doorway clearance before expanding the map or atlases.

## Design and references

- Written sources. [MAP_DESIGN_SPEC](../../../docs/MAP_DESIGN_SPEC.md) · [BUILDING_INTERIOR_SPEC](../../../docs/BUILDING_INTERIOR_SPEC.md) · [PLAYER_CHARACTER_SPEC](../../../docs/PLAYER_CHARACTER_SPEC.md) · [ART_DIRECTION](../../../docs/ART_DIRECTION.md)
- Visual references. [approved-buildings-interiors-concept](../../../references/approved-buildings-interiors-concept.png) · [Dead County_ Building Entry Gameplay-1](../../../references/Dead%20County_%20Building%20Entry%20Gameplay-1.png) · [Dead County_ MVP Survivor Character Pair](../../../references/Dead%20County_%20MVP%20Survivor%20Character%20Pair.png)

