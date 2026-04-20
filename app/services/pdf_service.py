from __future__ import annotations

import textwrap
from dataclasses import dataclass
from typing import Iterable


def _pdf_escape(text: str) -> str:
    return (
        text.replace("\\", "\\\\")
        .replace("(", "\\(")
        .replace(")", "\\)")
        .replace("\r", "")
    )


@dataclass(frozen=True)
class PdfPageSpec:
    width: int = 595  # A4 portrait
    height: int = 842
    margin: int = 50
    font_size: int = 12
    leading: int = 14
    max_chars: int = 95  # approx for Helvetica @ 12pt

    @property
    def max_lines(self) -> int:
        usable = self.height - 2 * self.margin
        return max(1, usable // self.leading)

    @property
    def start_y(self) -> int:
        return self.height - self.margin - self.font_size


@dataclass(frozen=True)
class PdfTextLine:
    text: str
    font_size: int = 12
    bold: bool = False
    align: str = "left"  # left|center
    indent: int = 0
    leading: int | None = None


def build_simple_pdf(lines: Iterable[str], *, spec: PdfPageSpec | None = None) -> bytes:
    """Generate a simple multi-page PDF containing wrapped text lines."""
    spec = spec or PdfPageSpec()

    wrapped: list[str] = []
    for line in lines:
        raw = "" if line is None else str(line)
        if not raw.strip():
            wrapped.append("")
            continue
        wrapped.extend(textwrap.wrap(raw, width=spec.max_chars, replace_whitespace=False, drop_whitespace=False))

    pages: list[list[str]] = []
    current: list[str] = []
    for line in wrapped:
        current.append(line)
        if len(current) >= spec.max_lines:
            pages.append(current)
            current = []
    if current:
        pages.append(current)

    objects: list[bytes] = []

    def add_obj(payload: bytes) -> int:
        objects.append(payload)
        return len(objects)

    # 1) Catalog (points to Pages obj #2)
    add_obj(b"<< /Type /Catalog /Pages 2 0 R >>")

    # 2) Pages (Kids filled later)
    kids_place_holder = b"__KIDS__"
    pages_obj_index = add_obj(b"<< /Type /Pages /Kids " + kids_place_holder + b" /Count __COUNT__ >>")

    # 5) Font (Helvetica)
    font_obj_index = None

    page_obj_indices: list[int] = []
    content_obj_indices: list[int] = []

    # Ensure font exists before pages reference it
    font_obj_index = add_obj(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")

    for page_lines in pages:
        content = _build_page_content(page_lines, spec)
        content_stream = b"<< /Length " + str(len(content)).encode("ascii") + b" >>\nstream\n" + content + b"\nendstream"
        content_obj = add_obj(content_stream)
        content_obj_indices.append(content_obj)

        page_dict = (
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 "
            + str(spec.width).encode("ascii")
            + b" "
            + str(spec.height).encode("ascii")
            + b"] /Resources << /Font << /F1 "
            + str(font_obj_index).encode("ascii")
            + b" 0 R >> >> /Contents "
            + str(content_obj).encode("ascii")
            + b" 0 R >>"
        )
        page_obj = add_obj(page_dict)
        page_obj_indices.append(page_obj)

    kids = b"[ " + b" ".join(f"{idx} 0 R".encode("ascii") for idx in page_obj_indices) + b" ]"
    pages_obj_payload = objects[pages_obj_index - 1]
    pages_obj_payload = pages_obj_payload.replace(kids_place_holder, kids)
    pages_obj_payload = pages_obj_payload.replace(b"__COUNT__", str(len(page_obj_indices)).encode("ascii"))
    objects[pages_obj_index - 1] = pages_obj_payload

    return _serialize_pdf(objects)


def build_text_pdf(lines: list[PdfTextLine], *, spec: PdfPageSpec | None = None) -> bytes:
    """Generate a multi-page PDF with basic per-line styling and centering."""
    spec = spec or PdfPageSpec()

    pages: list[list[PdfTextLine]] = []
    current: list[PdfTextLine] = []
    y = spec.height - spec.margin

    for line in lines:
        leading = int(line.leading or (line.font_size + 4))
        next_y = y - leading
        if next_y < spec.margin:
            if current:
                pages.append(current)
            current = []
            y = spec.height - spec.margin
            next_y = y - leading
        current.append(line)
        y = next_y

    if current:
        pages.append(current)

    objects: list[bytes] = []

    def add_obj(payload: bytes) -> int:
        objects.append(payload)
        return len(objects)

    add_obj(b"<< /Type /Catalog /Pages 2 0 R >>")

    kids_place_holder = b"__KIDS__"
    pages_obj_index = add_obj(b"<< /Type /Pages /Kids " + kids_place_holder + b" /Count __COUNT__ >>")

    font_regular = add_obj(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    font_bold = add_obj(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")

    page_obj_indices: list[int] = []

    for page_lines in pages:
        content = _build_positioned_page_content(page_lines, spec, font_regular_id=font_regular, font_bold_id=font_bold)
        content_stream = b"<< /Length " + str(len(content)).encode("ascii") + b" >>\nstream\n" + content + b"\nendstream"
        content_obj = add_obj(content_stream)

        page_dict = (
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 "
            + str(spec.width).encode("ascii")
            + b" "
            + str(spec.height).encode("ascii")
            + b"] /Resources << /Font << /F1 "
            + str(font_regular).encode("ascii")
            + b" 0 R /F2 "
            + str(font_bold).encode("ascii")
            + b" 0 R >> >> /Contents "
            + str(content_obj).encode("ascii")
            + b" 0 R >>"
        )
        page_obj = add_obj(page_dict)
        page_obj_indices.append(page_obj)

    kids = b"[ " + b" ".join(f"{idx} 0 R".encode("ascii") for idx in page_obj_indices) + b" ]"
    pages_obj_payload = objects[pages_obj_index - 1]
    pages_obj_payload = pages_obj_payload.replace(kids_place_holder, kids)
    pages_obj_payload = pages_obj_payload.replace(b"__COUNT__", str(len(page_obj_indices)).encode("ascii"))
    objects[pages_obj_index - 1] = pages_obj_payload

    return _serialize_pdf(objects)


def build_ai_report_pdf(report_text: str, *, spec: PdfPageSpec | None = None) -> bytes:
    """Generate a structured, readable PDF from an AI report text blob.

    Keeps output ASCII-only to avoid PDF base-font encoding surprises
    (e.g. emoji/bullets turning into '?').
    """

    spec = spec or PdfPageSpec(margin=50, font_size=11, leading=16, max_chars=102)

    def sanitize(text: str) -> str:
        if not isinstance(text, str):
            return ""

        replacements = {
            "\u2019": "'",
            "\u2018": "'",
            "\u201c": '"',
            "\u201d": '"',
            "\u2013": "-",
            "\u2014": "-",
            "\u2026": "...",
            "\u2022": "-",
            "\u00a0": " ",
            "â€™": "'",
            "â€˜": "'",
            "â€œ": '"',
            "â€\u009d": '"',
            "â€“": "-",
            "â€”": "-",
            "â€¦": "...",
            "â€¢": "-",
            "â‚¹": "INR",
            "Â": "",
        }
        for bad, good in replacements.items():
            text = text.replace(bad, good)

        text = "".join(ch if (32 <= ord(ch) < 127) or ch in {"\n", "\t"} else " " for ch in text)
        return "\n".join(line.rstrip() for line in text.splitlines())

    def max_chars_for(font_size: int, indent_points: int) -> int:
        base = max(20, int(spec.max_chars * (12 / max(1, int(font_size)))))
        indent_chars = int(indent_points / max(1.0, float(font_size) * 0.52))
        return max(20, base - indent_chars)

    def wrap_line(text: str, *, font_size: int, indent: int, hanging: bool = False) -> list[tuple[str, int]]:
        text = sanitize(text).strip()
        if not text:
            return [("", 0)]

        width = max_chars_for(font_size, indent)
        wrapped = textwrap.wrap(text, width=width, replace_whitespace=False, drop_whitespace=False)
        if not wrapped:
            return [("", 0)]
        if not hanging:
            return [(w, indent) for w in wrapped]

        out: list[tuple[str, int]] = []
        for i, w in enumerate(wrapped):
            out.append((w, indent if i == 0 else indent + 14))
        return out

    raw = sanitize(report_text or "")
    input_lines = [line.strip() for line in raw.splitlines()]

    first_non_empty = next((ln for ln in input_lines if ln), "")
    has_title = "VEDASTRO" in first_non_empty.upper() and "REPORT" in first_non_empty.upper()

    styled: list[PdfTextLine] = []

    def add_blank(height: int = 10) -> None:
        styled.append(PdfTextLine(text="", font_size=spec.font_size, leading=height))

    if has_title:
        styled.append(PdfTextLine(text=first_non_empty.upper(), font_size=18, bold=True, align="center", leading=28))
        add_blank(6)
        input_lines = input_lines[1:]

    for line in input_lines:
        if not line:
            add_blank(10)
            continue

        upper = line.upper()
        is_section = (
            (upper == line and len(line) <= 56 and any(c.isalpha() for c in line))
            or (line.endswith(":") and len(line) <= 38 and " " in line)
        )

        if is_section:
            label = line.rstrip(":").strip()
            add_blank(8)
            styled.append(PdfTextLine(text=label, font_size=13, bold=True, leading=20))
            add_blank(2)
            continue

        is_numbered = bool(len(line) >= 2 and line[0].isdigit() and line[1] in {".", ")"})
        is_bullet = line.startswith(("-", "*", "•")) or is_numbered

        if is_bullet:
            clean = line
            if clean.startswith(("•", "*")):
                clean = "- " + clean[1:].lstrip()
            for wrapped, indent in wrap_line(clean, font_size=11, indent=14, hanging=True):
                styled.append(PdfTextLine(text=wrapped, font_size=11, indent=indent, leading=16))
            continue

        for wrapped, indent in wrap_line(line, font_size=11, indent=0):
            styled.append(PdfTextLine(text=wrapped, font_size=11, indent=indent, leading=16))

    while styled and styled[-1].text == "":
        styled.pop()

    return build_text_pdf(styled, spec=spec)


def build_ai_report_pdf_pro(report_text: str, *, spec: PdfPageSpec | None = None) -> bytes:
    """Generate a professional, colored PDF from an AI report text blob.

    Adds a branded header, section chips, spacing, and visual "icons" drawn as shapes.
    Output is kept ASCII-only to avoid PDF base-font encoding surprises.
    """

    spec = spec or PdfPageSpec(margin=46, font_size=11, leading=16, max_chars=102)

    def sanitize(text: str) -> str:
        if not isinstance(text, str):
            return ""

        replacements = {
            "\u2019": "'",
            "\u2018": "'",
            "\u201c": '"',
            "\u201d": '"',
            "\u2013": "-",
            "\u2014": "-",
            "\u2026": "...",
            "\u2022": "-",
            "\u00a0": " ",
            "Ã¢â‚¬â„¢": "'",
            "Ã¢â‚¬Ëœ": "'",
            "Ã¢â‚¬Å“": '"',
            "Ã¢â‚¬\u009d": '"',
            "Ã¢â‚¬â€œ": "-",
            "Ã¢â‚¬â€": "-",
            "Ã¢â‚¬Â¦": "...",
            "Ã¢â‚¬Â¢": "-",
            "Ã¢â€šÂ¹": "INR",
            "Ã‚": "",
        }
        for bad, good in replacements.items():
            text = text.replace(bad, good)

        text = "".join(ch if (32 <= ord(ch) < 127) or ch in {"\n", "\t"} else " " for ch in text)
        return "\n".join(line.rstrip() for line in text.splitlines())

    def is_header(line: str) -> bool:
        line = (line or "").strip()
        if not line:
            return False
        upper = line.upper()
        if upper == line and len(line) <= 60 and any(c.isalpha() for c in line):
            return True
        if line.endswith(":") and len(line) <= 38 and " " in line:
            return True
        return False

    def wrap_to_width(text: str, *, font_size: int, max_width: float) -> list[str]:
        text = (text or "").strip()
        if not text:
            return [""]
        words = text.split()
        out: list[str] = []
        current = ""
        for word in words:
            candidate = word if not current else f"{current} {word}"
            if _estimate_text_width(candidate, font_size) <= max_width or not current:
                current = candidate
                continue
            out.append(current)
            current = word
        if current:
            out.append(current)
        return out

    raw = sanitize(report_text or "")
    lines = [ln.strip() for ln in raw.splitlines()]

    title = next((ln for ln in lines if ln), "VEDASTRO INSIGHTS REPORT")
    if "VEDASTRO" not in title.upper() or "REPORT" not in title.upper():
        title = "VEDASTRO INSIGHTS REPORT"

    sections: list[tuple[str, list[str]]] = []
    for ln in lines:
        if not ln:
            if sections:
                sections[-1][1].append("")
            continue
        if is_header(ln):
            header = ln.rstrip(":").strip().upper()
            if "VEDASTRO" in header and "REPORT" in header:
                title = header
                continue
            sections.append((header, []))
            continue
        if not sections:
            sections.append(("REPORT", []))
        sections[-1][1].append(ln)

    meta_name = ""
    meta_date = ""
    for s_title, s_lines in sections:
        if s_title == "PROFILE":
            for ln in s_lines:
                lower = ln.lower()
                if lower.startswith("name:"):
                    meta_name = ln.split(":", 1)[1].strip()
                if lower.startswith("date:"):
                    meta_date = ln.split(":", 1)[1].strip()
            break

    bg = (0.973, 0.980, 0.988)
    card = (1.0, 1.0, 1.0)
    border = (0.86, 0.89, 0.93)
    ink = (0.07, 0.10, 0.15)
    muted = (0.40, 0.45, 0.52)
    navy = (0.05, 0.08, 0.16)
    accent = (0.96, 0.73, 0.20)  # amber
    sky = (0.22, 0.74, 0.98)
    violet = (0.62, 0.40, 0.93)

    def section_color(name: str) -> tuple[float, float, float]:
        name = (name or "").upper()
        if "SCORE" in name or "INDEX" in name:
            return sky
        if "ENERGY" in name:
            return violet
        if "VERDICT" in name:
            return accent
        return accent

    objects: list[bytes] = []

    def add_obj(payload: bytes) -> int:
        objects.append(payload)
        return len(objects)

    add_obj(b"<< /Type /Catalog /Pages 2 0 R >>")
    kids_placeholder = b"__KIDS__"
    pages_obj_index = add_obj(b"<< /Type /Pages /Kids " + kids_placeholder + b" /Count __COUNT__ >>")
    font_regular = add_obj(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    font_bold = add_obj(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")

    page_obj_indices: list[int] = []

    def new_canvas() -> PdfCanvas:
        c = PdfCanvas(spec=spec, lines=[])
        c.set_fill_rgb(*bg)
        c.rect(0, 0, spec.width, spec.height, fill=True, stroke=False)
        return c

    def draw_page_header(c: PdfCanvas, *, page_no: int) -> float:
        header_h = 78
        c.set_fill_rgb(*navy)
        c.rect(0, spec.height - header_h, spec.width, header_h, fill=True, stroke=False)
        c.set_fill_rgb(*accent)
        c.rect(spec.margin, spec.height - header_h + 18, 56, 4, fill=True, stroke=False)

        c.text_center("VEDASTRO", y=spec.height - 36, size=16, bold=True, color=(1, 1, 1))
        c.text_center("Insights Report", y=spec.height - 56, size=10, bold=False, color=(0.85, 0.89, 0.94))

        meta_parts = []
        if meta_name:
            meta_parts.append(meta_name)
        if meta_date:
            meta_parts.append(meta_date)
        meta = " | ".join(meta_parts) if meta_parts else ""
        if meta:
            c.text(meta, x=spec.margin, y=spec.height - header_h + 10, size=9, bold=False, color=(0.78, 0.82, 0.88))

        page_label = f"Page {page_no}"
        c.text(
            page_label,
            x=spec.width - spec.margin - _estimate_text_width(page_label, 9),
            y=spec.margin - 18,
            size=9,
            bold=False,
            color=muted,
        )

        return spec.height - header_h - 18

    def draw_section_header(c: PdfCanvas, section_title: str, *, y_top: float) -> float:
        color = section_color(section_title)
        c.set_fill_rgb(*card)
        c.set_stroke_rgb(*border)
        c.set_line_width(1.0)
        c.round_rect(spec.margin, y_top - 32, spec.width - 2 * spec.margin, 34, 12, fill=True, stroke=True)
        c.set_fill_rgb(*color)
        c.round_rect(spec.margin + 14, y_top - 24, 10, 10, 5, fill=True, stroke=False)
        c.text(section_title, x=spec.margin + 32, y=y_top - 20, size=12, bold=True, color=ink)
        return y_top - 44

    def commit_page(c: PdfCanvas) -> None:
        content = "\n".join(c.lines).encode("latin-1", errors="replace")
        content_stream = b"<< /Length " + str(len(content)).encode("ascii") + b" >>\nstream\n" + content + b"\nendstream"
        content_obj = add_obj(content_stream)
        page_dict = (
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 "
            + str(spec.width).encode("ascii")
            + b" "
            + str(spec.height).encode("ascii")
            + b"] /Resources << /Font << /F1 "
            + str(font_regular).encode("ascii")
            + b" 0 R /F2 "
            + str(font_bold).encode("ascii")
            + b" 0 R >> >> /Contents "
            + str(content_obj).encode("ascii")
            + b" 0 R >>"
        )
        page_obj = add_obj(page_dict)
        page_obj_indices.append(page_obj)

    page_no = 1
    canvas = new_canvas()
    y_cursor = draw_page_header(canvas, page_no=page_no)
    content_w = spec.width - 2 * spec.margin

    def ensure_space(min_needed: float) -> None:
        nonlocal canvas, y_cursor, page_no
        if y_cursor - min_needed >= spec.margin + 28:
            return
        commit_page(canvas)
        page_no += 1
        canvas = new_canvas()
        y_cursor = draw_page_header(canvas, page_no=page_no)

    for sec_title, sec_lines in sections:
        if not sec_title or sec_title == "REPORT":
            continue

        ensure_space(70)
        y_cursor = draw_section_header(canvas, sec_title, y_top=y_cursor)

        for ln in sec_lines:
            if not ln:
                y_cursor -= 8
                continue

            is_numbered = bool(len(ln) >= 2 and ln[0].isdigit() and ln[1] in {".", ")"})
            is_bullet = ln.startswith(("-", "*")) or is_numbered

            if is_bullet:
                text = ln.lstrip("*").strip()
                indent_x = 24
                max_w = content_w - indent_x
                wrapped = wrap_to_width(text, font_size=10, max_width=max_w)
                for idx, row in enumerate(wrapped):
                    ensure_space(22)
                    if idx == 0:
                        col = section_color(sec_title)
                        canvas.set_fill_rgb(*col)
                        canvas.round_rect(spec.margin + 10, y_cursor - 10, 6, 6, 3, fill=True, stroke=False)
                    canvas.text(row, x=spec.margin + indent_x, y=y_cursor - 12, size=10, bold=False, color=muted)
                    y_cursor -= 14
                continue

            wrapped = wrap_to_width(ln, font_size=10, max_width=content_w)
            for row in wrapped:
                ensure_space(20)
                canvas.text(row, x=spec.margin + 2, y=y_cursor - 12, size=10, bold=False, color=muted)
                y_cursor -= 14

        y_cursor -= 10

    commit_page(canvas)

    kids = b"[ " + b" ".join(f"{idx} 0 R".encode("ascii") for idx in page_obj_indices) + b" ]"
    pages_obj_payload = objects[pages_obj_index - 1]
    pages_obj_payload = pages_obj_payload.replace(kids_placeholder, kids)
    pages_obj_payload = pages_obj_payload.replace(b"__COUNT__", str(len(page_obj_indices)).encode("ascii"))
    objects[pages_obj_index - 1] = pages_obj_payload

    return _serialize_pdf(objects)


def _build_page_content(lines: list[str], spec: PdfPageSpec) -> bytes:
    parts: list[str] = []
    parts.append("BT")
    parts.append(f"/F1 {spec.font_size} Tf")
    parts.append(f"{spec.leading} TL")
    parts.append(f"{spec.margin} {spec.start_y} Td")
    for i, line in enumerate(lines):
        escaped = _pdf_escape(line)
        parts.append(f"({escaped}) Tj")
        if i != len(lines) - 1:
            parts.append("T*")
    parts.append("ET")
    return "\n".join(parts).encode("latin-1", errors="replace")


def _estimate_text_width(text: str, font_size: int) -> float:
    # Rough estimate for Helvetica (avg glyph width ~0.52em).
    return max(0.0, len(text) * font_size * 0.52)


def _build_positioned_page_content(lines: list[PdfTextLine], spec: PdfPageSpec, *, font_regular_id: int, font_bold_id: int) -> bytes:
    parts: list[str] = []
    parts.append("BT")
    y = spec.height - spec.margin
    for line in lines:
        leading = int(line.leading or (line.font_size + 4))
        y -= leading
        text = "" if line.text is None else str(line.text)
        if text == "":
            continue

        font_ref = "F2" if line.bold else "F1"
        font_size = int(line.font_size)
        width = _estimate_text_width(text, font_size)

        if (line.align or "left").lower() == "center":
            x = max(spec.margin, int((spec.width - width) / 2))
        else:
            x = spec.margin + int(line.indent or 0)

        escaped = _pdf_escape(text)
        parts.append(f"/{font_ref} {font_size} Tf")
        parts.append(f"1 0 0 1 {x} {int(y)} Tm")
        parts.append(f"({escaped}) Tj")
    parts.append("ET")
    return "\n".join(parts).encode("latin-1", errors="replace")


@dataclass
class PdfCanvas:
    spec: PdfPageSpec
    lines: list[str]

    def set_fill_rgb(self, r: float, g: float, b: float) -> None:
        self.lines.append(f"{r:.3f} {g:.3f} {b:.3f} rg")

    def set_stroke_rgb(self, r: float, g: float, b: float) -> None:
        self.lines.append(f"{r:.3f} {g:.3f} {b:.3f} RG")

    def set_line_width(self, w: float) -> None:
        self.lines.append(f"{w:.2f} w")

    def rect(self, x: float, y: float, w: float, h: float, *, fill: bool = True, stroke: bool = False) -> None:
        self.lines.append(f"{x:.2f} {y:.2f} {w:.2f} {h:.2f} re")
        if fill and stroke:
            self.lines.append("B")
        elif fill:
            self.lines.append("f")
        elif stroke:
            self.lines.append("S")

    def round_rect(self, x: float, y: float, w: float, h: float, r: float, *, fill: bool = True, stroke: bool = False) -> None:
        r = max(0.0, min(float(r), min(w, h) / 2.0))
        if r <= 0:
            return self.rect(x, y, w, h, fill=fill, stroke=stroke)

        k = 0.5522847498  # circle approximation
        c = r * k

        x0, y0 = float(x), float(y)
        x1, y1 = x0 + float(w), y0 + float(h)

        # Start at bottom-left corner (after radius)
        self.lines.append(f"{x0 + r:.2f} {y0:.2f} m")
        # bottom edge
        self.lines.append(f"{x1 - r:.2f} {y0:.2f} l")
        # bottom-right corner
        self.lines.append(f"{x1 - r + c:.2f} {y0:.2f} {x1:.2f} {y0 + r - c:.2f} {x1:.2f} {y0 + r:.2f} c")
        # right edge
        self.lines.append(f"{x1:.2f} {y1 - r:.2f} l")
        # top-right corner
        self.lines.append(f"{x1:.2f} {y1 - r + c:.2f} {x1 - r + c:.2f} {y1:.2f} {x1 - r:.2f} {y1:.2f} c")
        # top edge
        self.lines.append(f"{x0 + r:.2f} {y1:.2f} l")
        # top-left corner
        self.lines.append(f"{x0 + r - c:.2f} {y1:.2f} {x0:.2f} {y1 - r + c:.2f} {x0:.2f} {y1 - r:.2f} c")
        # left edge
        self.lines.append(f"{x0:.2f} {y0 + r:.2f} l")
        # bottom-left corner
        self.lines.append(f"{x0:.2f} {y0 + r - c:.2f} {x0 + r - c:.2f} {y0:.2f} {x0 + r:.2f} {y0:.2f} c")

        if fill and stroke:
            self.lines.append("B")
        elif fill:
            self.lines.append("f")
        elif stroke:
            self.lines.append("S")

    def line(self, x1: float, y1: float, x2: float, y2: float) -> None:
        self.lines.append(f"{x1:.2f} {y1:.2f} m")
        self.lines.append(f"{x2:.2f} {y2:.2f} l")
        self.lines.append("S")

    def text(self, text: str, *, x: float, y: float, size: int = 12, bold: bool = False, color=(0, 0, 0)) -> None:
        r, g, b = color
        font = "F2" if bold else "F1"
        escaped = _pdf_escape(text or "")
        self.lines.append("BT")
        self.lines.append(f"/{font} {int(size)} Tf")
        self.lines.append(f"{float(r):.3f} {float(g):.3f} {float(b):.3f} rg")
        self.lines.append(f"1 0 0 1 {x:.2f} {y:.2f} Tm")
        self.lines.append(f"({escaped}) Tj")
        self.lines.append("ET")

    def text_center(self, text: str, *, y: float, size: int = 12, bold: bool = False, color=(0, 0, 0)) -> None:
        width = _estimate_text_width(text or "", int(size))
        x = max(self.spec.margin, (self.spec.width - width) / 2)
        self.text(text, x=x, y=y, size=size, bold=bold, color=color)


def build_professional_report_pdf(payload: dict, *, spec: PdfPageSpec | None = None) -> bytes:
    """
    Create a more professional one-page PDF for the NewDashboard report summary.
    Payload shape (best-effort):
      - user: {name,email}
      - generated_at: str
      - scores: {overall, alignment, time, opportunity}
      - rule_matches: list[str]
      - sections: {insights, action, mistake, risk}
    """
    spec = spec or PdfPageSpec(margin=42)

    objects: list[bytes] = []

    def add_obj(data: bytes) -> int:
        objects.append(data)
        return len(objects)

    add_obj(b"<< /Type /Catalog /Pages 2 0 R >>")
    kids_placeholder = b"__KIDS__"
    pages_obj_index = add_obj(b"<< /Type /Pages /Kids " + kids_placeholder + b" /Count 1 >>")
    font_regular = add_obj(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    font_bold = add_obj(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")

    canvas = PdfCanvas(spec=spec, lines=[])

    def val(x) -> str:
        if x is None:
            return "Not available"
        try:
            n = float(x)
            if n == 0:
                return "Not available"
            return f"{n:.1f}" if not n.is_integer() else str(int(n))
        except Exception:
            s = str(x).strip()
            return s if s else "Not available"

    def score_num(x) -> float | None:
        if x is None:
            return None
        try:
            n = float(x)
        except Exception:
            return None
        if n != n:  # NaN
            return None
        if n < 0:
            n = 0.0
        if n > 100:
            n = 100.0
        return n

    def score_text(x) -> str:
        n = score_num(x)
        if n is None:
            return "Not available"
        if float(n).is_integer():
            return str(int(n))
        return f"{n:.1f}"

    user_obj = payload.get("user")
    user = user_obj if isinstance(user_obj, dict) else {}
    generated_at = str(payload.get("generated_at") or "").strip() or "Not available"
    scores_obj = payload.get("scores")
    scores = scores_obj if isinstance(scores_obj, dict) else {}
    rule_matches_obj = payload.get("rule_matches")
    rule_matches = rule_matches_obj if isinstance(rule_matches_obj, list) else []
    sections_obj = payload.get("sections")
    sections = sections_obj if isinstance(sections_obj, dict) else {}

    # Colors (modern, high-contrast)
    bg = (0.965, 0.973, 0.985)
    navy = (0.045, 0.075, 0.145)
    navy2 = (0.035, 0.055, 0.11)
    accent = (0.22, 0.83, 0.96)
    violet = (0.53, 0.37, 0.93)
    amber = (0.98, 0.72, 0.18)
    text_dark = (0.07, 0.10, 0.15)
    text_muted = (0.36, 0.42, 0.50)
    border = (0.84, 0.87, 0.92)
    card_bg = (1.0, 1.0, 1.0)
    chip_bg = (0.93, 0.95, 0.98)
    bar_bg = (0.90, 0.92, 0.95)

    # Background
    canvas.set_fill_rgb(*bg)
    canvas.rect(0, 0, spec.width, spec.height, fill=True, stroke=False)

    # Header band (two-tone)
    header_h = 128
    canvas.set_fill_rgb(*navy)
    canvas.rect(0, spec.height - header_h, spec.width, header_h, fill=True, stroke=False)
    canvas.set_fill_rgb(*navy2)
    canvas.rect(0, spec.height - header_h, spec.width, 20, fill=True, stroke=False)
    canvas.text_center("Vedastro", y=spec.height - 58, size=26, bold=True, color=(1, 1, 1))
    canvas.text_center("Career & Decision Guidance", y=spec.height - 86, size=11, bold=False, color=(0.82, 0.86, 0.92))
    canvas.set_fill_rgb(*accent)
    canvas.round_rect(spec.margin, spec.height - header_h + 22, 54, 4, 2, fill=True, stroke=False)

    # Meta card (small)
    y = spec.height - header_h - 18
    meta_h = 62
    canvas.set_fill_rgb(*card_bg)
    canvas.set_stroke_rgb(*border)
    canvas.set_line_width(1.0)
    canvas.round_rect(spec.margin, y - meta_h, spec.width - 2 * spec.margin, meta_h, 10, fill=True, stroke=True)
    canvas.text(f"User: {val(user.get('name'))}", x=spec.margin + 16, y=y - 26, size=11, bold=True, color=text_dark)
    canvas.text(f"Email: {val(user.get('email'))}", x=spec.margin + 16, y=y - 44, size=10, bold=False, color=text_muted)
    canvas.text(f"Generated: {generated_at}", x=spec.width - spec.margin - 16 - _estimate_text_width(f"Generated: {generated_at}", 9), y=y - 44, size=9, bold=False, color=text_muted)

    # Card helpers (rounded)
    def card(title: str, x: float, y_top: float, w: float, h: float) -> float:
        canvas.set_fill_rgb(*card_bg)
        canvas.set_stroke_rgb(*border)
        canvas.set_line_width(1.0)
        canvas.round_rect(x, y_top - h, w, h, 12, fill=True, stroke=True)
        canvas.text(title, x=x + 18, y=y_top - 30, size=13, bold=True, color=text_dark)
        canvas.set_stroke_rgb(*border)
        canvas.set_line_width(1.0)
        canvas.line(x + 18, y_top - 38, x + w - 18, y_top - 38)
        return y_top - 54

    content_w = spec.width - 2 * spec.margin
    left = spec.margin

    # Layout: 2 columns beneath meta
    y = y - meta_h - 20
    gap = 14
    col_w = (content_w - gap) / 2
    left_col = left
    right_col = left + col_w + gap

    # Score card (left column)
    card_h = 270
    inner_y = card("Alignment Snapshot", left_col, y, col_w, card_h)

    overall_text = score_text(scores.get("overall"))
    canvas.set_fill_rgb(*chip_bg)
    canvas.round_rect(left_col + 18, inner_y - 52, col_w - 36, 56, 12, fill=True, stroke=False)
    canvas.text("Overall", x=left_col + 34, y=inner_y - 22, size=10, bold=False, color=text_muted)
    canvas.text(overall_text, x=left_col + 34, y=inner_y - 46, size=22, bold=True, color=text_dark)
    canvas.text("/ 100", x=left_col + 34 + _estimate_text_width(overall_text, 22) + 6, y=inner_y - 41, size=10, bold=False, color=text_muted)

    inner_y = inner_y - 72

    def progress_row(label: str, value_raw, color) -> float:
        clamped = score_num(value_raw)
        value = score_text(value_raw)
        canvas.text(label, x=left_col + 18, y=inner_y, size=10, bold=True, color=text_dark)
        canvas.text(value, x=left_col + col_w - 18 - _estimate_text_width(value, 10), y=inner_y, size=10, bold=True, color=text_dark)
        y_bar = inner_y - 10
        bar_w = col_w - 36
        canvas.set_fill_rgb(*bar_bg)
        canvas.round_rect(left_col + 18, y_bar - 8, bar_w, 8, 4, fill=True, stroke=False)
        pct = 0.0 if clamped is None else max(0.0, min(1.0, float(clamped) / 100.0))
        fill_w = max(0.0, bar_w * pct)
        if fill_w > 0:
            canvas.set_fill_rgb(*color)
            canvas.round_rect(left_col + 18, y_bar - 8, fill_w, 8, 4, fill=True, stroke=False)
        return inner_y - 34

    inner_y = progress_row("Awareness (Clarity)", scores.get("awareness"), accent)
    inner_y = progress_row("Time (Opportunity)", scores.get("time"), amber)
    inner_y = progress_row("Action (Execution)", scores.get("action"), violet)

    # Guidance card (right column)
    card2_h = 270
    inner_y2 = card("Guidance", right_col, y, col_w, card2_h)

    def small_header(text: str, y_cursor: float) -> float:
        canvas.set_fill_rgb(*chip_bg)
        canvas.round_rect(right_col + 18, y_cursor - 14, 90, 18, 9, fill=True, stroke=False)
        canvas.text(text.upper(), x=right_col + 26, y=y_cursor - 1, size=8, bold=True, color=text_muted)
        return y_cursor - 26

    def paragraph(body: str, y_cursor: float, max_lines: int = 4) -> float:
        text_body = body.strip() if isinstance(body, str) else ""
        if not text_body:
            canvas.text("Not available", x=right_col + 18, y=y_cursor, size=10, bold=False, color=text_muted)
            return y_cursor - 18
        for wrapped in textwrap.wrap(text_body, width=46)[:max_lines]:
            canvas.text(wrapped, x=right_col + 18, y=y_cursor, size=10, bold=False, color=text_muted)
            y_cursor -= 14
        return y_cursor - 6

    inner_y2 = small_header("Rule Matches", inner_y2 + 4)
    if rule_matches:
        for name in rule_matches[:3]:
            canvas.text(f"• {str(name)}", x=right_col + 18, y=inner_y2, size=10, bold=False, color=text_muted)
            inner_y2 -= 14
        inner_y2 -= 4
    else:
        inner_y2 = paragraph("", inner_y2, max_lines=1)

    inner_y2 = small_header("Insights", inner_y2 + 8)
    inner_y2 = paragraph(str(sections.get("insights") or ""), inner_y2, max_lines=4)

    inner_y2 = small_header("Action", inner_y2 + 8)
    inner_y2 = paragraph(str(sections.get("action") or ""), inner_y2, max_lines=3)

    # Bottom card spanning both columns: Mistake + Risk
    y_bottom = y - card_h - 18
    bottom_h = 190
    inner_y3 = card("Risk & Improvement", left, y_bottom, content_w, bottom_h)

    # two columns inside bottom card
    mid = left + content_w / 2
    canvas.set_stroke_rgb(*border)
    canvas.set_line_width(1.0)
    canvas.line(mid, y_bottom - bottom_h + 18, mid, y_bottom - 52)

    # Left: Mistake
    canvas.set_fill_rgb(*chip_bg)
    canvas.round_rect(left + 18, inner_y3 + 2 - 14, 86, 18, 9, fill=True, stroke=False)
    canvas.text("MISTAKE", x=left + 26, y=inner_y3 + 1, size=8, bold=True, color=text_muted)
    inner_left = inner_y3 - 20
    mistake_text = str(sections.get("mistake") or "").strip()
    if not mistake_text:
        canvas.text("Not available", x=left + 18, y=inner_left, size=10, bold=False, color=text_muted)
    else:
        for wrapped in textwrap.wrap(mistake_text, width=52)[:6]:
            canvas.text(wrapped, x=left + 18, y=inner_left, size=10, bold=False, color=text_muted)
            inner_left -= 14

    # Right: Risk
    canvas.set_fill_rgb(*chip_bg)
    canvas.round_rect(mid + 18, inner_y3 + 2 - 14, 60, 18, 9, fill=True, stroke=False)
    canvas.text("RISK", x=mid + 26, y=inner_y3 + 1, size=8, bold=True, color=text_muted)
    inner_right = inner_y3 - 20
    risk_text = str(sections.get("risk") or "").strip()
    if not risk_text:
        canvas.text("Not available", x=mid + 18, y=inner_right, size=10, bold=False, color=text_muted)
    else:
        for wrapped in textwrap.wrap(risk_text, width=52)[:6]:
            canvas.text(wrapped, x=mid + 18, y=inner_right, size=10, bold=False, color=text_muted)
            inner_right -= 14

    # Footer
    canvas.set_stroke_rgb(*border)
    canvas.set_line_width(1.0)
    canvas.line(spec.margin, spec.margin + 26, spec.width - spec.margin, spec.margin + 26)
    canvas.text_center("Thank you for visiting", y=spec.margin + 10, size=10, bold=True, color=text_muted)

    content = "\n".join(canvas.lines).encode("latin-1", errors="replace")
    content_stream = b"<< /Length " + str(len(content)).encode("ascii") + b" >>\nstream\n" + content + b"\nendstream"
    content_obj = add_obj(content_stream)

    page_dict = (
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 "
        + str(spec.width).encode("ascii")
        + b" "
        + str(spec.height).encode("ascii")
        + b"] /Resources << /Font << /F1 "
        + str(font_regular).encode("ascii")
        + b" 0 R /F2 "
        + str(font_bold).encode("ascii")
        + b" 0 R >> >> /Contents "
        + str(content_obj).encode("ascii")
        + b" 0 R >>"
    )
    page_obj = add_obj(page_dict)

    pages_obj_payload = objects[pages_obj_index - 1].replace(kids_placeholder, b"[ " + f"{page_obj} 0 R".encode("ascii") + b" ]")
    objects[pages_obj_index - 1] = pages_obj_payload

    return _serialize_pdf(objects)


def _serialize_pdf(objects: list[bytes]) -> bytes:
    header = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"
    body = bytearray()
    offsets: list[int] = [0]

    body.extend(header)
    for i, obj in enumerate(objects, start=1):
        offsets.append(len(body))
        body.extend(f"{i} 0 obj\n".encode("ascii"))
        body.extend(obj)
        body.extend(b"\nendobj\n")

    xref_offset = len(body)
    body.extend(b"xref\n")
    body.extend(f"0 {len(objects) + 1}\n".encode("ascii"))
    body.extend(b"0000000000 65535 f \n")
    for off in offsets[1:]:
        body.extend(f"{off:010d} 00000 n \n".encode("ascii"))

    body.extend(b"trailer\n")
    body.extend(b"<< ")
    body.extend(f"/Size {len(objects) + 1} ".encode("ascii"))
    body.extend(b"/Root 1 0 R ")
    body.extend(b">>\n")
    body.extend(b"startxref\n")
    body.extend(f"{xref_offset}\n".encode("ascii"))
    body.extend(b"%%EOF\n")
    return bytes(body)
