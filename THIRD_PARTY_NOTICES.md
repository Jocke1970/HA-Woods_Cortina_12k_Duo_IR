# Third-party notices

## Wood's Cortina IR protocol research and encoder

Upstream: https://github.com/srednak/woods-protocol

Copyright (c) 2026 Anders

License: MIT

**Attribution:** The temperature tables, checksum rules, 72-bit frame structure, 38 kHz pulse timings, and dynamic frame encoding used in `custom_components/woods_cortina/ir_codec.py` are derived from the reverse-engineering work in `srednak/woods-protocol` (`woods_codec.py` and `woods_ir_codec.h`). Conversion of the resulting waveform into BroadLink packet bytes and Home Assistant integration logic are adaptations made for this repository.

The following is the original project's MIT license notice, retained here as required by that license.

---

MIT License

Copyright (c) 2026 Anders

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
