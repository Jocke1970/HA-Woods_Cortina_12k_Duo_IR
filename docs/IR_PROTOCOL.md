# IR codec and RM4 Mini test plan

## Origin and limits

The 72-bit packet and timing rules are documented by **Anders** in [srednak/woods-protocol](https://github.com/srednak/woods-protocol) (MIT); see `THIRD_PARTY_NOTICES.md`. The author's captures are from a Wood's Cortina OEM remote, **not an explicitly identified Cortina 12K Duo WAC1201G**. They report 87 captured frames with successful source-side round trips. These have NOT yet been captured/reproduced on our hardware.

- Carrier: 38 kHz (RM4 hardware emits the carrier; payload encodes timings).
- Header: ~12014 microseconds mark, ~5105 microseconds space.
- Data: 9 bytes, MSB-first, 72 bits.
- 0: 534us mark / 533us space; 1: 614us mark / 1978us space.
- Trailer: final ~534us mark; no repeat.
- Bytes: B0=0x55; B1=temperature/power/swing; B2=timer; B3=temperature lookup; B4/B5=0; B6=fan/mode/sleep; B7=power key / clean; B8=checksum.
- Current mode map: Cool=0, Dehum=1, Fan=2, Energy Saver=3. **Heat is unknown**.

## BroadLink transport

The `ir_codec.py` adapter converts the 147 mark/space durations from the upstream encoder into a BroadLink-style `0x26` IR packet using approximately 32.84 microseconds per duration tick. Durations over 255 ticks are represented with 0x00 and two big-endian duration bytes; the IR termination gap is represented by 0x00,0x0d,0x05. The packet starts `0x26,0x00` followed by the payload byte count as a 16-bit little-endian integer. The packet is Base64 encoded and sent with the `b64:` prefix through HA `remote.send_command`.

BroadLink transport format reference: https://github.com/mjg59/python-broadlink/blob/master/protocol.md and the `pulses_to_data` implementation in `broadlink/remote.py`.

## Validation sequence

1. Confirm `remote.*` in HA and verify learning a safe original remote command.
2. Capture the original Wood's remote at Cool 22°C Low, and confirm whether the raw packet or payload corresponds to `55 62 00 0D 00 00 11 80 55`.
3. Test generated Cool 22°C Low. Confirm visible appliance response.
4. Test explicit Power On/Off **individually**, carefully, and verify no unintended toggle.
5. Test 21°C→22°C with different fan speeds, then Cool/Dry/Fan only, Swing, Energy Saver.
6. Capture and inspect **Heat** on the original remote separately. Do **not** attempt generated heat signals until confirmed.
7. Test external room sensor display and sensor becoming unavailable. Consider automations only after reliability and state-reconciliation strategy are assessed.

The two available reference captured frames in source repo are:
- Cool 22°C Low (normal): `55 62 00 0D 00 00 11 80 55`
- Cool 22°C Low (dedicated Power On): `55 62 00 0D 00 00 11 88 5D`

These examples are **source-derived fixtures, not validation of the user's unit**.

## Safety and behavior

An IR transmission has no delivery acknowledgement. If a user changes the appliance manually, HA may be out of sync. `hvac_action` is intentionally unset. Do not use this experimental integration for unattended frost protection or safety-critical control. The AC's own internal thermostat and protection mechanisms must remain authoritative.
