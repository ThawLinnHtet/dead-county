# Give one tab ownership of the local run and validate every write

Two tabs can start from the same snapshot. An older tab could otherwise overwrite later progress or revive a dead run. Acquire exclusive authority over the **slot** before starting or continuing a run, including creating a save in an empty slot. Keep that authority while hidden or paused. A blocked tab stays outside gameplay until exclusive acquisition succeeds after safe release or confirmed abandonment. A missed heartbeat, delayed message or background timer is insufficient evidence.

Each acquisition installs a fresh ownership token under exclusive authority and reads the current committed slot from IndexedDB. Use that record to initialize the run and its expected revision. Scope release to the current token so a delayed release cannot clear a successor’s ownership. On Save & Exit, finish the commit before releasing. A crash gives the successor only the last completed transaction.

Keep a slot record with the current owner token and a monotonically increasing save revision. Initialize an unused slot at revision zero. Preserve revision history across run replacement and death, including when there is no resumable payload. Store the schema version and world version with the snapshot. The slot revision identifies a committed gameplay change.

Menu availability is advisory. Release notifications can reach several tabs together, so each waits for an explicit Continue before attempting acquisition. Only the winner loads the committed run. A losing tab returns to the blocked menu and drops its acquisition request.

Every gameplay write carries the token and the revision its caller read. In one IndexedDB read/write transaction covering the slot metadata and payload, compare both with the stored values, then write the new snapshot or death marker and advance the revision. On mismatch, abort the transaction and keep the stale state out of gameplay until ownership and committed data are reconciled. A caller must never retry stale content by simply substituting the latest revision. Update the caller’s expected revision and acknowledge success only after commit.

A revision conflict holds the simulation until the player chooses recovery. Reload checks ownership and reads the committed record and revision together, then replaces only in-memory state. Losing ownership returns the tab to the blocked menu. A retryable storage failure permits another write attempt with the original expected revision and the same transactional checks. [Recovery behavior](../PAUSE_MENU_SPEC.md#54-save-conflict-recovery)

Confirmed damaged-save replacement is the sole exception to requiring a readable expected revision. It still validates ownership and compares the original stored record inside the committing transaction. [Damaged-save decision](0004-confirmed-damaged-save-replacement.md)
