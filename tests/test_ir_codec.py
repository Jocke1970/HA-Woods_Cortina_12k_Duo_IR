"""Hardware-independent tests of the adapted IR codec."""

import importlib.util
import sys
from base64 import b64decode
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "custom_components" / "woods_cortina" / "ir_codec.py"
spec = importlib.util.spec_from_file_location("woods_ir_codec_standalone", PATH)
codec = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = codec
spec.loader.exec_module(codec)

IRState = codec.IRState
encode_frame = codec.encode_frame
ir_durations = codec.ir_durations
broadlink_command = codec.broadlink_command


def test_reference_22c_low_cool():
    # Upstream capture logs/cool_22_fan_low.csv.
    state = IRState(power=True, temperature=22)
    assert encode_frame(state).hex(" ").upper() == "55 62 00 0D 00 00 11 80 55"


def test_reference_power_on():
    # Upstream capture logs/cool_22_fan_low_power_on.csv.
    state = IRState(power=True, temperature=22)
    assert encode_frame(state, power_command=True).hex(" ").upper() == "55 62 00 0D 00 00 11 88 5D"


def test_temperature_and_fan_change_bytes():
    frame = encode_frame(IRState(power=True, temperature=23, fan=2))
    assert frame[0] == 0x55
    assert frame[1] >> 4 == 23 - 16
    assert frame[6] == 0x31


def test_broadlink_packet_envelope():
    raw = ir_durations(encode_frame(IRState(power=True)))
    assert len(raw) == 147
    cmd = broadlink_command(IRState(power=True))
    assert cmd.startswith("b64:")
    packet = b64decode(cmd[4:])
    assert packet[0:2] == b"\x26\x00"
    assert int.from_bytes(packet[2:4], "little") == len(packet) - 4
    assert packet[-3:] == b"\x00\x0d\x05"


def test_invalid_values():
    import pytest
    for invalid in (16, 31):
        with pytest.raises(ValueError):
            encode_frame(IRState(temperature=invalid))
    with pytest.raises(ValueError):
        encode_frame(IRState(mode=4))
    with pytest.raises(ValueError):
        encode_frame(IRState(fan=3))
