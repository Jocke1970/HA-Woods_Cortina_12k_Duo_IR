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
