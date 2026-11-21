# Dead County

Dead County is an original single-player isometric survival game for desktop browsers. Choose a survivor, scavenge an abandoned neighborhood, and stay alive as supplies run low and zombies follow you through open doors.

[Play Dead County](https://dead-county-eight.vercel.app/)

## Run locally

Install Node.js 22.12 or later. Run these commands from the project directory.

```sh
npm ci
npm run dev
```

Open the local address printed by Vite. Use a desktop browser with a keyboard and mouse.

## Your first run

Both survivors start unarmed in House A. Search the starter cabinet for a Baseball Bat and Water Bottle. Transfer the bat, then click it in the gameplay strip to equip it or choose **Equip** in Inventory. Click a consumable in the strip to open its details and choose whether to use it.

Drag loot into Inventory to fill the first open slot, or choose **Transfer**. Drag carried items between slots to move or swap them, or choose **Move** and select a destination. Drag an item onto **Drop** to place it on the ground.

House B has gray siding, a columned porch, and Canned Food in its kitchen cabinet. The street crossing is quicker, while the detour offers cover that can break line of sight. House C has food and water and draws more zombie activity. Hunger and Thirst rise during active play. Bandages restore lost Health, and a run ends when Health reaches zero.

Follow the avenue east into six connected blocks. The Corner Store, Birch Clinic and Cedar Workshop have different supplies. Sprinting and swinging can draw nearby zombies toward the sound. Use **E** at an indicated door or window to open or close it. Bandages stop bleeding after a bite. The game clock advances during play, so the neighborhood gets darker as night approaches.

Walls and closed doors hide zombies and muffle their sounds. Listen for footsteps and groans from either side, and hold **C** to make a quieter approach. If a zombie saw you enter a building, it can follow your last known position and force the door. The living-room cabinet in House B holds a Canvas Backpack and a Door Wedge. Equip the pack in Inventory to raise your carry limit from 5 kg to 9 kg. Use the wedge from Inventory while standing inside beside a closed door to buy time against pursuit.

## Controls

| Input | Action |
| --- | --- |
| `W`, `A`, `S`, `D` | Walk in screen-relative directions |
| `Shift` + movement | Sprint while Stamina permits |
| Hold `C` + movement | Sneak with a lower profile and quieter steps |
| Mouse movement | Face toward the pointer over the game world |
| Hold right mouse button | Keep aim on a point while taking slower steps |
| Left click | Swing the equipped bat in the pointed direction |
| `Space` | Spend Stamina to shove one nearby zombie in the faced direction |
| `E` | Search, pick up an item, or open or close an indicated passage |
| `I` | Toggle Inventory |
| `M` or click the minimap | Open the neighborhood map |
| `Esc` | Close the current panel or open Pause |

After exhaustion, release and press `Shift` again to sprint once Stamina has recovered. When you return to the game after switching tabs, choose **Resume** and press a movement key again.

## Save and continue

Open Pause and choose **Save Game** to commit progress and stay paused. **Save & Exit** returns to the Main Menu after the save commits. **Continue** loads the latest committed run from IndexedDB in the same browser profile.

Only one tab can play the local run at a time. If another tab has it open, let that tab release the run, then select **Continue** yourself. Closing a tab unexpectedly keeps the latest committed save. A survivor's death ends that run and removes it from Continue.

## Check and build

```sh
npm test
npm run build
npm run preview
```

The production build is written to `dist/`. The tests cover gameplay simulation and the rules behind the visible controls.

## GitHub Actions and Vercel

The CI and Vercel workflow runs `npm ci`, tests, and the production build for pushes and pull requests. A successful `main` build publishes the compiled static files to the existing `dead-county` Vercel project. Add a project-scoped Vercel credential as the `VERCEL_TOKEN` secret in the GitHub `production` environment. `VERCEL_SCOPE` selects the project’s Vercel team.

## Project docs

- [Product requirements](docs/PRD.md) and [MVP specification](docs/MVP_SPEC.md)
- [Design system](docs/DESIGN_SYSTEM.md) and [art direction](docs/ART_DIRECTION.md)
- [Contributor and code review guide](AGENTS.md) and [security review guide](SECURITY.md)
