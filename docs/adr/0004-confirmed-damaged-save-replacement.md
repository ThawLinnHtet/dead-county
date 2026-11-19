# Replace only the damaged save the player confirmed

A read error leaves the save’s condition unknown. An unsupported schema identifies a compatibility issue. Only a successfully read record with a demonstrable format violation qualifies for replacement. Inspect the schema header before interpreting gameplay fields so an unfamiliar future payload cannot trigger damage recovery.

Retain the original slot key and its revision with the diagnosis. When the revision is unreadable, retain an immutable copy of the complete stored gameplay record, including unknown fields, types and binary content. Keep exclusive ownership metadata independently verifiable. Acquire or verify ownership, collect explicit confirmation, and prepare the new run in memory through successful House A placement.

In a single write transaction, recheck the owner and read the record at the original key. Compare the expected revision, or compare the exact original stored value if its revision was unreadable. A comparison of decoded gameplay fields could miss a change to the very data that failed validation. If the record disappeared, differs, or cannot be compared faithfully, abort and request fresh diagnosis and consent before another replacement. Only a committed replacement publishes the prepared run. This exception never permits an ordinary save to proceed with a missing revision.
