# Wood's Cortina IR — 2026.11.0b3 (beta)

## Same width for Standard and Mini

After reviewing the actual Home Assistant dashboard, the Mini card
now recommends **the same 12-column Section width as Standard**,
with minimum 9 columns and automatic row height. The Mini still keeps
its shorter, simpler visual layout and three key metrics: latest
setpoint, room temperature and power. At a full section width, the
three Mini metrics can display side by side; the previously added
narrow-card wrapping remains available when manually resized.

### Existing dashboard cards

Saved `grid_options` overrides may still force a narrower width.
Open the card's editor and choose **Layout → Use recommended size**,
or manually set both cards to 12 columns.

### Unchanged

- IR codec, climate commands and smartplug mains safety guards.
- Shared, context-sensitive power icon and protected long-press.
- Standard/Mini visual selector; `size: mini` YAML setting.
- JS module resource URL `/woods_cortina/woods-cortina-card.js`
  (without `?v=`).
- Stable `main` remains `2026.10.0`.

## Installation

Install prerelease `v2026.11.0b3` through HACS, restart
Home Assistant and reload the dashboard. Confirm both card layouts
look right on your actual dashboard before stable promotion.
