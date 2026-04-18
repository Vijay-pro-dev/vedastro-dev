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
            x = spec.margin

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

    user = payload.get("user") if isinstance(payload.get("user"), dict) else {}
    generated_at = str(payload.get("generated_at") or "").strip() or "Not available"
    scores = payload.get("scores") if isinstance(payload.get("scores"), dict) else {}
    rule_matches = payload.get("rule_matches") if isinstance(payload.get("rule_matches"), list) else []
    sections = payload.get("sections") if isinstance(payload.get("sections"), dict) else {}

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
    inner_y = card("Career Score Summary", left_col, y, col_w, card_h)

    overall_text = val(scores.get("overall"))
    canvas.set_fill_rgb(*chip_bg)
    canvas.round_rect(left_col + 18, inner_y - 52, col_w - 36, 56, 12, fill=True, stroke=False)
    canvas.text("Overall", x=left_col + 34, y=inner_y - 22, size=10, bold=False, color=text_muted)
    canvas.text(overall_text, x=left_col + 34, y=inner_y - 46, size=22, bold=True, color=text_dark)
    canvas.text("/ 100", x=left_col + 34 + _estimate_text_width(overall_text, 22) + 6, y=inner_y - 41, size=10, bold=False, color=text_muted)

    inner_y = inner_y - 72

    def progress_row(label: str, value_raw, color) -> float:
        value = val(value_raw)
        canvas.text(label, x=left_col + 18, y=inner_y, size=10, bold=True, color=text_dark)
        canvas.text(value, x=left_col + col_w - 18 - _estimate_text_width(value, 10), y=inner_y, size=10, bold=True, color=text_dark)
        y_bar = inner_y - 10
        bar_w = col_w - 36
        canvas.set_fill_rgb(*bar_bg)
        canvas.round_rect(left_col + 18, y_bar - 8, bar_w, 8, 4, fill=True, stroke=False)
        try:
            pct = max(0.0, min(1.0, float(value_raw) / 100.0))
        except Exception:
            pct = 0.0
        fill_w = max(0.0, bar_w * pct)
        if fill_w > 0:
            canvas.set_fill_rgb(*color)
            canvas.round_rect(left_col + 18, y_bar - 8, fill_w, 8, 4, fill=True, stroke=False)
        return inner_y - 34

    inner_y = progress_row("Alignment", scores.get("alignment"), accent)
    inner_y = progress_row("Time", scores.get("time"), amber)
    inner_y = progress_row("Opportunity", scores.get("opportunity"), violet)

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
