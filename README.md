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

Both survivors start unarmed in House A. Search the starter cabinet for a Baseball Bat and Water Bottle. Transfer the bat, then click it in the gameplay strip to equip it or choose **Equip** in Inventory. Click a consumable in the strip to open its details and choose whether to use it. Search the House B kitchen cabinet for the quicker, shorter reach Kitchen Knife. Use Space to knock a nearby zombie down briefly, then move away or follow up with a normal swing.

Drag loot into Inventory to fill the first open slot, or choose **Transfer**. Drag carried items between slots to move or swap them, or choose **Move** and select a destination. Drag an item onto **Drop** to place it on the ground.

House B has gray siding, a columned porch, and Canned Food in its kitchen cabinet. The street crossing is quicker, while the detour offers cover that can break line of sight. House C has food and water and draws more zombie activity. Hunger and Thirst rise during active play. Bandages restore lost Health, and a run ends when Health reaches zero.

Follow the avenue east into six connected blocks. The Corner Store, Birch Clinic and Cedar Workshop have different supplies. Sprinting and swinging can draw nearby zombies toward the sound. Exterior doors start closed. Use **E** at an indicated door or window to open or close it. Cedar Workshop starts locked. Find its key in Cedar House or enter through the workshop's side window and unlatch the door from inside. Bandages stop bleeding after a bite. The neighborhood gets darker as night approaches.

Walls and closed doors hide zombies and muffle their sounds. Listen for footsteps and groans from either side, and hold **C** to make a quieter approach. If a zombie saw you enter a building, it can follow your last known position and force the door. The living-room cabinet in House B holds a Canvas Backpack and a Door Wedge. Equip the pack in Inventory to raise your carry limit from 5 kg to 9 kg. Use the wedge from Inventory while standing inside beside a closed door to buy time against pursuit.

Sound starts after you interact with the page. The menu plays a short original theme. During play, listen for zombie growls, swings, confirmed hits, bites, and item cues. Toggle **Sound** in the main menu or Pause. The setting is remembered on this browser.

The zombie groans and bite windup snarls use edited takes 10, 11, 16, 18, 19, and 24 from [artisticdude's Zombies Sound Pack](https://opengameart.org/content/zombies-sound-pack), released under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).

Watch for a short arc beside your survivor when a hidden zombie makes a nearby sound. It shows the direction to check. Above 3.5 kg, sprinting costs more Stamina and recovery slows. A pressured door rattles and develops cracks. **Near failure** means it may give way on the next few blows.

Equip the Canvas Backpack to use its six storage slots. Drag items between the backpack, your main inventory, and an open cupboard. When the starter cabinet is empty, approach it and use **E Store** to stash supplies for later.

The Corner Store stocks a Hammer, and Alder House has a Board and a side window. With the Hammer carried, close Alder House's front door, stand on the inside, and choose **Use** on the Board in Inventory. The noise can draw zombies, and the board buys time if they force the door. Press **E** from inside to remove it, or use the side window to leave it in place. Continue restores the barricade and its remaining resistance.

Fatigue builds while you are awake. Close the entrance to your chosen shelter, take care of Hunger and Thirst, and use **E Sleep** beside a bed. Sleep runs the neighborhood clock and zombie activity faster. You can wake with **E**, and danger or critical needs can wake you early. Stashed supplies, fatigue, and remaining sleep carry over through Continue.

## Controls

| Input | Action |
| --- | --- |
| `W`, `A`, `S`, `D` | Walk in screen-relative directions |
| `Shift` + movement | Sprint while Stamina permits |
| Hold `C` + movement | Sneak with a lower profile and quieter steps |
| Mouse movement | Face toward the pointer over the game world |
| Hold right mouse button | Aim while taking slower side steps and back steps. With a weapon equipped, the arc shows its reach and brackets mark a reachable target. |
| Left click | Swing the equipped weapon in the pointed direction. Low Stamina lengthens recovery. |
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

The CI and Vercel workflow runs `npm ci`, tests, and the production build for pushes and pull requests. A successful `main` build publishes the compiled static files to the existing `dead-county` Vercel project. In Vercel **Account Settings → Tokens**, create an access token for the team that owns the project. Store it as `VERCEL_TOKEN` under **Settings → Environments → production → Secrets** on GitHub. The workflow targets the project using its Vercel team and project IDs and checks that the token can access that project before uploading. If the check returns 401, 403, or 404, replace the GitHub secret with a current token for that team.

## Project docs

- [Product requirements](docs/PRD.md) and [MVP specification](docs/MVP_SPEC.md)
- [Design system](docs/DESIGN_SYSTEM.md) and [art direction](docs/ART_DIRECTION.md)
- [Contributor and code review guide](AGENTS.md) and [security review guide](SECURITY.md)
