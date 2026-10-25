# Bundled Lovelace card — Wood's Cortina IR 2026.10.0b3

The premium card is **included in the same HACS integration beta**. There
is no extra HACS repository, copy into `/config/www`, or additional
JavaScript dependency. Home Assistant serves its JavaScript from
`custom_components/woods_cortina/www/woods-cortina-card.js` at the URL
`/woods_cortina/woods-cortina-card.js`.

## Upgrade from b1 and load the card

1. From the already-added HACS custom repository, choose beta
   `2026.10.0b3` and download/update it.
2. Restart **Home Assistant** (the Python integration registers the URL
   when starting).
3. Visit **Settings → Dashboards → ⋮ → Resources** (wording varies by
   Home Assistant frontend) and add the new resource:
   - URL: `/woods_cortina/woods-cortina-card.js`
   - Type: **JavaScript module**
4. Reload the dashboard once the resource is registered. If the old card
   persists, a browser hard-refresh (`Ctrl+Shift+R` on Linux) is a fallback,
   **not** a reason to modify the resource URL.
5. Edit a dashboard → **Add card → Manual**, then use:

```yaml
type: custom:woods-cortina-card
entity: climate.wood_s_cortina_12k_duo
name: Wood's Cortina
```

Use your actual entity ID if different. The card will also be listed as
**Wood's Cortina** in card search after the resource loads.

### YAML-mode dashboards

Include the following resource in your dashboard's `resources` section
instead of adding it through the UI:

```yaml
resources:
  - url: /woods_cortina/woods-cortina-card.js
    type: module
```

## Implemented UI

- Premium responsive card in Swedish with current room temperature
  (optional external sensor) and target/setpoint controls.
- Cooler controls in **COOL only**. In FAN/DRY, temperature controls
  are inactive and the most recently requested target is retained
  for later COOL use.
- COOL, DRY and FAN mode selectors (only when supported by the entity);
  power toggle, low/medium/high fan controls where appropriate.
- Collapsible advanced area: swing and Energy Saver.
- Busy/error handling, button accessibility, missing/unavailable entity
  treatment, and an explicit **assumed state / no IR feedback** warning.
- The card does not issue automatic commands or take over the thermostat.

## Improvements in 2026.10.0b3

- Responsive sizing now follows the **actual card width**, not the browser's
  viewport width. Narrow cards stack the status and arrange +/− buttons on
  their own row so none can be clipped.
- Compact footer and shorter timestamp; the full last-send time is available
  by hovering the footer stamp.
- Buttons bind click handlers directly to their DOM elements after every
  render; the card now displays sending progress, a Home Assistant service
  acknowledgement, or an error.
- **A HA service acknowledgement is not IR device feedback.** The physical
  AC's state can still diverge.
- If clicking in a dashboard **editor/preview** does nothing, exit edit mode
  and try in the normal dashboard view.
- Keep the resource URL **unchanged** on HACS updates: `/woods_cortina/woods-cortina-card.js`.
  Avoid query parameters such as `?v=...` because they can complicate resource registration.
  Reload the dashboard after restarting Home Assistant; only try a browser hard-refresh if an old card is still shown.

## Important boundaries

- **HEAT is not yet implemented**, despite promising original-remote
  captures. It will be added only after supervised real-device validation.
- AUTO CLEAN / TIMER / SLEEP remain in the TODO.
- Basic remote IR is one-way; displayed mode and power reflect the
  last HA request and can diverge from the physical AC.
- Other Home Assistant dashboards or service calls can still alter
  the target temperature while FAN/DRY are selected. The visual control
  restriction applies to this custom card only in b2.
- Static resource registration is intentionally **manual** rather
  than writing to a user's Lovelace resources automatically. If you
  update the integration later, refresh the browser to clear the module.

If the dashboard shows `Custom element doesn't exist`, confirm the
resource URL returns JavaScript after HA restart and refresh the browser.
