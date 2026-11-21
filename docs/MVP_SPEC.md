# Dead County MVP specification

Based on the approved Dead County PRD and its domain specs, glossary and architecture decisions.

## Problem Statement

A desktop player wants to start a tense survival run in their browser, figure out where to scavenge, and decide when to fight, hide or retreat. They need readable controls, threats and consequences. When they pause or leave, they need confidence that Continue will restore the encounter and supplies as they left them.

## Solution

Build an original single-player isometric survival game in one authored neighborhood with 21 enterable buildings. Let the player choose either of two mechanically identical survivors, find and equip a bat, move quietly past zombies, scavenge within a carry limit, and use doors and wedges to buy time to retreat. Ship with a keyboard-and-mouse interface, one local save slot and a death-and-restart flow.

## User Stories

1. As a player, I want to start in a desktop browser, so that I can play without setting up an account.
2. As a new player, I want the Controls screen to explain movement, aiming, attacking and interaction, so that I can learn the inputs before starting.
3. As a player, I want to choose either survivor with the same starting conditions and abilities, so that my visual choice does not change the difficulty.
4. As a player with an unfinished run, I want confirmation before starting a replacement, so that I can cancel and keep my progress.
5. As a new survivor, I want a readable, walkable route to the bat and water in House A, so that I can learn to loot and equip before I have to fight.
6. As a player, I want WASD to follow the screen with consistent diagonal speed, so that I can navigate narrow spaces predictably.
7. As a fleeing survivor, I want sprinting to open a gap at a Stamina cost, so that I can choose when to spend it to reach cover.
8. As an exhausted survivor, I want to re-engage sprint with a fresh Shift press, so that recovering Stamina does not cause unintended bursts of speed.
9. As a player, I want movement animation to reflect actual movement, so that I can see when collision stops me or exhaustion slows me to a walk.
10. As an explorer, I want to walk through open doorways with the roof clearing as I enter, so that indoor and outdoor play feel continuous.
11. As a returning survivor, I want zombies to enter House A through real doorways under ordinary rules, so that an initially safe room can become dangerous over time.
12. As a new explorer, I want to recognize House B by its siding and porch from the first junction, so that I can find a plausible route before opening the map.
13. As a scavenger, I want a short exposed route and a longer route with solid cover, so that I can trade time for a chance to break line of sight.
14. As a cautious survivor, I want to be able to reach House B by the detour and collect the guaranteed can before critical needs damage Health, so that a careful first outing works at walking pace.
15. As a scavenger in House B, I want to recognize the kitchen route and find the can through ordinary searching, so that I can make a quick visit when I find an opening.
16. As a survivor low on supplies, I want House C to contain reachable food and water, so that taking a riskier route has a known benefit.
17. As a player, I want the game to show one contextual action by the relevant object, so that I know whether E will search a container or pick up a dropped item.
18. As a player looting a container, I want to transfer a single item into the first available slot and see that slot highlighted, so that I know what moved and where it went.
19. As a player with a full inventory, I want a failed transfer to leave the item where it was, so that I can return after making room.
20. As a player carrying a bat, I want to equip it explicitly and see which slot holds the equipped weapon, so that I know whether I can attack.
21. As a player dropping an item, I want it placed within reach or kept in its original slot with a clear error, so that blocked terrain cannot make it disappear.
22. As a player using a consumable, I want to see the resulting stat and have Use disabled when it would have no benefit, so that I understand what I spent and gained.
23. As an armed survivor, I want the swing to commit to the aim direction I clicked, so that moving the mouse afterward cannot redirect the hit.
24. As a survivor facing multiple zombies, I want a swing to select one eligible target consistently, so that close encounters reward careful aim.
25. As a player with audio muted, I want to see which zombie took a hit, so that I can distinguish contact from a miss.
26. As a survivor watching a zombie, I want to see the bite wind-up and recovery at normal zoom, so that I have a chance to time a step away.
27. As a survivor hiding behind a wall, I want the zombie to pursue its last known position and rely on ordinary perception to find me again, so that breaking sight creates a real escape opportunity.
28. As a survivor who lured a zombie away, I want it to wander from the point where pursuit expires, so that moving it away can change a later visit.
29. As a survivor managing Health, Stamina, Hunger and Thirst, I want a readable HUD that distinguishes a bite from critical need damage, so that I know whether to fight, escape, eat or drink.
30. As an injured survivor, I want a Bandage to restore lost Health through explicit Use, so that healing depends on supplies I chose to carry.
31. As a player orienting indoors or outdoors, I want a fixed north-up minimap and a full neighborhood map, so that I can plan my route from recognizable geography.
32. As a player opening a world-blocking panel, I want movement, threats, needs and survival time to freeze, so that I can inspect items or the map safely.
33. As a player returning to a hidden tab, I want my previous panel restored and a deliberate Resume before play advances, so that switching tabs cannot spend survival time.
34. As a player closing a panel or continuing a run, I want held keys and UI clicks to leave the survivor’s movement and new attacks inactive until fresh input, so that I keep control when play returns.
35. As a player saving a run, I want success reported after the write commits and Save & Exit to leave only after that success, so that I can trust Continue.
36. As a returning player, I want Continue to preserve the survivor, position, equipment, loot depletion, dropped items and elapsed duration, so that my earlier decisions still matter.
37. As a player who saves mid-encounter, I want the committed attack phase, last sighting, pursuit grace period, wander destination and idle wait to survive loading, so that the same encounter continues.
38. As a player opening two tabs, I want only the run owner to play and write, so that a stale tab cannot overwrite my active save.
39. As a player whose save revision changed, I want a clear conflict message and an explicit choice to reload the latest save, so that I understand when I will lose unsaved progress.
40. As a player whose storage read failed, I want a read-only retry and the current frozen run preserved, so that a temporary error cannot erase a save.
41. As a player with a newer save-schema version, I want a compatibility message and the record preserved, so that I can reopen it in a compatible build.
42. As a player with a confirmed damaged save, I want to authorize replacing that specific record only when a new run is ready, so that recovery cannot overwrite a changed record.
43. As a player whose survivor dies, I want a frozen final survival duration and clear New Run and Main Menu actions, so that I can see how long I lasted and start over.

## Implementation Decisions

- **Build order.** Start with the agreed one-block Phaser slice. Use one survivor facing and walk cycle, one collision-valid doorway, one loot container and one standard zombie to verify scale, movement and doorway behavior. Expand through foundation, zombie combat, inventory and loot, survival, then save and release milestones. The shipping MVP includes both survivors, three single-floor houses and 10–20 zombies with five cosmetic appearances.
- **Runtime ownership.** Use Phaser 4 for simulation, animation, world collision and navigation, with React and Tailwind for menus, HUD, focus and presentation. Connect them through typed player commands and game state updates. Use TypeScript, Vite, Tiled, IndexedDB through Dexie and static Vercel deployment.
- **World and movement.** Use one authored map and shared logical walkability for movement and zombie routing. Keep camera and world continuous across house entrances. Derive roof and relevant wall visibility from occupancy before showing a restored position. Convert screen-relative WASD to logical movement and normalize total speed there. Chase speed sits just above walking speed and below sprint speed. Exhaustion ends the current sprint request.
- **Fresh run and loot.** Start both survivors with Health and Stamina at 100, Hunger and Thirst at 0, 12 empty slots and no weapon equipped. Use one authored set of zombie positions, wander destinations and container stock. House A’s starter container has exactly one Baseball Bat and at least one Water Bottle. House B’s designated kitchen container has at least one Canned Food. House C has obtainable food and water. Use optional stock from the existing four item types and fixed test seeds for ongoing randomness where used.
- **Scavenging and survival.** Select one reachable interaction target. Choose the nearer candidate, favor a dropped item in a mixed tie, then use stable IDs for ties within the same kind. Preserve item identity and slot positions. Validate and place a drop before clearing inventory or equipment, then publish the move atomically. Food and water relieve their respective needs. An eligible Bandage Use is the only source of Health recovery and consumes exactly one instance. Critical needs can be lethal. When both are critical, use the higher damage rate and show both warnings. Tune against the first House A–House B detour at cautious walking pace.
- **Zombie behavior.** Use the standard local state machine and obstacle-aware pathfinding for all appearances. A zombie can wander or chase through the same open doorways. Range and line of sight establish a sighting. On loss, hold the last known position and spend pursuit grace only during active simulation. Reacquisition updates pursuit. Expiry starts local wandering at the zombie’s current position. Route failure respects collision and bounded retries.
- **Combat and effects.** Left Click in the world with the bat equipped commits aim in world space. Resolve contact using the actors’ current positions, valid arc, reach and obstacles. A swing can hit at most once, ordered by smallest angle, then distance, then stable zombie ID. Swings cost no Stamina and allow slow steps through recovery. Nonlethal damage leaves committed attacks in progress, and separate valid zombie bites can each deal damage. Use the same swing animation and sound on hits and misses, with distinct audio and a target cue for confirmed damage. Give bites a visible wind-up, contact and recovery. Present animation and feedback from gameplay state.
- **Pause, input and map.** Track pause reasons independently and require explicit Resume after tab hiding. Restore the foreground panel first. Clear world movement input when gameplay blocks and require fresh, non-repeated presses on return or Continue. Keep attack recovery intact. Intercept overlay pointer gestures through release. Provide the four-stat HUD, elapsed duration, equipped state, one interaction prompt, a circular north-up minimap and a blocking full map. Keep zombie and loot locations off the maps.
- **Continue and timing.** Take a consistent paused snapshot with stable item and actor identities, map and save-schema versions, stats, loot and active time. Save attack phase, hit outcome, remaining recovery and locked swing direction. Save zombie pursuit state, last known position, remaining grace, wander destination including absence, remaining idle time and any random state needed to reproduce ongoing behavior. Rebuild routes and visual state from logical data. Time outside active play adds zero simulation time and route reconstruction uses zero random draws.
- **Local save ownership.** Keep one active save slot with an exclusive run owner, acquisition token and independent save revision. Holding a pause or hiding the tab retains ownership. A blocked tab waits for explicit Continue before attempting acquisition. The winner reads the latest committed record. Validate ownership and expected revision in the same transaction as every gameplay write, including overwrite, retry and death invalidation.
- **Save recovery.** Keep revision conflicts frozen and offer an explicit reload with the unsaved-progress warning. An ownership failure returns to the blocked menu. A transient write failure can retry through the same guards. A read error is retryable as a read and leaves data intact. Check the save-schema version ahead of payload validation and preserve unsupported data. Offer confirmed damaged-save replacement only for a successfully read malformed record. Recheck ownership and the original revision or exact stored value in the committing transaction after the replacement run is ready.
- **Run lifecycle.** Preserve an existing run through survivor selection and Cancel. Ask for confirmation once at the start-and-replace step for a verified unfinished run. On death, freeze gameplay and the survival duration, invalidate Continue for that run, and offer New Run or Main Menu.

## Testing Decisions

- **Primary seam for review.** Test through the desktop browser’s public controls and screens. Exercise the full journey from choosing a survivor through House A, a supply run to B, saving and continuing, death, and a fresh run. Assert visible behavior and preserved state through ordinary player actions.
- **Focused simulation seam for review.** Where timing and position need exact comparison, drive the game coordinator with authored state, a test seed and matched inputs and steps. Compare Pause → Resume against Save & Exit → Continue for attack contact and recovery, pursuit expiry and reacquisition, and wandering and idle waits. Match the transition step and use the documented provisional position tolerance. Test collision and target ordering, including ties.
- **Focused storage checks for review.** Drive the repository through its public operations in browser-backed IndexedDB, including two real tab contexts. Check races to acquire, stale owners and revisions, conflict reload, rejected retries, read failures, newer schemas, failed initialization and a changed or unreadable revision on damaged-save replacement. Verify the committed record after each outcome.
- **Playtest what automation cannot judge.** At default zoom, let newcomers find and equip the bat, recognize B from the first junction, walk the detour before need damage, locate B’s kitchen and leave under a viable ordinary encounter. Compare direct and detour trade-offs. Check bite anticipation, the hit cue with audio muted, and motion changes at a wall or exhaustion. Test with 20 active zombies on the target desktop viewport and smoke-test supported browsers.
- **Prior art.** Use the approved PRD acceptance cases, the zombie resume comparisons and the pause and save ADR scenarios. This workspace contains design material. The first coding slice will establish executable tests.

## Out of Scope

Multiplayer, accounts, cloud saves, server-side gameplay, procedural neighborhoods, additional playable buildings, functional doors and locks, firearms, crafting, base building, vehicles, specialized zombies, day/night cycles, weather, and expanded inventory or character systems are outside this MVP.

## Further Notes

The approved product rules are detailed enough to begin the first coding slice. Treat exact geometry, tile and sprite scale, camera zoom, movement and survival rates, bite and swing timing, optional loot quantities and final sound assets as implementation and playtest decisions. Final screen polish, production art and deployment belong to the release milestones. Keep the master PRD and domain specs as the authority for detailed acceptance criteria.
