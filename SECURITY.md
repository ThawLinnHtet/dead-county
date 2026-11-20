# Security review

Use this checklist when a change touches browser inputs, save data, tab ownership, asset loading, dependencies or the production build. Review the changed boundary and the existing callers that depend on it. Dead County is a static browser game. The player controls local storage and the client runtime, so local saves and survival results are untrusted data in any future online feature.

## Browser input and presentation

- Treat IndexedDB records, cross-tab messages, URL values and imported data as untrusted. Validate type, version, numeric ranges, IDs and collection sizes before use. Check that malformed input cannot trigger unbounded work or a gameplay action during focus, pause or load transitions.
- Render untrusted text as text. Review any HTML insertion, dynamic asset URL, worker or script source separately. Prefer bundled or same-origin assets from the authored map and asset list.
- Check that commands are validated by the authoritative gameplay or persistence boundary as well as by the UI. A disabled control, open overlay or stale screen is insufficient as a guard.

## IndexedDB and run ownership

- Keep validation of the run owner and expected save revision in the same write transaction as the mutation. Check creation, normal save, retry, replacement and death invalidation. Exercise two browser tabs that race to acquire or write. A rejected write preserves the latest committed record.
- Keep ownership while the owner is hidden or paused. Treat cross-tab signals as hints to recheck state. Require explicit Continue after release and read the latest committed slot before resuming.
- Preserve the slot on a read failure or an unsupported schema. Review damaged-save replacement for explicit consent, a successfully prepared replacement run, and the exact-record fallback when the expected revision is unreadable. Test a change to the candidate record between confirmation and commit. See the [ownership and revision ADR](docs/adr/0003-exclusive-local-run-and-save-revisions.md) and [damaged-save ADR](docs/adr/0004-confirmed-damaged-save-replacement.md).
- Check that logs, error messages and fixtures avoid exposing full save payloads or credentials.

## Build and release

- Treat every value in client code and the Vite bundle as public. Keep credentials and private configuration out of source, client environment variables, logs, static assets and published output.
- Review direct dependency and lockfile changes for purpose, source, and relevant advisories. Inspect new install scripts or remote resources and verify the production build with the resolved lockfile.
- Verify the published output contains the intended game and assets, with production behavior matching the approved static deployment.

## Findings

For each actionable finding, record the affected boundary, file and line, triggering condition, plausible impact and a concrete fix or verification. Use local test data and authorized environments for reproduction. Record gaps in checks that could affect release confidence.
