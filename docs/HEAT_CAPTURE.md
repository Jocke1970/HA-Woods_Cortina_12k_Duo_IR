# HEAT reverse engineering — Wood's Cortina 12K Duo

**Current result:** The original-remote HEAT POWER OFF and ON commands
were both successfully replayed through RM4 Mini on the physical Wood's Duo
(user-confirmed). The encoder matches all captured HEAT frames.
HEAT can now enter **supervised beta 2026.10.0b6**; the historical
recording instructions below remain for reference.

## Reason for new captures

The MIT-licensed reference [srednak/woods-protocol](https://github.com/srednak/woods-protocol)
identifies COOL (mode 0), DRY (1), FAN (2), and ENERGY SAVER (3).
HEAT was not included in its source captures. A hypothetical fifth
mode might use B6 low nibble `0x5` (with low-fan `0x15`), but this is
**unverified**. Do not send guessed heat encodings to the appliance.

The Duo model supports heating, according to the manufacturer's specifications.
We can learn actual IR messages using the already-configured BroadLink RM4 Mini.

## Next supervised test: original HEAT POWER OFF / POWER ON captures

**Status:** Mode selection into HEAT (B6=`0x10`, B7=`0x84`, B8=`0x58` at
22°C) is strongly supported by real remote captures. The separate power
key has not yet been observed in HEAT. The current `climate` entity **must
not** enable `HVACMode.HEAT` without validating power transitions.

The BroadLink receiver is `remote.rm4_mini`. Keep the smartplug mains
**ON** throughout these tests; do not cut physical power as part of this
capture. Supervise the AC and let any built-in compressor protection or
shutdown routine finish normally.

### Capture A — HEAT power OFF

1. Use the *original Wood's remote* to select HEAT, 22°C, LOW. Ensure the
   **physical AC is ON**, not merely the remote's LCD icon.
2. In Home Assistant **Developer tools → Actions**, prepare:
   ```yaml
   action: remote.learn_command
   target:
     entity_id: remote.rm4_mini
   data:
     device: woods_heat_research
     command: heat_power_off
     command_type: ir
   ```
3. Start learning. Aim the original remote at RM4 Mini and press the
   original remote's **POWER** button exactly once to stop the AC.
4. Check the AC's own display/power state. If unsure, note the result
   instead of repeatedly toggling power.

### Capture B — HEAT power ON

1. Confirm the physical AC is now OFF **but mains remains ON**. The
   original remote must still be configured for HEAT, 22°C, LOW.
2. Run the same `remote.learn_command`, this time with:
   ```yaml
   action: remote.learn_command
   target:
     entity_id: remote.rm4_mini
   data:
     device: woods_heat_research
     command: heat_power_on
     command_type: ir
   ```
3. Press POWER exactly once on the original remote. Confirm the AC
   acknowledges the new ON state. Heating output/compressor may be
   delayed by its normal protection controls.

Optional later capture: `heat_22_medium` from a physical HEAT session.
Do not change fan speed while either power recording is in progress.

### Retrieve results

Read, but **never edit**:
`/config/.storage/broadlink_remote_a8ddec125fc3_codes`

Copy only `data.woods_heat_research.heat_power_off` and
`data.woods_heat_research.heat_power_on` Base64 strings, and report
whether each physical power transition occurred. Do not share the whole
storage file.

### Offline verification gate

Decode both with `tools/inspect_broadlink_ir.py`, compare to recorded
HEAT mode frame, inspect B1/B6/B7/B8 and cross-check the upstream
`power_command` encoding. Check whether power is a toggle rather than
an absolute ON/OFF command. Before any production change, assess
how the one-way IR state can disagree after someone uses the original
remote or a Home Assistant restart.

Only after this will we add a **capture-backed**, supervised HEAT
implementation on `dev`, test it on the physical AC and release the
next HACS beta (`dev → beta → main`). Until then the installed
`2026.10.0b5` stays unchanged.

---

## Record with the original Wood's remote

In Home Assistant **Developer tools → Actions**, use the existing transmitter
`remote.rm4_mini`:

```yaml
action: remote.learn_command
target:
  entity_id: remote.rm4_mini
data:
  device: woods_heat_research
  command: heat_22_low
  command_type: ir
```

Prepare the **original** remote before each recording so the **button press
produces the desired final remote state**. Learn these named captures:

| Command to learn | Intended final remote state |
|---|---|
| `cool_22_low` | COOL, 22 °C, LOW fan (reference) |
| `heat_22_low` | HEAT, 22 °C, LOW fan |
| `heat_23_low` | HEAT, 23 °C, LOW fan |
| `heat_22_medium` | HEAT, 22 °C, MEDIUM fan |

If switching modes does not preserve temperature/fan, adjust the original
remote first. It is okay to capture repeated commands with different temporary
names; label the **final** state precisely. Record a HEAT OFF/ON power-key
capture separately later, because B7 and B8 differ for power actions.

Only the **original** remote is used for learning; do not transmit a generated
HEAT code. Aim the original remote at the RM4 and away from the AC while
recording when possible.

**Important:** The remote transmits an IR frame for the button press, which
is usually a full state; capture the final state, not merely the button name.

## Find the recordings

HA saves codes under:
`/config/.storage/broadlink_remote_<MACADDRESS>_codes`

This is a JSON file; **read it, do not edit it**. Under
`data.woods_heat_research`, each command maps to a Base64 string.
Only share that device's four Base64 values, not the full storage file
(which may contain codes for other devices).

The optional developer-side script (not part of the HACS integration) decodes
the nine IR bytes without sending any command:

```sh
python3 tools/inspect_broadlink_ir.py \
  --storage /path/to/broadlink_remote_MACADDRESS_codes \
  --device woods_heat_research
```

Alternatively:

```sh
python3 tools/inspect_broadlink_ir.py --code 'b64:...'
```

The script compares each byte against the first captured frame and marks
unknown mode codes explicitly. A bad/incomplete IR capture is rejected.

## How we will establish HEAT

1. Compare COOL 22 LOW ↔ HEAT 22 LOW (identify mode bits/checksum).
2. Compare HEAT 22 LOW ↔ HEAT 23 LOW (check temperature mapping).
3. Compare HEAT 22 LOW ↔ HEAT 22 MEDIUM (fan encoding).
4. Repeat at least one capture to check consistency; test reconstructed
   frames against actual recordings and only then add `HVACMode.HEAT` to
   `climate.py`.
5. Test generated HEAT manually, followed by careful power transitions.
   **No unattended heating automations** until the state machine is verified.

A successful packet decoder run is not by itself proof the AC accepts the
reconstructed HEAT command.

## Analysis of first real RM4 captures (25 October 2026)

The first three learned commands were provided from the real Wood's remote:

| Label in Home Assistant | Decoded frame (B0…B8) |
|---|---|
| `woods_cortina.cool_22_low` | `55 62 00 0D 00 00 10 84 58` |
| `woods_heat_research.heat_22_low` | `55 62 00 0D 00 00 10 84 58` |
| `woods_heat_research.heat_23_low` | `55 72 00 0E 00 00 10 84 69` |

**Crucial:** The labeled COOL and HEAT captures at 22°C are bit-for-bit identical. These recordings **do not yet establish** the HEAT mode code. The only bytes changed when the target changed from 22 to 23°C are B1 (setpoint), B3 (secondary temperature), and B8 (checksum), exactly as expected from the known algorithm.

Both types of labeled capture used **B6=`0x10`**, with low nibble `0` (not identified by the upstream mode map). The previously verified *generated* COOL 22°C frame is `55 62 00 0D 00 00 11 80 55`. B7=`0x84` in the newly learned frames sets bit 2, called the *auto-clean* flag by the original reverse engineering. This combination could reflect a previously unclassified mode or a capture/remote-state mismatch. Do not assume HEAT=`0x10` yet, and do not auto-enable HEAT in HA.

### Follow-up capture: MODE press, not temperature up

The next experiment should capture the **mode selection button** itself. On the original LCD remote, navigate to the mode immediately **before** the intended final mode, start `remote.learn_command`, then press **MODE exactly once** and verify the remote LCD now shows the intended mode. Capture at least:

- `woods_heat_research.cool_mode_22` — MODE press **into COOL**, setpoint 22°C, low fan.
- `woods_heat_research.heat_mode_22` — MODE press **into HEAT**, setpoint 22°C, low fan.

Ensure the original remote display actually shows COOL or HEAT **after the press**. If uncertain, also record which mode symbol the physical AC indicates after an original remote transmission (subject to normal compressor protection; heat output need not start immediately).

The two **MODE-transition frames** should expose the real distinction if the mode is encoded per command. A repeated HEAT 22°C temperature-button capture after explicitly selecting HEAT is then useful for confirmation. Keep the AC out of unattended heating until decoded frame + live response are verified.

### BroadLink timing note (separate issue)

The `b64:` packet samples use BroadLink `0x26` format. The codec's current transmit tick divisor `32.84` differs from the physical `~30.45 μs/tick` discussed in python-broadlink's protocol documentation and issue #839. The current generated COOL commands have already been observed to work despite this; do not silently change production TX timing during HEAT discovery. Revisit as a separate supervised regression test before future beta.

### Additional MODE capture (25 October 2026)

Original-remote recording labeled `heat_mode_22` decoded to
`55 72 00 0E 00 00 10 84 69`: exactly the **23°C** frame from
`heat_23_low`, not a 22°C frame. It is a fresh IR sample with different
pulse timings but the same 72 payload bits.

**Status:** We have yet to observe any changed *mode* byte across the
labeled COOL and HEAT recordings. B6=`0x10` and B7=`0x84` in all four.
B7 bit 2 is described as auto-clean in the upstream codec. This raises
questions about remote state or model variant; do not assume this is
intentional auto-clean use.

**Next verification:** Inspect the original remote LCD **after** the MODE
press and also confirm the numeric setpoint. The user should capture two
fresh transitions *into* COOL and *into* HEAT, naming each only after
visually confirming the final mode. If results remain ambiguous, capture
all five mode transitions sequentially with their displayed mode labels.

The Duo manual lists five modes including HEAT. No generated HEAT
transmission is authorized by these captures.

## Verified adjacent DRY → HEAT captures (25 October 2026)

The original-remote mode button was captured in sequence, with the final
modes labeled by the owner:

| Button result | Raw nine bytes | Notes |
|---|---|---|
| Into DRY (`dry_mode`) | `55 82 00 10 00 00 12 84 7D` | B6 low nibble `2` = known DRY; frame has 24°C encoded |
| Into HEAT (`heat_from_dry`) | `55 62 00 0D 00 00 10 84 58` | B6 low nibble `0`, previously unmapped; frame has 22°C encoded |

These signals give **strong evidence that HEAT is mode=-1 with B6
low nibble 0**, rather than the earlier speculative `0x15` / mode=4.
They are **not** sufficient for an on-device generated-HEAT test yet,
because a previously learned item named COOL 22 also had B6=`0x10`.
We must capture the **real transition into COOL**, confirmed on
the remote LCD, to disambiguate the label mismatch.

Checksum consistency also supports this mapping:
- COOL baseline at 24°C = `0x78`; DRY `+1` and B7 bit2 `+4` → `0x7D`.
- COOL baseline at 22°C = `0x55`; candidate HEAT `-1` and B7 bit2
  `+4` → `0x58`.
- COOL baseline at 23°C = `0x66`; candidate HEAT `-1` and B7 bit2
  `+4` → `0x69` (earlier HEAT 23°C capture).

The temperature field changed from 24°C to 22°C when transitioning
DRY → HEAT. It may be mode-specific setpoint memory or a different remote
behavior; avoid assuming the stored target persists across mode changes.
B7 bit2 (upstream called auto-clean) was ON in both new frames, so it
is not sufficient to distinguish the modes.

**Next capture:** on original remote, navigate to the mode immediately
preceding COOL; use `remote.learn_command` on `remote.rm4_mini` with
device `woods_heat_research`, command `cool_mode_verified`. Press
MODE **one time** and inspect the LCD: it must show COOL. Decode and
compare this frame to the DRY and HEAT frames above.

The climate entity **must not offer or send HEAT until its generated
frames and power-on/power-off transitions have been hardware-validated**.

## Verified COOL and ambiguous Auto Clean capture (25 October 2026)

Two additional real Wood's original-remote RM4 recordings were supplied:

| Label | Complete 9-byte frame | Interpretation |
|---|---|---|
| `cool_mode_verified` | `55 62 00 0D 00 00 11 80 55` | Confirmed transition into COOL, 22°C, low fan. **Exact match with original reverse-engineering and our generated COOL fixture.** |
| `auto_clean` | `55 62 00 0D 00 00 10 84 58` | Identical to earlier transition into HEAT, 22°C; **not independent proof of the Auto Clean command** |

### What these samples prove, and what they do not

- COOL and HEAT transition captures are different, namely COOL B6/B7/B8 = `11 80 55` vs HEAT `10 84 58` at 22°C/low fan.
- The most plausible candidate for HEAT has the low nibble of B6 set to zero, i.e. inferred internal mode value **−1**, with an observed B7 bit 2 set. The B8 delta (+3 from COOL) matches **−1 mode plus +4 bit-2 feature**.
- **Crucial ambiguity:** B7 bit 2 is called *Auto Clean* by the upstream non-HEAT decoder. We cannot tell from these captures whether HEAT requires that flag, if Auto Clean is latched in the original remote, or if the user captured Auto Clean while already in HEAT.
- The `auto_clean` recording has **exactly the same nine bytes** as `heat_from_dry`; therefore a separate Auto Clean action is **not yet isolated or validated**.
- The genuine *Cortina Duo 12K* manual states that Auto Clean runs an internal cleaning cycle for about three minutes **before shutdown**. We must treat it as a special action, not as a simple persistent HVAC mode. Source: https://www.manualslib.com/manual/2692183/Wood-S-Ac-Cortina-Duo-12k.html?page=16

### Next captures / safe supervised validation

1. Clarify: **which mode** was displayed on the original remote when the `auto_clean` IR signal was learned, and did the AC itself start an internal cleaning cycle?
2. If the user wants Auto Clean: capture the original **AUTO CLEAN press while already in verified COOL 22°C**, with the previous remote mode/display noted; distinguish the frame from normal COOL. Avoid repeatedly triggering the physical AC just for diagnosis; this starts a cleaning/shutdown cycle.
3. For HEAT, capture at least a **power key press in HEAT** and ideally HEAT 22°C at another fan speed before implementing turn-on/off transitions.
4. Test synthetic frames manually only after those controls are understood. In the meantime **keep HEAT out of climate.py** and maintain the installed beta unchanged.

### Experimental codec expectation (research only)

If we take the established COOL frame `55 62 00 0D 00 00 11 80 55`
and apply the recorded differences, we get the observed HEAT candidate
`55 62 00 0D 00 00 10 84 58`. At 23°C, the same delta applied to the
known COOL baseline predicts `55 72 00 0E 00 00 10 84 69`, already
observed in the earlier real HEAT 23°C capture.

**These are observations / offline tests only. We have not sent generated HEAT from the HA integration.**

## Deferred: user-observed AUTO CLEAN icon

During the `auto_clean` learning operation, the user observed the Auto Clean
**icon lighting up on the original remote display**, but did **not** observe
a clear special action on the appliance. The recording decoded identically
to the recorded HEAT 22°C frame.

Interpretation is **unresolved**. An illuminated remote icon does not
prove that an Auto Clean cycle started on the physical AC. We will **not**
investigate further in the current HEAT milestone; Auto Clean and timer
functions are explicitly postponed to the backlog, along with Sleep and
other nonessential extras.

See `docs/TODO.md`.


## Captured HEAT power verification (25 October 2026)

Both new power captures decode as exact 72-bit original Wood's frames:

| Recorded action | Original-remote frame |
|---|---|
| HEAT POWER OFF, 22 °C, LOW | `55 60 00 0D 00 00 10 88 5A` |
| HEAT POWER ON, 22 °C, LOW | `55 62 00 0D 00 00 10 88 5C` |
| HEAT state change, 22 °C, LOW | `55 62 00 0D 00 00 10 84 58` |
| HEAT state change, 23 °C, LOW | `55 72 00 0E 00 00 10 84 69` |

The `dev` encoder now reproduces **all four frames byte-for-byte**.
The POWER OFF/ON difference is B1 `0x60`→`0x62` and B8
`0x5A`→`0x5C`; B7 is `0x88` in both. A normal HEAT state frame
instead has B7=`0x84`, including bit `0x04`. That bit is still
semantically ambiguous (upstream names it Auto Clean) and is not
presented as an independent Auto Clean action.

### Required physical RM4 replay before beta

Keep smartplug mains **ON** throughout, supervise the AC and respect
compressor restart delays. No direct `dev` installation is needed.

When the physical AC is running in **HEAT 22°C/LOW**, open
**Developer Tools → Actions** in Home Assistant:

```yaml
action: remote.send_command
target:
  entity_id: remote.rm4_mini
data:
  device: woods_heat_research
  command: heat_power_off
```

Confirm the *physical* appliance has switched OFF. Do not confuse HA's
last requested climate state with actual AC feedback.

After the AC has finished shutting down and sufficient time has
elapsed for a safe restart, send:

```yaml
action: remote.send_command
target:
  entity_id: remote.rm4_mini
data:
  device: woods_heat_research
  command: heat_power_on
```

Confirm physical ON and HEAT on its display; compressor/heater output
may be delayed by appliance protection. Report whether **both** actions
were accepted. If either fails, don't use unattended HEAT automation;
capture a second original-remote sample and investigate power semantics.

A successful decode or green GitHub CI alone is **not** physical
confirmation. Publish `2026.10.0b6` to HACS only after the physical
RM4 test passes; follow `dev → beta → main`.


## Physical HEAT replay confirmed — 26 October 2026

The user confirms that **both** of the learned commands
`woods_heat_research.heat_power_off` and
`woods_heat_research.heat_power_on` worked when replayed from
`remote.rm4_mini` and physically switched off/on the Wood's Cortina Duo.

This validates RM4 playback of the learned original-remote frames,
**not** yet the full generated Home Assistant HEAT state machine, every
setpoint/fan speed, or idempotent power handling after original-remote
changes. A supervised b6 HACS beta is appropriate; do not enable
unattended HEAT/frost-protection automations until the newly generated
path has been observed on the physical appliance.

## Subsequent integrated acceptance test (26 October 2026)

Following HACS beta `2026.10.0b6`, the owner reports successful
supervised trials of **all UI/climate controls and combinations**
on the actual Wood's Cortina Duo: modes including HEAT, setpoints,
fan speed and power. No observed failures were reported in the
tested scenarios.

Scope: manual user-reported validation of ordinary operation.
This is not independent appliance feedback, a prolonged soak test,
or proof that state restoration/desynchronization and unattended
automation are safe. The remaining planned work before `main` is
UI polish followed by CI and release acceptance checks.
