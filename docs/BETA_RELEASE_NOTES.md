# Wood's Cortina IR — 2026.11.0b2 (beta)

## Fix: Sections dashboard card sizes

- **Standard now recommends 12 columns** (full section), minimum 9.
- **Mini now recommends 6 columns** (half section), minimum 6.
- Both use `rows: auto` so their heights track their content.
- Mini wraps to two temperature values plus a full-width power row
  below 260px container width. This prevents cramped labels and clipped
  readings like `351,2 W` in narrow dashboard columns.
- These are default recommendations. Existing cards with saved
  `grid_options` overrides can use **Layout → Use recommended size**
  in the HA editor, or choose 12/6 columns manually.

## Unchanged

- Standard/Mini editor selector and `size: mini` YAML option.
- Modes, status, target and room temperatures, instantaneous power,
  current power state, five-second HA acknowledgements and errors.
- Safe mains/AC power-button behavior, explicit confirmation and
  mandatory 60-second wait + low-power checks for any manual mains cut.
- Python IR codec, Home Assistant entities, bundled brand icon,
  permanent JS resource URL and stable `main` version `2026.10.0`.

## HACS beta

Install tagged prerelease `v2026.11.0b2` through HACS. Restart Home
Assistant and refresh your dashboard. Keep the existing JavaScript
module resource `/woods_cortina/woods-cortina-card.js` without `?v=`.
The change is limited to UI sizing and presentation; validate the final
layout on your dashboard before any promotion to `main`.
