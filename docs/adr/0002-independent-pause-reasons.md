# Derive simulation pause from every active reason

The foreground panel and the reasons the simulation must wait can differ. Hiding the tab while looting leaves both Loot and tab visibility blocking play, and returning also requires the player to choose Resume. The game coordinator owns an idempotent set of pause reasons and a pending Resume flag. It advances a ready, live, owned run only when the set is empty and the flag is clear.

On hide, add the visibility reason and set the flag. On return, clear only visibility and restore the foreground panel. Closing Inventory, Loot or Full Map clears only that panel. When Resume is due, offer it through the existing Pause menu. Its explicit Resume action clears the flag and its own menu reason while visible. Completing a save clears only the save hold. Duplicate visibility and close events are harmless. On the transition back to play, reset the frame time baseline so the hidden interval contributes zero gameplay time.

A gameplay hold also clears active movement input. After the gate opens, a new physical key press can drive movement. Repeat events from keys held through the transition cannot. Use the same empty input state after Continue. Movement input belongs to the current play session. Attack phase, aim and remaining recovery belong to the run and survive the transition.
