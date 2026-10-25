# Wood's Cortina 12K Duo IR — v0.1.0b1

**First experimental beta — manual/supervised testing only**

- Initial native Home Assistant `climate` entity, controlled through an existing BroadLink `remote` entity.
- Dynamically generated 72-bit Wood's IR frames, wrapped as BroadLink `b64:` commands.
- Cool, Dry, Fan, low/medium/high fan, target 17–30°C, swing and energy saver preset.
- Optional external temperature sensor for **display only**; no automatic thermostat control.
- On/off state, target, and mode are assumed last requests, **not confirmed AC feedback**.
- Original IR research by **Anders**: [srednak/woods-protocol](https://github.com/srednak/woods-protocol), MIT (see `THIRD_PARTY_NOTICES.md`).

**Known limitations / stop conditions**

- Exact protocol compatibility with Wood's Cortina 12K **Duo** is unverified; the upstream remote's model is not identified.
- **HEAT disabled**: no reliable IR mapping yet.
- No unattended/automatic operation until live IR tests verify mode, temperature, power handling, and correct fail behavior.
- Use the HACS custom repository entry, enable beta/pre-release, and choose `v0.1.0b1`. Never download from `dev`.

**Initial test:** Select `remote.rm4_mini` as the transmitter. Start with Cool, 22°C, low fan. Verify the physical appliance responds correctly. Report any HA setup traceback or IR mismatch.
