# Development TODO — Wood's Cortina 12K Duo IR

Project workflow: **dev → beta → main**. Do not install `dev` directly;
test tagged GitHub beta prereleases through HACS. Do not push experimental
HEAT controls into `beta` before verifying their actual behavior on the AC.

## P0 — Finish the basic climate engine

- [x] RM4 Mini configured in HA as `remote.rm4_mini`.
- [x] Original remote's COOL command learned and replayed successfully.
- [x] Generated COOL target-temperature change physically confirmed on
  Wood's Cortina 12K Duo (from `climate.wood_s_cortina_12k_duo`).
- [x] Decode real original-remote MODE transitions into COOL, DRY, and HEAT.
- [x] Candidate HEAT frame found from real HEAT transition at 22°C:
  `55 62 00 0D 00 00 10 84 58`; at 23°C:
  `55 72 00 0E 00 00 10 84 69`.
- [ ] **Next capture:** learn `heat_power_off` then `heat_power_on` with
  the original remote in HEAT 22°C/LOW; compare real receiver frames in
  `docs/HEAT_CAPTURE.md`. Verify both physical transitions and identify
  toggle semantics before enabling HA HEAT. Keep smartplug mains ON
  during all captures; avoid rapid compressor cycling.
- [ ] Confirm HEAT at another fan speed and/or setpoint, preferably including
  a fresh transition showing HEAT on the original remote's LCD.
- [ ] Implement validated HEAT encoding and `HVACMode.HEAT` in `dev`,
  adding capture-based tests; isolate the ambiguous B7 `0x04` flag rather
  than calling it Auto Clean without independent validation.
- [ ] Supervised physical tests: HEAT command acceptance, setpoint changes,
  fan behavior, power transitions, and safe switching between COOL and HEAT.
- [ ] Retain last COOL target when switching through FAN/DRY; do not send
  pointless temperature-only frames while in those modes. Verify actual
  remote/AC behavior before changing backend semantics.
- [ ] Regression-test basic COOL/DRY/FAN/OFF, restore behavior, and failure
  handling. No unattended automation while IR state is unconfirmed.
- [ ] Review PR from `dev` to `beta` with green CI and user hardware
  results, then release a HACS-installable prerelease.

## P1 — Better user experience (after core modes work)

- [x] Premium Lovelace JS card in the HACS integration; narrow-layout and click feedback fixes included in `2026.10.0b5`.
- [x] Hide/disable setpoint control in FAN and DRY **in the custom card**; retain the displayed last COOL target.
- [ ] Review backend `climate.set_temperature` behavior in FAN/DRY separately; the generic HA thermostat and direct service calls still accept changes while those modes are active.
- [ ] Consider optional external-temperature-aware *supervised* control.
  IR provides no actual appliance-state feedback, so plan failure/restart
  and anti-short-cycle handling before enabling automation.

- [ ] Visually verify the responsive UI and the climate service click flow on a real Home Assistant dashboard at narrow and wide widths. Browser editor mode may intercept clicks.
- [ ] Confirm HACS resource reload with the permanent URL `/woods_cortina/woods-cortina-card.js` (no `?v=` suffix).
- [ ] Investigate state desynchronization when AC is switched with its original IR remote. User observed that UI/climate control worked after starting the physical AC with the remote; distinguish physical power state, power-button toggle semantics, and whether non-power IR frames are ignored while off.
- [ ] Capture original POWER on/off behavior before changing `_apply` or HA `turn_on`/`turn_off` semantics. The remote is one-way and `requested_power` is optimistic; avoid presenting a toggle as a guaranteed state-setting action.

- [x] Put mode buttons and contextual power control in hero; expanders ordered **Fler inställningar** above **Strömförbrukning**; MDI icons for all three supported modes.
- [x] Restrict mains power-off to climate OFF + valid measured power ≤15 W + at least 60 seconds since last IR request + confirmation within 15 seconds; avoid any automatic switch/IR chaining.
- [ ] Confirm with physical hardware that status mismatch caused by original remote is handled explicitly; these safety gates cannot guarantee compressor state.
- [ ] Physical test of switch and energy entities in the user's HA; verify units, unavailable states, and safe power-down sequence. Do not automate switching off a running compressor.

## P2 — Deferred extras (not blocking basic HEAT/beta work)

- [ ] **Auto Clean:** separate special-action state/command not verified.
  Captured `auto_clean` gave the same nine bytes as HEAT 22°C. The icon
  lit on the *remote's display*, but no clear cleaning operation was
  observed on the physical appliance. Revisit with careful captures later.
- [ ] **Timer:** remote IR timer settings, cancellation, countdown/UI,
  and restoration behavior are not implemented.
- [ ] **Sleep:** capture semantics and interactions with mode and power.
- [ ] Review other optional extras only after basic heating, cooling, and
  power behavior are solid. Existing swing and energy-saver features should
  receive ordinary regression tests, not expanded features now.

## Known limitations

- IR is one-way. `requested_power`, target, and mode are assumed last
  requests, not appliance feedback.
- The HACS beta `2026.10.0b5` adds the bundled Lovelace card, without HEAT enabled.
- Keep any speculative HEAT and Auto Clean experimentation on `dev`
  until hardware-backed tests pass.

See [HEAT_CAPTURE.md](HEAT_CAPTURE.md) for decoded user captures and protocol
hypotheses.
