# Wood's Cortina 12K Duo IR — 2026.10.0b4 (beta)

## New smartplug power and energy section

- Adds **Strömförsörjning** for the existing smartplug
  `switch.woods_cortina_silent_12k_duo`, distinct from the existing
  climate IR start/stop control.
- Shows actual consumption from
  `sensor.woods_cortina_silent_12k_duo_power`,
  `sensor.woods_cortina_silent_12k_duo_energy_daily`, and
  `sensor.woods_cortina_silent_12k_duo_energy_monthly`.
- Uses each sensor's HA-reported measurement unit; displays `—` for
  missing or unavailable data.
- Smartplug ON uses `switch.turn_on`; OFF requires a second confirmation
  click and uses `switch.turn_off`. Never automatically chains IR and
  smartplug calls. IR controls are disabled when the plug is explicitly off.
- Four optional card configuration keys are available with the user's
  provided entity IDs preconfigured as defaults. Existing dashboard
  YAML need not change.
- Additional frontend tests cover sensor formatting, missing entities,
  smartplug clicks and separation of IR from mains controls.

## Important safety considerations

**Do not interrupt mains while the AC compressor is operating.**
Stop the AC with its native control first; wait for its shutdown sequence
to finish. The two-click guard does not detect whether the compressor
is actually running. HA climate state remains optimistic because
the RM4 communicates by one-way IR.

The previous power/IR synchronization concern is **not** automatically
resolved by this UI update. Continue physical supervision.

## Installation

Update the HACS custom repository to prerelease `v2026.10.0b4`,
restart HA and reload the browser. Keep the one-time resource as
`/woods_cortina/woods-cortina-card.js` — **no `?v=` suffix**.

```yaml
type: custom:woods-cortina-card
entity: climate.wood_s_cortina_12k_duo
name: Wood's Cortina
```

All existing IR backend behavior remains unchanged.
HEAT, AUTO CLEAN, TIMER and SLEEP remain disabled or postponed.
