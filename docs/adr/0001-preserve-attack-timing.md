# Preserve attack timing across Continue

Restarting an encounter from actor positions and health alone could give a zombie a second hit immediately after a bite or cancel a bat swing just before contact. We therefore save each attack's gameplay phase, whether it has dealt damage, and its remaining phase and cooldown time alongside the actors' health in the same snapshot. Continue restores those values before the first gameplay step and reconstructs the visible animation from them, so time away from the game leaves the encounter where the player paused it.

A bat swing also carries the world-space direction captured when the player clicked. Restoring that direction lets the game resolve contact from the same arc even if the pointer has moved while the run was paused.

If the selected target is down at wind-up, the attack also stores its downward pose. This optional flag controls the animation. Contact still checks the living targets in the committed arc when the swing arrives.
