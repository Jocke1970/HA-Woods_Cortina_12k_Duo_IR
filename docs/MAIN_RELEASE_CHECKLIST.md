# Main promotion checklist — Wood's Cortina IR

**Current branch flow:** `dev → beta → main`. The owner accepted the
functionality of HACS beta `2026.10.0b6` on the real AC (2026-10-26),
including heating, mode and temperature changes, fan speeds and power.

## Release gate

- [x] HEAT POWER ON and OFF learned from original remote and replayed
  through RM4 Mini on the actual Wood's Duo.
- [x] Owner reports all climate and JS-card functions/combinations work
  in ordinary supervised use, including newly generated HEAT.
- [x] Latest b6 CI passed on `dev`, PR and `beta`.
- [x] First UI refinements in `dev`: header power icon and side-by-side room/target.
- [ ] Test new layout in narrow and wider dashboard cards, including
  both expansion panels, 4 HVAC mode icons and fan-speed icons.
- [x] Automated UI regressions verify relocated power control, separate
  switch/climate calls, state-dependent icon help and room/target markup.
- [ ] Publish UI beta `2026.10.0b8` via HACS (`dev → beta`) and get owner's acceptance of compact OFF state, long-press confirmation, brand icon and responsive room temperature.
- [ ] Before `main`, run a clean CI and review version, HACS metadata,
  bundled frontend resource, README and third-party notices.
- [ ] Promote the accepted beta commit via reviewed PR `beta → main`.
  Use the agreed calendar version for the stable release (e.g.
  `2026.10.0`, without `bN`, **if promoted in October 2026**).
  Final tag/release should match `manifest.json` and JS version;
  avoid retagging old betas. If the release month changes, update to
  the corresponding calendar month instead.

## Documented limitations, not main blockers

- IR is one-way: `climate` status is **assumed last request**.
  Original remote/AC panel input may desynchronize HA and appliance.
- Smartplug mains cut requires manual physical confirmation that
  the AC has fully stopped; current UI guards do not prove it.
- Auto Clean, timer, Sleep and external-temperature-driven automatic
  control remain on the backlog and are not part of initial main.
- Do not market this as a verified unattended frost/heating controller.
