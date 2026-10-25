# Wood's Cortina 12K Duo IR — 2026.10.0b5 (beta)

## UI redesign

- Moves mode buttons **into the top hero**, with visually distinct
  MDI snowflake / water-percent / fan icons.
- A single **primary power** button has contextual behavior:
  - smartplug OFF → `switch.turn_on`, **without** AC IR startup;
  - smartplug ON → `climate.turn_on` or `climate.turn_off`.
- A small **Bryt huvudström** action is available only while the climate
  entity reports OFF. It is never displayed while climate reports ON.
  Before switch-off, the UI requires measured draw ≤15 W (a valid W/kW
  reading), ≥60 s since the last IR request, and two clicks within 15 s.
- **Fler inställningar** expander appears first.
- **Strömförbrukning** expander follows, containing live W and daily and
  monthly kWh metrics plus smartplug supply state.
- Existing entity IDs and card YAML are unchanged.

## Safety caveats

Home Assistant tracks IR commands optimistically. Even the new
power guard cannot confirm that the physical compressor has stopped
if another remote was used or power readings are stale. The user must
visually verify the AC is off before disconnecting its mains supply.
This beta has no automatic switching between mains and AC control.

## Deployment

Upgrade through HACS to prerelease `v2026.10.0b5` and restart HA.
Keep the existing Lovelace resource URL exactly
`/woods_cortina/woods-cortina-card.js` (no `?v=` suffix).
Reload the dashboard; do not install from `dev`.

HEAT, AUTO CLEAN, timers and sleep remain unavailable.
