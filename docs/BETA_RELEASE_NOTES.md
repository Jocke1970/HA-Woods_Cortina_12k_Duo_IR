# Draft beta notes — 2026.10.0b6 (UNRELEASED)

Prepared on `dev` only. **Do not publish via HACS until the user
confirms actual HEAT power OFF/ON replay via RM4 Mini.**

- Adds HEAT to the climate mode list and the custom card (radiator icon).
- Captured 22°C and 23°C HEAT states and separate 22°C HEAT POWER ON/OFF
  frames are reproduced byte-for-byte by the production encoder.
- Restores optimistic HEAT selection after HA restart, subject to the
  same no-IR-feedback caveats as other modes.
- Preserves COOL/DRY/FAN protocol behavior.
- The B7 `0x04` bit present in ordinary HEAT state captures is
  still unidentified. Auto Clean, timer and Sleep remain deferred.
- No changes to smartplug/energy entities, safeguards or resource URL.

The original remote used separate ON and OFF payloads, but this is not
proof that sending them via RM4 will start/stop the AC, nor that replaying
them repeatedly is always safe with stale HA state. **No unattended
heating, frost protection, or automated compressor cycling** until
verified on hardware.

Install via HACS only after a tagged beta is published. Keep JavaScript
resource URL `/woods_cortina/woods-cortina-card.js` unchanged.
