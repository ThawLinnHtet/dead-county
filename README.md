# Dead County

Dead County is an original single-player isometric survival game for desktop browsers. Choose a survivor, scavenge an abandoned neighborhood, and stay alive as supplies run low and zombies follow you through open doors.

## Run locally

Install Node.js 22.12 or later. Run these commands from the project directory.

```sh
npm ci
npm run dev
```

Open the local address printed by Vite. Use a desktop browser with a keyboard and mouse.

## Your first run

Both survivors start unarmed in House A. Search the starter cabinet for a Baseball Bat and Water Bottle. Transfer the bat to Inventory, then choose **Equip** to use it.

House B has gray siding, a columned porch, and Canned Food in its kitchen cabinet. The street crossing is quicker, while the detour offers cover that can break line of sight. House C has food and water and draws more zombie activity. Hunger and Thirst rise during active play. Bandages restore lost Health, and a run ends when Health reaches zero.

## Controls

| Input | Action |
| --- | --- |
| `W`, `A`, `S`, `D` | Walk in screen-relative directions |
| `Shift` + movement | Sprint while Stamina permits |
| Mouse + left click | Aim and swing the equipped bat in the game world |
| `E` | Search the indicated container or pick up the indicated item |
| `I` | Toggle Inventory |
| `M` or click the minimap | Open the neighborhood map |
| `Esc` | Close the current panel or open Pause |

After exhaustion, release and press `Shift` again to sprint once Stamina has recovered. When you return to the game after switching tabs, choose **Resume** and press a movement key again.

## Check and build

```sh
npm test
npm run build
npm run preview
```

The production build is written to `dist/`. The tests cover gameplay simulation and the rules behind the visible controls.

## Project docs

- [Product requirements](docs/PRD.md) and [MVP specification](docs/MVP_SPEC.md)
- [Design system](docs/DESIGN_SYSTEM.md) and [art direction](docs/ART_DIRECTION.md)
- [Contributor and code review guide](AGENTS.md) and [security review guide](SECURITY.md)
