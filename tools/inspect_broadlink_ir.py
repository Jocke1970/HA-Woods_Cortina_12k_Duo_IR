#!/usr/bin/env python3
"""Read-only decoder for Wood's 72-bit frames captured by a BroadLink RM4.

Never modifies Home Assistant .storage, sends IR, or infers unsupported modes.
Only decoded Wood's frames are printed; unrelated learned device codes are not.
"""

from __future__ import annotations

import argparse
import base64
import binascii
import json
from pathlib import Path

TICK_MICROSECONDS = 8192 / 269
MODE_NAMES = {0: "COOL", 1: "DRY", 2: "FAN", 3: "ENERGY_SAVER"}


def broadlink_to_durations(code: str) -> list[int]:
    """Decode BroadLink 0x26 IR packet to alternating pulse durations in us."""
    encoded = code.removeprefix("b64:")
    try:
        packet = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ValueError("Not valid Base64") from exc
    if len(packet) < 4 or packet[0] != 0x26:
        raise ValueError("Expected a BroadLink IR (0x26) packet")
    data_length = int.from_bytes(packet[2:4], "little")
    if len(packet) < data_length + 4:
        raise ValueError("Truncated BroadLink packet")
    data = packet[4:4 + data_length]
    durations = []
    i = 0
    while i < len(data):
        ticks = data[i]
        i += 1
        if ticks == 0:
            if i + 1 >= len(data):
                raise ValueError("Truncated long BroadLink pulse")
            ticks = int.from_bytes(data[i:i + 2], "big")
            i += 2
        durations.append(round(ticks * TICK_MICROSECONDS))
    return durations


def decode_woods_frame(durations: list[int]) -> bytes:
    """Extract one full 9-byte frame using mark/space timing tolerances.

    BroadLink IR receive timing is quantized; the space duration rather than
    the mark length is used to distinguish 0 from 1. Unknown formats fail
    closed instead of fabricating a decoded Wood's frame.
    """
    for leader in range(len(durations) - 2):
        if not (8500 <= durations[leader] <= 15500 and
                3000 <= durations[leader + 1] <= 7500):
            continue
        bits = []
        for bit_index in range(72):
            pos = leader + 2 + bit_index * 2
            if pos + 1 >= len(durations):
                break
            mark, space = durations[pos], durations[pos + 1]
            if not 250 <= mark <= 1050:
                break
            if 300 <= space <= 1100:
                bits.append(0)
            elif 1250 <= space <= 2850:
                bits.append(1)
            else:
                break
        if len(bits) != 72:
            continue
        frame = bytes(
            int("".join(map(str, bits[i:i + 8])), 2)
            for i in range(0, 72, 8)
        )
        if frame[0] == 0x55:
            return frame
    raise ValueError("No complete 72-bit Wood's frame found (retry learning)")


def read_saved_codes(storage: Path, device: str, commands: list[str]) -> dict[str, str]:
    """Read only one named device from HA BroadLink code storage."""
    content = json.loads(storage.read_text(encoding="utf-8"))
    data = content.get("data", {})
    if not isinstance(data, dict) or device not in data:
        raise ValueError(f"Device {device!r} not present in storage")
    saved = data[device]
    if not isinstance(saved, dict):
        raise ValueError("Unexpected HA BroadLink storage format")
    names = commands or sorted(saved)
    result = {}
    for name in names:
        if name not in saved:
            raise ValueError(f"Command {name!r} not present under {device!r}")
        value = saved[name]
        # HA 'alternative' learning stores a list of alternating codes.
        values = value if isinstance(value, list) else [value]
        for i, code in enumerate(values):
            if not isinstance(code, str):
                raise ValueError(f"Unexpected command type for {name!r}")
            result[name if len(values) == 1 else f"{name}[{i + 1}]"] = code
    return result


def describe(frame: bytes) -> str:
    temp = (frame[1] >> 4) + 16
    fan = ((frame[6] >> 4) & 0x07) - 1
    mode = (frame[6] & 0x0F) - 1
    mode_name = MODE_NAMES.get(mode, f"UNKNOWN({mode})")
    return (f"mode={mode_name}, temp={temp}C, fan_code={fan}, "
            f"power_bit={bool(frame[1] & 2)}, B8=0x{frame[8]:02X}")


def inspect_codes(codes: dict[str, str]) -> None:
    reference = None
    for name, code in codes.items():
        try:
            frame = decode_woods_frame(broadlink_to_durations(code))
        except ValueError as exc:
            print(f"{name}: DECODE ERROR: {exc}")
            continue
        print(f"{name}: {' '.join(f'{b:02X}' for b in frame)}")
        print(f"  {describe(frame)}")
        if reference is None:
            reference = (name, frame)
        else:
            changed = [f"B{i}: {a:02X}->{b:02X}" for i, (a, b)
                       in enumerate(zip(reference[1], frame)) if a != b]
            print(f"  vs {reference[0]}: {', '.join(changed) or 'identical'}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--storage", type=Path, help="HA .storage/broadlink_remote_*_codes file")
    source.add_argument("--code", help="One learned Base64 or b64: code")
    parser.add_argument("--device", help="Only this device name in storage")
    parser.add_argument("--command", action="append", default=[], help="Command to inspect; repeatable")
    args = parser.parse_args()
    if args.storage:
        if not args.device:
            parser.error("--device is required with --storage")
        codes = read_saved_codes(args.storage, args.device, args.command)
    else:
        codes = {"capture": args.code}
    inspect_codes(codes)


if __name__ == "__main__":
    main()
