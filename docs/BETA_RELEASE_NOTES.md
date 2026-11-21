# Wood's Cortina IR — 2026.11.0b1 (beta)

## New optional Mini dashboard card

A compact dashboard alternative to the existing Standard card, modelled
after the Wecamp card's Standard/Mini size selection.

- Choose **Standard** (unchanged default) or **Mini** in the native
  Lovelace visual card editor. The existing configuration can also use
  `size: mini` in YAML.
- Mini shows the Wood's Cortina title, a colored current mode/status,
  the same contextual `mdi:power` control, and three compact readings:
  **Börvärde** (or latest setpoint), **Rum**, and **Effekt (W)**.
- Background tint follows the existing COOL/HEAT/DRY/FAN/OFF modes.
- Mini uses a compact 3-column layout, hides advanced settings and HVAC
  buttons, and remains compact while the AC is running. The Standard
  layout and its existing compact OFF state remain unchanged.
- All power actions are routed through the **same handler** as Standard.
  A power short-tap controls smartplug ON or AC ON/OFF depending on state.
  Holding the power icon only arms the existing guarded mains-disconnect
  confirmation; confirmation requires low measured watts, a completed
  60-second cooldown, and climate OFF. No additional automatic mains
  cutoff is introduced.
- Errors, transient HA acknowledgements, and the confirmation strip
  remain visible in Mini when relevant. IR still provides no physical
  feedback.

## Testing and compatibility

- JS tests cover layout sizes, power service routing, safe long-press,
  missing sensors, editor changes, and preserving additional YAML config.
- Python IR backend, state machine, sensors and native HA brand icon
  remain unchanged from stable `2026.10.0`.
- Stable `main` is untouched; the next release follows
  `dev → beta → main` only after user visual approval.

## HACS

Install prerelease `v2026.11.0b1` through HACS, restart Home Assistant
and reload the existing Lovelace JS module:

`/woods_cortina/woods-cortina-card.js`

Keep the resource URL unchanged; do not add `?v=` or install from dev.
