# Wood's Cortina 12K Duo IR — Home Assistant

**Beta: functional hardware tests accepted; final UI and release checks pending.** Custom Home Assistant climate integration for Wood's Cortina 12K Duo controlled using a **BroadLink RM4 Mini** through Home Assistant's existing BroadLink `remote` entity.

> **Manual hardware acceptance (2026-10-26):** The owner reports all buttons/functions and mode combinations in the HACS `2026.10.0b6` climate integration and Lovelace card working as intended on the physical Wood's Duo, including HEAT, temperature, fan and on/off behavior. Original-remote HEAT power frames were also replayed successfully through RM4. This is reported supervised functional testing, not direct physical state feedback or proof of unattended reliability. The final UI polish and release checks remain before `main`.

## Architecture

`climate.woods_cortina` → dynamically generated Wood's 72-bit IR frame → BroadLink IR packet (`b64:`) → Home Assistant `remote.send_command` → RM4 Mini → AC.

The integration intentionally **does not** communicate directly with the BroadLink hub, nor does it require an ESP32 or ESPHome. Current temperature is optionally taken from an external Home Assistant sensor. The AC's internal thermostat continues to regulate its compressor.

**Important:** Infrared has no feedback path. All power/mode/fan/target states are *requested/assumed*, not confirmed appliance measurements. A successful service call only means Home Assistant accepted the transmission request.

## Credit and license

The IR protocol encoder is adapted from [srednak/woods-protocol](https://github.com/srednak/woods-protocol), copyright © 2026 Anders, MIT license. The original project reverse-engineered the Wood's Cortina remote, developed the checksum/byte tables and documented pulse timing. Full attribution and MIT license text are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). This project is not affiliated with Wood's or the original author.

## Install for bench testing

1. First configure the RM4 Mini with Home Assistant's official [BroadLink integration](https://www.home-assistant.io/integrations/broadlink/). Verify that a `remote.***` entity exists.
2. In **HACS**, open the three-dot menu → **Custom repositories**. Add `https://github.com/Jocke1970/HA-Woods_Cortina_12k_Duo_IR` as category **Integration**.
3. Open the new Wood's Cortina IR repository in HACS; enable **Show beta versions** / pre-releases if necessary, and explicitly download the GitHub prerelease `2026.10.0b6`. Do **not** install the default `main` branch or use `dev`.
4. Restart Home Assistant. Go to **Settings → Devices & services → Add integration** and search for **Wood's Cortina IR**.
5. Choose BroadLink `remote.rm4_mini` and optionally a room-temperature sensor.
6. Begin with a **supervised** IR test (Cool / 22°C / Low fan). Compare the result with the original remote. Do not enable automations until the signal is validated.

There is no need for the upstream ESPHome firmware. Install **only GitHub beta releases through HACS**. This is not yet a production-ready controller.

## Implemented now

- Config flow to choose existing HA remote and optional room-temperature entity.
- `climate` entity: Off, Cool, **Heat (supervised beta)**, Dry, Fan only; setpoint 17–30°C; Low/Medium/High fan; Swing On/Off; Energy Saver preset in COOL.
- A Python 72-bit codec and BroadLink packet packing; power key uses a distinct IR frame.
- Optimistic/assumed state and last-send metadata; no fabricated compressor/IR-reception status.
- Unit tests against captured bytes documented in the source repository and packet invariants.
- Bundled JS card with temperature +/- (COOL/HEAT), operating modes, contextual power, **fan-speed icon controls (1/2/3)**, swing, and Energy Saver in COOL. Resource registration is manual; no separate JavaScript file copy or second HACS repository.

## Dashboard card

The top panel has COOL/HEAT/DRY/FAN buttons with clear mode icons and a **contextual power button**: if mains is off it powers the smartplug only, and if mains is on it starts/stops AC via IR. A secondary **Bryt huvudström** action is shown only when AC is reported off and is guarded by two-click confirmation, low measured power (≤15 W), and 60 seconds since the last IR request. It does not prove the compressor has stopped. Power / daily and monthly energy readings are now in the separate **Strömförbrukning** expander below **Fler inställningar**. The smartplug uses `switch.woods_cortina_silent_12k_duo` and sensors `sensor.woods_cortina_silent_12k_duo_power`, `sensor.woods_cortina_silent_12k_duo_energy_daily` and `sensor.woods_cortina_silent_12k_duo_energy_monthly` by default. You can override them as card properties. Mains off requires two taps and **must not be used to interrupt a running compressor**.

The JavaScript card is shipped inside the HACS integration and exposed at `/woods_cortina/woods-cortina-card.js`. Add this URL once in dashboard resources (type **JavaScript module**), then add a **Manual** card:

```yaml
type: custom:woods-cortina-card
entity: climate.wood_s_cortina_12k_duo
name: Wood's Cortina
```

Use the same permanent Lovelace resource URL across all releases—do **not** add version query parameters (`?v=...`). On an upgrade, reload the dashboard; only hard-refresh the browser if it still displays an older JS card. The narrow card layout and click feedback are improved. See [docs/UI.md](docs/UI.md) for full instructions. The card never treats the optimistic IR state as confirmed AC feedback, and does not expose Auto Clean, and makes HEAT available only for supervised beta trials.

## Not implemented / intentionally disabled

- **HEAT beta testing:** Original-remote HEAT POWER ON/OFF have been physically replayed successfully via RM4. Generated HEAT UI/HA transitions and additional fan speeds require supervised physical checks. No unattended heating/frost protection.
- Automatic room-temperature compensation, anti-short-cycle control, timers, sleep and auto clean in the HA UI.
- Reading Wood's *internal* room sensor (IR is send-only).
- Detecting changes made with the appliance's physical buttons or original remote.
- Built-in Wood's Cortina Lovelace JS card is included in the HACS integration. Add its dashboard resource once, as described in [docs/UI.md](docs/UI.md).
- Stable/main release until supervised testing is complete. The beta is distributed as a GitHub prerelease through HACS.

## Versioning (from next release)

Use calendar-based versions: `YYYY.MM.0bN`, with a numeric beta counter.
For example, the **current** beta in October 2026 is `2026.10.0b6`
(GitHub tag `v2026.10.0b6`), and the next would be `2026.10.0b7`.
For the first beta in a new month, restart from `b1`, e.g.
`2026.11.0b1`. Keep the `0` patch component and two-digit month.

Apply the same version consistently to `manifest.json`, the UI card's
displayed version, the GitHub tag and release notes, and the GitHub Actions
version assertion. Releases already tagged `v0.1.0b1` and `v0.1.0b2`
remain intact for HACS users; do not retroactively rewrite or retag them.
All future betas continue through **dev → beta → main**.

## Development workflow

`dev → beta → main`. No code will be merged to `main` until validated and reviewed. Run `python -m pytest -q` and `python -m compileall -q custom_components`.

See [docs/UI.md](docs/UI.md) for the bundled dashboard UI, [docs/IR_PROTOCOL.md](docs/IR_PROTOCOL.md) for the IR encoding, [docs/HEAT_CAPTURE.md](docs/HEAT_CAPTURE.md) for real remote captures and unresolved HEAT behavior, and [docs/TODO.md](docs/TODO.md) for the prioritized roadmap.
