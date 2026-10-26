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
- [x] Captured original-remote HEAT POWER OFF/ON and decoded both frames.
- [x] **Physical RM4 replay:** learned HEAT OFF and ON both worked on
  the real AC (user-confirmed).
- [x] **Hardware acceptance of b6:** User reports all buttons/functions,
  mode combinations, temperature changes, fan speed changes and power
  controls in the integration/card functioning as intended on the actual
  AC (2026-10-26). This is manual user acceptance, not an instrumented
  or automated hardware test.
- [x] User reports successful HEAT fan-speed and setpoint changes through
  b6 controls; no additional raw per-speed IR capture was collected.
- [x] Implement captured HEAT state/power encoding, `HVACMode.HEAT`,
  HA climate restore of mode=-1, and radiator mode button in `dev`,
  with regression tests. B7 bit `0x04` remains ambiguous; no Auto Clean UI.
- [x] Supervised physical functional test: user reports HEAT accepted,
  setpoints, fan, power and mode switching all working in their setup.
- [ ] Continue monitoring for intermittent issues after normal restarts and
  independent original-remote use; HA IR state remains optimistic.
- [ ] Retain last COOL target when switching through FAN/DRY; do not send
  pointless temperature-only frames while in those modes. Verify actual
  remote/AC behavior before changing backend semantics.
- [ ] Regression-test basic COOL/DRY/FAN/OFF, restore behavior, and failure
  handling. No unattended automation while IR state is unconfirmed.
- [x] Review PR from `dev` to `beta` and release b6 only after green CI
  and physically confirmed learned-command replay.

## P1 — Better user experience (after core modes work)

- [x] Premium Lovelace JS card in the HACS integration; narrow-layout and click feedback fixes included in `2026.10.0b5`.
- [x] Hide/disable setpoint control in FAN and DRY **in the custom card**; retain the displayed last COOL target.
- [ ] Review backend `climate.set_temperature` behavior in FAN/DRY separately; the generic HA thermostat and direct service calls still accept changes while those modes are active.
- [ ] Consider optional external-temperature-aware *supervised* control.
  IR provides no actual appliance-state feedback, so plan failure/restart
  and anti-short-cycle handling before enabling automation.

- [x] UI and climate button functionality physically checked by user in
  their current HA dashboard; reported functioning as expected.
- [x] First UI finishing pass in `dev`: `mdi:power` in top-right
  header with dynamic Huvudström/AC hint, room temperature beside
  target; automated regression tests cover placement and service routing.
- [ ] Obtain user's visual approval on real narrow and wide HA dashboards;
  continue any further polish before `main`.
- [x] Keep permanent JS resource URL
  `/woods_cortina/woods-cortina-card.js` with no `?v=` suffix.
- [x] User supplied screenshots of compact OFF/confirmation and all active HVAC modes from b8 and approved final UI polish before main.
- [ ] Investigate state desynchronization when AC is switched with its original IR remote. User observed that UI/climate control worked after starting the physical AC with the remote; distinguish physical power state, power-button toggle semantics, and whether non-power IR frames are ignored while off.
- [ ] Capture original POWER on/off behavior before changing `_apply` or HA `turn_on`/`turn_off` semantics. The remote is one-way and `requested_power` is optimistic; avoid presenting a toggle as a guaranteed state-setting action.

- [x] Mode controls in hero, Fler inställningar above Strömförbrukning;
  MDI icons for four supported modes and icon-only fan speeds 1/2/3.
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
- HACS beta `2026.10.0b6` has user-confirmed functional acceptance
  of climate and JS controls including HEAT. IR state desynchronization,
  HA restart/recovery and unattended operation remain separate limitations.
- Keep Auto Clean investigations on `dev` pending separate physical tests.
  Do not promote to `main` until UI acceptance, CI and release checklist
  are satisfied. No new extra features are required for initial main.

See [HEAT_CAPTURE.md](HEAT_CAPTURE.md) for decoded user captures and protocol
hypotheses.

- [x] New b8 UI: compact standby tile, hidden controls/expanders when
  AC reports OFF; label `RUM` beside the target; no `KLIMATKONTROLL · IR`.
- [x] New b8 guarded mains-off UX: hold top-right power for 900 ms,
  confirm explicitly, or cancel; guards unchanged and long-hold never
  directly disconnects mains. Check on an actual touchscreen and mouse.
- [x] Approved custom AC + IR icon bundled as native HA local brand
  `icon.png` and `icon@2x.png`.

- [x] b9 UI: transient five-second HA success notices, preserved error display, accurate HEAT copy, shorter visible power label.
- [ ] Stable release `2026.10.0`: CI on all branches, main GitHub release and unchanged versionless resource URL.
