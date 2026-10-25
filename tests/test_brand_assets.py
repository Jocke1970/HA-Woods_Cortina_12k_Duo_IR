"""Validate Home Assistant native brand images with only the stdlib."""

from pathlib import Path
import struct
import zlib

ROOT = Path(__file__).resolve().parents[1] / "custom_components" / "woods_cortina" / "brand"


def _png_dimensions_and_data(path):
    content = path.read_bytes()
    assert content[:8] == b"\x89PNG\r\n\x1a\n"
    offset = 8
    dims = None
    compressed = bytearray()
    end_found = False
    while offset < len(content):
        size = struct.unpack(">I", content[offset : offset + 4])[0]
        chunk_type = content[offset + 4 : offset + 8]
        body = content[offset + 8 : offset + 8 + size]
        crc = struct.unpack(">I", content[offset + 8 + size : offset + 12 + size])[0]
        assert crc == zlib.crc32(chunk_type + body) & 0xFFFFFFFF
        if chunk_type == b"IHDR":
            dims = struct.unpack(">II", body[:8])
        elif chunk_type == b"IDAT":
            compressed.extend(body)
        elif chunk_type == b"IEND":
            end_found = True
            break
        offset += size + 12
    assert end_found
    assert compressed
    assert zlib.decompress(bytes(compressed))
    return dims


def test_ha_brand_icon_dimensions_and_integrity():
    assert _png_dimensions_and_data(ROOT / "icon.png") == (256, 256)
    assert _png_dimensions_and_data(ROOT / "icon@2x.png") == (512, 512)
