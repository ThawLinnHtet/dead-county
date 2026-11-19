# Dead County

These terms describe survival and combat during a run.

## Language

**Last known position**  
The most recent world position where an individual zombie saw the survivor within its detection range and line of sight.

**Pursuit grace period**  
The active gameplay time a zombie continues chasing after it loses sight of the survivor. A new sighting ends that interval.

**Run owner**  
The browser tab with exclusive control of the local run. It retains control while paused or hidden.

**Save revision**  
The sequence number of the latest committed change to the local save slot. It advances when the slot’s saved gameplay state changes, including replacement or death.

**Save-schema version**  
The format identifier that tells a build how to interpret the stored gameplay record.

**Damaged save**  
A successfully read record with a confirmed violation of its known format or the common record header.

**Save conflict**  
A save attempt by the owning tab whose expected revision differs from the current slot revision. The player can reload the latest committed save to resolve it.

**Pause reason**  
A condition that holds the simulation at its current instant. Several reasons can apply at once.

**Dropped item**  
An individual item lying loose in the world after a survivor drops it. Picking it up returns it to inventory.

**Run**  
One survivor's attempt to stay alive in the neighborhood, from the start of a new game until that survivor dies. Saving and continuing belong to the same run.

**Critical hunger**  
The level of hunger at which the survivor gradually loses health until they eat enough to bring hunger below the critical threshold.

**Critical thirst**  
The level of thirst at which the survivor gradually loses health until they drink enough to bring thirst below the critical threshold.

**Attack recovery**  
The time after a swing or bite during which the attacker must wait before attacking again.

**Contact**  
The point in a bat swing or bite when the attack can deal damage to a target within reach. An attack can reach contact and miss.
