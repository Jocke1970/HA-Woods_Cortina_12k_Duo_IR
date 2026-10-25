# Wood's Cortina IR — 2026.10.0b3 (beta)

First CalVer beta using the required `YYYY.MM.0bN` format.

## Changes from v0.1.0b2

- **Narrow-card layout fix:** responsive container-based layout prevents
  temperature buttons from being clipped; status and title no longer
  collide. Room temperature and footer are easier to read.
- **Interaction hardening:** direct event listeners on each rendered
  button, visible *sending* and HA *accepted* feedback, and visible
  service-call errors. Adds JS interaction tests using the actual
  bound button handlers instead of only invoking private methods.
- Compact footer shows the time of the last requested IR transmission
  and exposes the full timestamp as a tooltip.
- Frontend cache-busting resource URL documented.
- Updated backend/JS/display/manifest version `2026.10.0b3`.
- IR codec and climate backend behavior unchanged from b2.
  HEAT, Auto Clean, timer, and Sleep remain unavailable.

**Important:** No physical RM4 transmission or confirmed appliance
status is implied by a successful HA service call. Test manually in
a **normal (not editing) dashboard view**.

## Upgrade via HACS

Download beta prerelease `v2026.10.0b3` in the HACS custom
repository, restart Home Assistant, then **edit the existing dashboard
JavaScript module resource** to:

```
/woods_cortina/woods-cortina-card.js?v=2026.10.0b3
```

Hard-refresh the browser (Ctrl+Shift+R). No need to add a second
resource or copy frontend files.

```yaml
type: custom:woods-cortina-card
entity: climate.wood_s_cortina_12k_duo
name: Wood's Cortina
```

Please verify COOL temperature +/−, mode switching and power
and observe last_ir_sent_at in the HA climate entity.
