# Wood's Cortina IR — 2026.10.0b9 (final UI beta)

## Final UI polish

- Home Assistant service success acknowledgement disappears **five seconds**
  after completion. A later command replaces the previous timer. Errors
  remain until another action or cancellation. No extra dependencies.
- Power button stays `mdi:power` in the top-right. The compact tile
  shows only **AC** (or **Huvudström** when mains is off);
  the long-press hint lives in the button's tooltip/title.
- No duplicate blue acknowledgement when opening the mains-off
  confirmation; the explicit confirmation strip gives the warning.
- Advanced panel wording now acknowledges that all four HVAC modes
  were physically tested. Auto Clean, Sleep, and timer remain unimplemented.

## Preserved

- Compact OFF mode, target and room temperatures, mode colors, fan
  speed icons, both expandable sections, confirmed mains switch-off
  safeguards, and the local 256px HA brand icon.
- No changes to Python IR codec or climate service dispatch.
- The versionless resource remains
  `/woods_cortina/woods-cortina-card.js`.

## Release path

This beta is for final UI check before promoting a **separately versioned**
`2026.10.0` stable release to `main`. Beta and stable tags are
immutable. Normal SOP: dev → beta → main.
