# HEAT reverse engineering — Wood's Cortina 12K Duo

**HEAT is deliberately unavailable in the HA climate integration until
validated original-remote captures have been decoded and verified on the AC.**

## Reason for new captures

The MIT-licensed reference [srednak/woods-protocol](https://github.com/srednak/woods-protocol)
identifies COOL (mode 0), DRY (1), FAN (2), and ENERGY SAVER (3).
HEAT was not included in its source captures. A hypothetical fifth
mode might use B6 low nibble `0x5` (with low-fan `0x15`), but this is
**unverified**. Do not send guessed heat encodings to the appliance.

The Duo model supports heating, according to the manufacturer's specifications.
We can learn actual IR messages using the already-configured BroadLink RM4 Mini.

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
