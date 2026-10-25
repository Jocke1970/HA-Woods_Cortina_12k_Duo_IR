# Wood's Cortina 12K Duo IR — 2026.10.0b7 (beta)

## UI refinements

- The single primary power button now appears in the **upper-right**
  corner of the hero and always uses `mdi:power`.
- Its small caption shows **Huvudström** if mains is OFF, **AC** when
  mains is ON, and **Okänd** if smartplug state is unavailable.
  Tooltip and screen-reader text clarify whether the button next
  activates mains, starts the AC, or stops the AC.
- Room temperature appears beside the target setpoint in the same
  horizontal row, with a smaller font and subtle divider.
- Setpoint +/- buttons remain responsive at narrow widths.
- The secondary **Bryt huvudström** action retains the existing
  low-wattage, elapsed-time and double-confirmation safety guards.
- HEAT/COOL/DRY/FAN modes, 3 MDI fan-speed buttons, energy readouts,
  and both expanders are unchanged.

## Verified scope

- No changes to Python IR codec, climate integration, or smartplug
  service-routing logic.
- Automated frontend tests cover header placement, icon/hints, side-by-side
  temperatures and existing smartplug versus IR action dispatch.
- User accepted all climate/HEAT/fan/power functions of b6 on the
  real Wood's AC; b7's new UI still needs visual acceptance in HA.

## Installation

Update through HACS to beta `v2026.10.0b7`, restart Home Assistant,
and reload the dashboard. The JS resource is unchanged:

`/woods_cortina/woods-cortina-card.js`

Do not append `?v=` or install from `dev`. `main` remains untouched
until the user approves the final UI.

## Limitations

IR is one-way; displayed climate state is optimistic.
Do not rely on this for unattended frost protection or for verifying
physical compressor shutdown before mains power disconnection.
Auto Clean, Sleep and timer remain deferred.
