# Wood's Cortina 12K Duo IR — v0.1.0b2 (beta)

## New in this beta

- **Premium Lovelace JS card**, bundled directly with the HACS custom
  integration at `/woods_cortina/woods-cortina-card.js`.
- Responsive Swedish UI: current temperature, COOL setpoint (+/−),
  COOL/DRY/FAN mode selectors, on/off, fan speeds, swing,
  Energy Saver, collapsible advanced settings, clear optimistic-IR notice.
- COOL-only setpoint controls in the new card; FAN and DRY intentionally
  show the last target without offering adjustments.
- Home Assistant static resource registration for the bundled card.
  **One-time Lovelace resource setup is still required** (see
  [UI guide](docs/UI.md) and [README](README.md)).
- Actual BroadLink RM4 original-remote recordings preserved and tested:
  verified COOL, DRY, candidate HEAT and ambiguous AUTO CLEAN.
- Codec and frontend smoke checks in GitHub CI.

## Still experimental

- The verified path is HA → generated COOL IR → RM4 Mini → Wood's Duo AC.
  Other function combinations and power transitions require user testing.
- **HEAT remains disabled.** Although the mode byte appears to be 0x10,
  safe power-on/off transitions and generation need real-hardware validation.
- AUTO CLEAN, timer, and sleep are on the TODO list.
- No automated temperature compensation; no AC state feedback.
- Do not use for unattended frost protection or heating.

## HACS upgrade

Upgrade the already-added HACS custom repository to prerelease
**`v0.1.0b2`**, restart HA, then register dashboard resource
`/woods_cortina/woods-cortina-card.js` (type **JavaScript module**) and
use this card:

```yaml
type: custom:woods-cortina-card
entity: climate.wood_s_cortina_12k_duo
name: Wood's Cortina
```

This beta continues to target HA 2026.10 and uses the user's existing
BroadLink `remote.rm4_mini` integration. `main` stays untouched.
