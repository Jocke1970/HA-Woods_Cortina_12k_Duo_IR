# Wood's Cortina 12K Duo IR — Home Assistant

**Experimental / `dev` only.** Custom Home Assistant climate integration for Wood's Cortina 12K Duo controlled using a **BroadLink RM4 Mini** through Home Assistant's existing BroadLink `remote` entity.

> No real-hardware validation has been completed. In particular, compatibility with the **Duo** remote and heating-mode encoding are unverified. Heat is deliberately not offered.

## Architecture

`climate.woods_cortina` → dynamically generated Wood's 72-bit IR frame → BroadLink IR packet (`b64:`) → Home Assistant `remote.send_command` → RM4 Mini → AC.

The integration intentionally **does not** communicate directly with the BroadLink hub, nor does it require an ESP32 or ESPHome. Current temperature is optionally taken from an external Home Assistant sensor. The AC's internal thermostat continues to regulate its compressor.

**Important:** Infrared has no feedback path. All power/mode/fan/target states are *requested/assumed*, not confirmed appliance measurements. A successful service call only means Home Assistant accepted the transmission request.

## Credit and license

The IR protocol encoder is adapted from [srednak/woods-protocol](https://github.com/srednak/woods-protocol), copyright © 2026 Anders, MIT license. The original project reverse-engineered the Wood's Cortina remote, developed the checksum/byte tables and documented pulse timing. Full attribution and MIT license text are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). This project is not affiliated with Wood's or the original author.

## Install for bench testing

1. First configure the RM4 Mini with Home Assistant's official [BroadLink integration](https://www.home-assistant.io/integrations/broadlink/). Verify that a `remote.***` entity exists.
2. From the `dev` branch, copy `custom_components/woods_cortina/` to `/config/custom_components/woods_cortina/` in your Home Assistant installation.
3. Restart Home Assistant. Go to **Settings → Devices & services → Add integration** and search for **Wood's Cortina IR**.
4. Select your BroadLink `remote` entity and, optionally, an existing room temperature sensor.
5. Start with an **unobstructed, supervised** IR test (e.g. Cool / 22°C / Low fan). Verify what the appliance *actually* does, and compare with its original remote.
6. If anything unexpected happens, stop testing and send captured codes/logs; do not enable automations.

There is no need to copy the original repo's ESPHome firmware. This is a **development preview**, not yet a HACS release or a production-ready controller.

## Implemented now

- Config flow to choose existing HA remote and optional room-temperature entity.
- `climate` entity: Off, Cool, Dry, Fan only; setpoint 17–30°C; Low/Medium/High fan; Swing On/Off; Energy saver preset.
- A Python 72-bit codec and BroadLink packet packing; power key uses a distinct IR frame.
- Optimistic/assumed state and last-send metadata; no fabricated compressor/IR-reception status.
- Unit tests against captured bytes documented in the source repository and packet invariants.

## Not implemented / intentionally disabled

- **Heat mode:** absent from the original reverse-engineered codec. Do not guess its IR value.
- Automatic room-temperature compensation, anti-short-cycle control, timers, sleep and auto clean in the HA UI.
- Reading Wood's *internal* room sensor (IR is send-only).
- Detecting changes made with the appliance's physical buttons or original remote.
- Premium Lovelace card; planned as a separate JS module.
- Automatic HACS installs and release packaging until bench validation.

## Development workflow

`dev → beta → main`. No code will be merged to `main` until validated and reviewed. Run `python -m pytest -q` and `python -m compileall -q custom_components`.

See [docs/IR_PROTOCOL.md](docs/IR_PROTOCOL.md) for the exact reused algorithm, BroadLink packing, assumptions, and the IR-test matrix.
