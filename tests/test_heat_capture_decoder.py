"""BroadLink capture diagnosis: known frames, unknown HEAT-like mode, storage."""

import base64
import importlib.util
import json
import sys
from pathlib import Path

import pytest

from tools.inspect_broadlink_ir import (
    broadlink_to_durations, decode_woods_frame, describe, read_saved_codes,
)

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "woods_ir_codec_capture_fixture",
    ROOT / "custom_components" / "woods_cortina" / "ir_codec.py",
)
codec = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = codec
spec.loader.exec_module(codec)


def _packet_as_b64(frame):
    return base64.b64encode(
        codec.broadlink_packet(codec.ir_durations(frame))
    ).decode("ascii")


def test_decode_broadlink_generated_cool_22():
    frame = codec.encode_frame(codec.IRState(power=True, temperature=22))
    assert decode_woods_frame(broadlink_to_durations(_packet_as_b64(frame))) == frame


def test_decode_unrecognized_heat_like_mode_without_assuming_it_valid():
    frame = bytearray(codec.encode_frame(codec.IRState(power=True, temperature=22)))
    frame[6] = 0x15
    frame[8] = (frame[8] + 4) & 0xFF
    read = decode_woods_frame(broadlink_to_durations("b64:" + _packet_as_b64(frame)))
    assert read == bytes(frame)
    assert "UNKNOWN(4)" in describe(read)


def test_invalid_and_truncated_packet():
    with pytest.raises(ValueError):
        broadlink_to_durations("not-base64%")
    with pytest.raises(ValueError):
        broadlink_to_durations(base64.b64encode(b"\x26\x00\x02\x00\x00").decode())
    with pytest.raises(ValueError):
        decode_woods_frame([100, 500, 700])


def test_storage_selects_only_requested_device(tmp_path):
    path = tmp_path / "broadlink_remote_x_codes"
    path.write_text(json.dumps({
        "data": {
            "woods_heat_research": {
                "heat_22_low": "aa",
                "heat_23_low": ["bb", "cc"],
            },
            "other_appliance": {"secret": "do_not_print"},
        },
    }), encoding="utf-8")
    assert read_saved_codes(path, "woods_heat_research", ["heat_22_low"]) == {
        "heat_22_low": "aa"
    }
    assert read_saved_codes(path, "woods_heat_research", ["heat_23_low"]) == {
        "heat_23_low[1]": "bb", "heat_23_low[2]": "cc"
    }
    with pytest.raises(ValueError):
        read_saved_codes(path, "missing", [])
