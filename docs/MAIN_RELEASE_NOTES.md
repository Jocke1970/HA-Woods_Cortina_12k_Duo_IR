# Wood's Cortina 12K Duo IR — 2026.10.0

## First stable release

- Home Assistant climate integration for Wood's Cortina 12K Duo using
  an existing BroadLink RM4 Mini and generated 72-bit IR commands.
- Supports COOL, HEAT, DRY and FAN; setpoint, fan speed, swing,
  power and COOL Energy Saver.
- Bundled responsive Lovelace JS card: compact OFF tile, upper-right
  power icon, active HVAC icons, accessible fan speed icons,
  target and room temperatures side by side.
- Independent smartplug mains switching with guarded long-press and
  explicit confirmation, plus actual power and daily/monthly energy.
  Mains-off gating requires climate OFF, ≤15 W measured draw,
  ≥60 seconds since last IR command and confirmation within 15 seconds.
  These guards do not establish the actual compressor's state.
- Service successes auto-hide after five seconds; errors remain.
- Bundled 256px Home Assistant integration icon; no external assets.

## Hardware verification and caveats

The owner supervised tests of the beta integration on the physical AC,
including generated HEAT, mode and temperature changes, fan speeds,
and start/stop. Learned original-remote HEAT POWER ON/OFF also replayed
successfully through the RM4 Mini. Final b8/b9 UI changes passed automated
Python and frontend tests.

**IR is one-way**: Home Assistant only knows the last requested state,
not confirmed physical on/off or active compressor. Do not use this
integration for unattended frost protection or autonomous heating.
Always verify physical AC shutdown before disconnecting mains power.
Auto Clean, Sleep and Timer are deferred features.

## Install/update

Select stable HACS release `v2026.10.0`, restart Home Assistant and
reload the dashboard. Keep the JavaScript module resource unchanged:

`/woods_cortina/woods-cortina-card.js`

Do not append a `?v=` query parameter or install directly from dev.
No modifications to existing card YAML are required.

## Credit

The IR codec incorporates MIT-licensed protocol research by Anders
from `srednak/woods-protocol`. Full license/credit in
`THIRD_PARTY_NOTICES.md`.
