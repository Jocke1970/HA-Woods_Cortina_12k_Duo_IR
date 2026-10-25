# Wood's Cortina 12K Duo IR — 2026.10.0b6 (beta)

## HEAT for supervised testing

- The owner confirmed that **both** learned original-remote HEAT POWER
  OFF and POWER ON commands worked on the physical AC when replayed
  through RM4 Mini.
- HEAT is available in Home Assistant's climate modes and in the custom
  card (radiator icon, temperature +/-).
- Codec reproduces four real recorded HEAT frames byte-for-byte:
  state 22°C and 23°C, POWER OFF and POWER ON at 22°C.
- The newly generated HEAT path via the climate integration still needs
  physical testing for temperature changes, mode changes and fan speeds.

## Lovelace card

- Three fan buttons now use **mdi:fan-speed-1**, **mdi:fan-speed-2**
  and **mdi:fan-speed-3** instead of Low/Medium/High text.
- Swedish accessible labels, hover tooltips and on/off/selected behavior
  of the original climate fan controls are preserved.
- The four modes remain in the hero; smartplug and energy sections and
  their safety guards are unchanged.

## Important limitations

- IR is one-way: all HA states are **optimistic requests**, not confirmed
  physical appliance status. Never rely on these for mains power safety.
- No unattended heating/frost protection or automated compressor control
  while generated HEAT commands are still being manually validated.
- Auto Clean, Sleep and Timer remain deferred.
- The `0x04` flag in the HEAT state frame remains semantically unknown.

## HACS

Download prerelease `v2026.10.0b6` through HACS and restart Home Assistant.
Keep the existing JS resource URL exactly:

`/woods_cortina/woods-cortina-card.js`

Do not add `?v=` or install `dev` directly.
