# Wood's Cortina 12K Duo IR — 2026.10.0b8 (beta)

## Compact off-state UI

- OFF now renders a compact Wood's Cortina tile with status and the
  existing upper-right `mdi:power` control. Temperature widgets, HVAC
  mode buttons, collapsible settings/consumption, and footer are hidden
  until the AC is started.
- Removes the unnecessary `KLIMATKONTROLL · IR` caption.
- Aligns room temperature beside target using smaller right-aligned
  `RUM` label.

## Safer main-power long-press

- **Short tap** on power is unchanged: plug OFF → switch ON, plug ON →
  climate START/STOP via IR.
- When plug is ON, **hold power ≥900 ms** to initiate mains-off. The hold
  itself never sends `switch.turn_off`. A separate **Bekräfta** action
  is required; **Avbryt** closes the confirmation.
- The existing climate-OFF, valid measured ≤15 W, ≥60 seconds after the
  last IR command, and confirmation-timeout guards remain mandatory.
- Long-hold while AC is running or if readings are missing fails closed;
  this is not a guarantee that the real compressor has stopped.

## HA integration branding

- Bundles the previously approved AC + IR waves artwork locally as
  `custom_components/woods_cortina/brand/icon.png` (256 pixels)
  following the HA 2026.3+ local brand convention.
- No additional Lovelace resource, brand CDN, or HACS repository needed.

## Installation

Install tagged prerelease `2026.10.0b8` through HACS; restart HA and
reload the dashboard. Keep the original resource URL unchanged:
`/woods_cortina/woods-cortina-card.js` (no `?v=`).

The backend and protocol are identical to the physically validated
b6/b7 series. User verification of this UX is needed before promotion
to `main`. IR state remains optimistic, so do not automate mains cut.
