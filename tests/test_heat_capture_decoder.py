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


# User-provided original-remote RM4 learning results (2026-10-25).
# These are IR-only data, not the device MAC or the .storage JSON document.
# Each capture must decode to a stable complete 72-bit protocol frame.
ORIGINAL_CAPTURES = {
    "cool_22_low": (
        "JgCYAAABgqQREBQ+EQ8UPxEREz4RERM+ERAUPRU9EhEQEBEQFD4SEBAQEREREBERERAQEREQERAREREQEBEREBM/FD0SDxU9EREREBEREQ8REREQERAREREPEREREBEQERERDxEQEhAREREPEhAUPRIQEREQEBEQFD4REBERERARERM+ERAREBIQFD0REBQ+FD4SEBAREBERAA0F",
        "55 62 00 0D 00 00 10 84 58",
    ),
    "heat_22_low": (
        "JgCYAAABgaQSEBM/EBETPhEREz0SERM/ERAUPRQ9EhAREBIQFD4REBEREBEQEBERERAREREPEREQEREQERASEBQ9FD0SEBQ/EQ4SERAQEhAREREPERASDxIQERASDxEQEhAREREQERAREBEREBETPhERERARERAPFT4REBIPERAREBQ+EREREBEREz0SERM+FD4REREQEBEQAA0F",
        "55 62 00 0D 00 00 10 84 58",
    ),
    "heat_23_low": (
        "JgCYAAABgaQSEBM/EBAUPhEQFD0SERM+ERAUPhQ+Ez8QEBIQE0APEBIQEREREBEPEhAREBERERARDxIQERARERM+FD4UPhEQERAREBEQEg8SEBEQERAREBIQERASEBAQERASEBEQEg8RERAQEhETPhEQEREQERAREz4SEBARERAREBQ9EhARERAREz4UPhEQE0AQDxIQFD8QAA0F",
        "55 72 00 0E 00 00 10 84 69",
    ),
}


@pytest.mark.parametrize("label", ORIGINAL_CAPTURES)
def test_real_broadlink_capture_decoder(label):
    learned, expected = ORIGINAL_CAPTURES[label]
    raw = broadlink_to_durations(learned)
    frame = decode_woods_frame(raw)
    assert frame.hex(" ").upper() == expected
    assert frame[0] == 0x55
    assert frame[6] == 0x10  # Not mapped to a validated HVAC mode.
    assert frame[7] == 0x84  # Upstream auto-clean flag, interpretation unconfirmed.


def test_labeled_cool_and_heat_22_are_identical_important_non_finding():
    decoded = [decode_woods_frame(broadlink_to_durations(ORIGINAL_CAPTURES[k][0]))
               for k in ("cool_22_low", "heat_22_low", "heat_23_low")]
    assert decoded[0] == decoded[1]
    assert [(i, a, b) for i, (a, b) in enumerate(zip(decoded[1], decoded[2]))
            if a != b] == [(1, 0x62, 0x72), (3, 0x0D, 0x0E), (8, 0x58, 0x69)]
    assert "UNKNOWN(-1)" in describe(decoded[0])


# Fresh original-remote MODE-button recording labeled "heat_mode_22".
# Decodes to the same 23°C payload as "heat_23_low" — *not* a new heat mode.

def test_mode_button_capture_is_23c_and_has_no_mode_difference():
    mode_press = "JgCYAAABgaMREBQ/EQ8VPRIQFD4REBQ9EhATQBM9FD4REBEQFD4REBIQERARERERDxASEBEQEg8SDxERERARERM9FD8UPRIQEREREBEQEBEREBERERARDxIQEREQEREQERAREBEQEg8SERAREBAUPxEQEBEQEREREz0SEBEQEhAREBQ9EhAREREOFD8UPRIQEz4REREQFD8QAA0F"
    actual = decode_woods_frame(broadlink_to_durations(mode_press))
    earlier_23 = decode_woods_frame(
        broadlink_to_durations(ORIGINAL_CAPTURES["heat_23_low"][0])
    )
    assert actual == earlier_23
    assert actual.hex(" ").upper() == "55 72 00 0E 00 00 10 84 69"
    assert (actual[1] >> 4) + 16 == 23


# Original user-owned Wood's remote: consecutive MODE presses into DRY and HEAT.
# The labels were verified from the remote mode sequence, but hardware
# validation and an independently confirmed COOL transition are still pending.
TRANSITION_CAPTURES = {
    "dry_mode": ("JgCYAAABgKQREBQ+ERAUPxAQFD4SEBQ9FD0SEBERERARDxIQEz8RDxIQEREREBEREA8SERAQEhARERAQERETPxAREBEREBEQEhAQEREPEhEQEBIPERASEBERERARDxEREREQEREQEQ8SEBERERATPhERERAUPhEQEz8QEREQEREREBQ9EREREBAREz8UPRQ9FT4UPRIQEz4RAA0F", "55 82 00 10 00 00 12 84 7D"),
    "heat_from_dry": ("JgCYAAABgaUPEBQ/ERAUPhEQFD0SEBM+ERAUPxQ9Eg8SEBEPFT4REBIPEREQEBIQERASDxERERAREBEQEg8REBQ/Ez4REBQ+ERASEBEQEREQEBEQEhAREBIQEQ8REBIQERASEBAQEhARERAQEhETPhEQERAQEBIQFD4REBERERARERM+ERAREREQEz4RERM+E0AQERAQERASAA0F", "55 62 00 0D 00 00 10 84 58"),
}


@pytest.mark.parametrize("name", TRANSITION_CAPTURES)
def test_captured_mode_transitions_decode(name):
    learned, expected = TRANSITION_CAPTURES[name]
    decoded = decode_woods_frame(broadlink_to_durations(learned))
    assert decoded.hex(" ").upper() == expected


def test_heat_candidate_is_mode_nibble_zero_and_checksum_offset_minus_one():
    dry = decode_woods_frame(broadlink_to_durations(TRANSITION_CAPTURES["dry_mode"][0]))
    heat = decode_woods_frame(broadlink_to_durations(TRANSITION_CAPTURES["heat_from_dry"][0]))
    assert dry[6] == 0x12
    assert heat[6] == 0x10
    assert dry[7] == heat[7] == 0x84
    # B8 follows the upstream Cool baseline plus mode and the B7+4 feature:
    # 24°C baseline 0x78, DRY=+1, feature=+4
    # 22°C baseline 0x55, inferred HEAT=-1, feature=+4
    assert dry[8] == (0x78 + 1 + 4) & 0xFF
    assert heat[8] == (0x55 - 1 + 4) & 0xFF
    assert heat == decode_woods_frame(
        broadlink_to_durations(ORIGINAL_CAPTURES["heat_22_low"][0])
    )


# Further original-remote captures recorded on 2026-10-25.
ADDITIONAL_CAPTURE_SAMPLES = {
    "cool_mode_verified": ("JgCYAAABgqMSERM+ERAUPRIQEz8REBQ+ERETPhM/EBEREBEQFD4REBERERARERAPEhEQEBIQEREQEBEQEhARERM9FD8REBM+EhEQDxIQEREREBEQEg8RERAQEhAREREPEREREBEREBEQEBERERAUPhARERARERM+FD8QEBEREBERERAQEg8REREQEz8QERM/ERAUPRIQFD4RAA0F", "55 62 00 0D 00 00 11 80 55"),
    "auto_clean": ("JgCYAAABgKUQEBQ/EBAUPhIQFD4REBQ9ERAUPxM/ERAREBAREz8RDxIQERASDxIQEQ8SEBEQEhARERAPEhARERM+FT4QERM+EREREBEREBAREBEQEhAREBEQERASDxIREBAREBEQEhAREBIOEhETPhIPEREREBEREz4REBERERARDxU9EhAREBEPFD8REBQ+Ez4REREQERERAA0F", "55 62 00 0D 00 00 10 84 58"),
}


@pytest.mark.parametrize("name", ADDITIONAL_CAPTURE_SAMPLES)
def test_cool_transition_and_auto_clean_recordings_decode(name):
    learned, hex_frame = ADDITIONAL_CAPTURE_SAMPLES[name]
    decoded = decode_woods_frame(broadlink_to_durations(learned))
    assert decoded.hex(" ").upper() == hex_frame


def test_verified_cool_matches_generator_and_upstream_cool_22_fixture():
    decoded = decode_woods_frame(broadlink_to_durations(
        ADDITIONAL_CAPTURE_SAMPLES["cool_mode_verified"][0]))
    assert decoded == codec.encode_frame(codec.IRState(
        power=True, mode=0, temperature=22, fan=0, auto_clean=False))


def test_auto_clean_capture_does_not_isolate_feature():
    """Do not mislabel an identical HEAT capture as a new Auto Clean command."""
    decoded = decode_woods_frame(broadlink_to_durations(
        ADDITIONAL_CAPTURE_SAMPLES["auto_clean"][0]))
    recorded_heat = decode_woods_frame(broadlink_to_durations(
        TRANSITION_CAPTURES["heat_from_dry"][0]))
    assert decoded == recorded_heat
    assert decoded == bytes.fromhex("55 62 00 0D 00 00 10 84 58")


def test_heat_candidate_byte_deltas_match_original_22c_and_23c_captures():
    """Research-only hypothesis; production encoder does NOT permit HEAT."""
    for temp, expected in (
        (22, "55 62 00 0D 00 00 10 84 58"),
        (23, "55 72 00 0E 00 00 10 84 69"),
    ):
        cool_frame = bytearray(codec.encode_frame(codec.IRState(
            power=True, mode=0, temperature=temp, fan=0, auto_clean=False)))
        cool_frame[6] = 0x10
        cool_frame[7] |= 0x04
        cool_frame[8] = (cool_frame[8] - 1 + 4) & 0xFF
        assert cool_frame.hex(" ").upper() == expected
    # Non-research production encoder rejects the unsupported heat code.
    with pytest.raises(ValueError):
        codec.encode_frame(codec.IRState(power=True, mode=-1))
