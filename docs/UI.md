# Bundled Lovelace card — Wood's Cortina IR 2026.10.0b8

The premium card is **included in the same HACS integration beta**. There
is no extra HACS repository, copy into `/config/www`, or additional
JavaScript dependency. Home Assistant serves its JavaScript from
`custom_components/woods_cortina/www/woods-cortina-card.js` at the URL
`/woods_cortina/woods-cortina-card.js`.

## Upgrade from b1 and load the card

1. From the already-added HACS custom repository, choose beta
   `2026.10.0b8` and download/update it.
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

## Smartplug power and energy (new in 2026.10.0b5)

The card has a **single primary power button** in the top panel with two context-sensitive functions:

- When smartplug is **OFF**, the main power button only sends
  `switch.turn_on` for `switch.woods_cortina_silent_12k_duo`. It
  **does not** start the AC automatically.
- When smartplug is **ON**, the same button sends
  `climate.turn_on` or `climate.turn_off`, never changing the smartplug.
- When HA's climate state is **OFF**, a secondary, small
  **Bryt huvudström** control appears beside the mains indicator.
  The secondary control is not available while HA thinks AC is ON.
  It requires **two clicks within 15 seconds**, a valid HA-reported
  power measurement at or below **15 W**, and at least **60 seconds**
  since the last successful IR request. A missing power measurement
  or timestamp blocks mains-off. These are *additional* precautions,
  not evidence the physical compressor has stopped.
- The main power button is disabled when the smartplug state is
  `unknown`/`unavailable`; mode and setpoint controls still rely
  on climate behavior when plug state is unknown.

Energy readings show actual states and units from three HA sensors, without
calculated conversions or extrapolation. Unknown/unavailable readings appear
as `—`. The values are already collected in HA; the new UI is read-only
for these sensors.

The following optional card properties have your actual entity IDs as
**built-in defaults**, so your existing card YAML requires **no changes**:

```yaml
type: custom:woods-cortina-card
entity: climate.wood_s_cortina_12k_duo
name: Wood's Cortina
power_entity: switch.woods_cortina_silent_12k_duo
power_sensor: sensor.woods_cortina_silent_12k_duo_power
energy_daily: sensor.woods_cortina_silent_12k_duo_energy_daily
energy_monthly: sensor.woods_cortina_silent_12k_duo_energy_monthly
```

The values in these four fields may be overridden for another installation.
The default, permanent JavaScript module URL stays
`/woods_cortina/woods-cortina-card.js`, **without query parameters**.

## Layout in 2026.10.0b5

The **top hero** now includes temperature, COOL/DRY/FAN mode buttons with
distinct Home Assistant MDI icons, and the context-sensitive power button.
Below the hero, the order is:
1. **Fler inställningar** (fan speed, swing, energy-saver)
2. **Strömförbrukning** (collapsible power and daily/monthly energy readouts).

Both expanders keep their open/closed state across climate updates.
There is no external icon library. The Lovelace resource path is unchanged
and has **no version parameter**.

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

## Previous UI improvements

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

- **HEAT is available for supervised testing in b6.** The learned
  original-remote HEAT POWER ON/OFF commands worked when replayed through
  RM4 Mini. Generated heating commands and setpoint/fan combinations
  still require real-device tests; no unattended automation.
- AUTO CLEAN / TIMER / SLEEP remain in the TODO.
- Basic remote IR is one-way; displayed mode and power reflect the
  last HA request and can diverge from the physical AC.
- Other Home Assistant dashboards or service calls can still alter
  the target temperature while FAN/DRY are selected. The visual control
  restriction applies to this custom card only.
- Static resource registration is intentionally **manual** rather
  than writing to a user's Lovelace resources automatically. If you
  update the integration later, refresh the browser to clear the module.

If the dashboard shows `Custom element doesn't exist`, confirm the
resource URL returns JavaScript after HA restart and refresh the browser.


## HEAT beta & fan buttons (2026.10.0b6)

HEAT uses the `mdi:radiator` icon in the hero. Its temperature controls
are active while heating, with a 2×2 grid on narrow cards and four
columns on wider cards. Energy Saver remains COOL-only.

The three fläkthastighet buttons now show built-in Home Assistant icons
`mdi:fan-speed-1`, `mdi:fan-speed-2` and `mdi:fan-speed-3`,
without visible Låg/Medel/Hög words. Accessible Swedish button names,
hover titles, selection state and `climate.set_fan_mode` service
values remain unchanged. No external icon library is needed.


## Header and temperature layout (2026.10.0b7)

- The **single primary power button** is now a compact `mdi:power`
  icon in the top-right corner. It always uses the same icon, regardless
  of AC versus smartplug state.
- Directly below the icon, the small contextual hint reads
  **Huvudström** when the smartplug is OFF, **AC** when mains is ON,
  or **Okänd** when smartplug status is unknown. `title` and
  `aria-label` expose the precise next action to pointer and keyboard
  users: switch mains ON / start AC / stop AC.
- The requested target and the measured room temperature now sit on
  **the same row** with a subtle vertical divider and a smaller font
  for the room temperature. On narrow cards, +/- buttons remain
  below; on wider cards they appear to the side.
- The guarded secondary **Bryt huvudström** button remains below
  the HVAC mode controls, with the same low-draw, cooldown and
  confirmation checks. Relocating the primary button **does not**
  change its `switch`/`climate` service-routing logic.
- Both expanders, the four HVAC mode icons and the fan-speed icons
  remain in the previous order. The resource URL stays
  `/woods_cortina/woods-cortina-card.js` without `?v=`.

## Compact standby and long-press (2026.10.0b8)

With AC reported OFF (including mains OFF), only the small header tile
remains visible: **Wood's Cortina**, assumed OFF status, and the `mdi:power`
button with AC / Huvudström label. Target/room temperatures, +/- controls,
mode buttons, advanced/energy expanders and footer return automatically
when AC starts. Service feedback and confirmation messages remain visible
while compact. The header no longer shows `KLIMATKONTROLL · IR`.

A short power tap retains the old behavior. When mains is ON, a **900 ms
long-press** (touch, mouse, or keyboard Space/Enter) opens the guarded
confirmation for **Bryt huvudström**. Only a separate **Bekräfta** tap
sends `switch.turn_off`. **Avbryt** closes without changing any entity.
The existing checks—climate must be OFF, power ≤15 W, 60 s since last
IR request, 15 s confirmation expiry—still apply in both the UI and
service action handler. The live effect reading is not proof of compressor
state; verify shutdown on the physical AC. Long-press with AC running
cannot send mains-off.

The room-temperature caption is shortened to **RUM** and right-aligned
alongside the requested setpoint at narrow widths.

The integration's own icon lives under `brand/icon.png` (256 pixels). It is shown by Home Assistant's local brand
support (HA ≥2026.3) and are separate from `mdi:power` in the card.
