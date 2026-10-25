"""Wood's Cortina IR encoder, adapted from Anders' MIT-licensed woods-protocol.

Original research and encoder: https://github.com/srednak/woods-protocol
Copyright (c) 2026 Anders — MIT; see THIRD_PARTY_NOTICES.md.

BroadLink IR packet wrapper follows the public python-broadlink protocol.
No heating mode encoding is known. Do not guess a HEAT mode number.
"""

from __future__ import annotations

from base64 import b64encode
from dataclasses import dataclass

# Temperature lookup and checksum basis are derived from the original project.
BYTE3 = (0x04, 0x05, 0x07, 0x09, 0x0B, 0x0D, 0x0E,
         0x10, 0x12, 0x14, 0x16, 0x17, 0x19, 0x1B)
CHK_BASE = (0x7C, 0x0D, 0x1F, 0x31, 0x03, 0x15, 0x26,
            0x38, 0x4A, 0x5C, 0x6E, 0x7F, 0x51, 0x63)


@dataclass(frozen=True)
class IRState:
    """Requested, not measured, AC state."""

    power: bool = False
    mode: int = 0  # 0 Cool, 1 Dry, 2 Fan, 3 Energy Saver
    temperature: int = 22
    fan: int = 0  # 0 Low, 1 Medium, 2 High
    swing: bool = False
    sleep: bool = False
    auto_clean: bool = False


def _baseline(temp: int) -> int:
    """Calculate base B8 for Cool + Low fan (ported from upstream)."""
    base = CHK_BASE[temp - 17]
    if base in (0x0D, 0x1F, 0x31, 0x0C, 0x1C):
        return base
    if base == 0x7F and temp == 28:
        return (base + 0x40) & 0xFF
    if base >= 0x7C or base in (0x51, 0x63):
        return (base + 0x80) & 0xFF
    return (base + 0x40) & 0xFF


def encode_frame(state: IRState, *, power_command: bool = False) -> bytes:
    """Encode a complete 9-byte AC state; not a one-button delta."""
    temp, mode, fan = state.temperature, state.mode, state.fan
    if temp not in range(17, 31):
        raise ValueError("Temperature must be 17..30°C")
    if mode not in range(4):
        raise ValueError("Unsupported mode; heating is not implemented")
    if fan not in range(3):
        raise ValueError("Fan must be Low, Medium, or High")

    b1 = ((temp - 16) << 4) | (0x02 if state.power else 0)
    if state.swing:
        b1 |= 0x01
    b6 = ((fan + 1) << 4) | (mode + 1)
    if state.sleep and not power_command:
        b6 |= 0x80
    b7 = 0x88 if power_command else 0x80
    if state.auto_clean:
        b7 |= 0x04
    b8 = _baseline(temp) + (fan << 4) + mode
    if power_command:
        b8 += 8 if state.power else 6
    elif state.sleep:
        b8 += 0x80
    if state.auto_clean:
        b8 += 4
    if state.swing:
        b8 += 1
    return bytes((
        0x55, b1, 0x00, BYTE3[temp - 17], 0, 0, b6, b7, b8 & 0xFF
    ))


def ir_durations(frame: bytes) -> list[int]:
    """Return positive mark/space microsecond durations (147 elements)."""
    if len(frame) != 9:
        raise ValueError("Expected a 9-byte IR frame")
    durations = [12014, 5105]
    for byte in frame:
        for shift in range(7, -1, -1):
            durations.extend((614, 1978) if byte & (1 << shift) else (534, 533))
    durations.append(534)
    return durations


def broadlink_packet(durations: list[int]) -> bytes:
    """Pack raw microsecond durations into BroadLink's 0x26 IR packet."""
    data = bytearray()
    for value in durations:
        if value <= 0:
            raise ValueError("Each mark or space must be positive")
        ticks = max(1, int(value // 32.84))
        if ticks < 256:
            data.append(ticks)
        elif ticks <= 0xFFFF:
            data.extend((0, ticks >> 8, ticks & 0xFF))
        else:
            raise ValueError("Duration too long for BroadLink")
    # Captured BroadLink IR transmissions normally include a ~102ms end gap.
    data.extend((0x00, 0x0D, 0x05))
    if len(data) > 0xFFFF:
        raise ValueError("BroadLink payload too large")
    return b"\x26\x00" + len(data).to_bytes(2, "little") + bytes(data)


def broadlink_command(state: IRState, *, power_command: bool = False) -> str:
    """Return b64: command for HA's remote.send_command."""
    packet = broadlink_packet(ir_durations(encode_frame(
        state, power_command=power_command
    )))
    return "b64:" + b64encode(packet).decode("ascii")
