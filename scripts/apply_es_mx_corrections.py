#!/usr/bin/env python3
"""
Читает translations_review *.xlsx: колонки key, ru, es-MX, corrected_es.
Применяет к frontend/messages/es-MX.json только строки, где corrected_es непустой.
"""
from __future__ import annotations

import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def _col_to_index(letters: str) -> int:
    n = 0
    for c in letters:
        n = n * 26 + (ord(c) - ord("A") + 1)
    return n - 1


def _parse_cell_ref(ref: str) -> tuple[int, int]:
    m = re.match(r"^([A-Z]+)(\d+)$", ref)
    if not m:
        raise ValueError(ref)
    return int(m.group(2)), _col_to_index(m.group(1))


def _si_text(si: ET.Element) -> str:
    return "".join(si.itertext())


def load_shared_strings(z: zipfile.ZipFile) -> list[str]:
    raw = z.read("xl/sharedStrings.xml")
    root = ET.fromstring(raw)
    out: list[str] = []
    for si in root.findall("m:si", NS):
        out.append(_si_text(si))
    return out


def load_sheet_cells(z: zipfile.ZipFile, strings: list[str]) -> dict[tuple[int, int], str | None]:
    raw = z.read("xl/worksheets/sheet1.xml")
    root = ET.fromstring(raw)
    sd = root.find("m:sheetData", NS)
    if sd is None:
        return {}
    cells: dict[tuple[int, int], str | None] = {}
    for row in sd.findall("m:row", NS):
        for c in row.findall("m:c", NS):
            ref = c.get("r")
            if not ref:
                continue
            rownum, colidx = _parse_cell_ref(ref)
            ct = c.get("t")
            v = c.find("m:v", NS)
            is_elem = c.find("m:is", NS)
            val: str | None = None
            if v is not None and v.text is not None:
                if ct == "s":
                    val = strings[int(v.text)]
                else:
                    val = v.text
            elif is_elem is not None:
                t = is_elem.find(".//m:t", NS)
                if t is not None:
                    val = t.text or ""
            cells[(rownum, colidx)] = val
    return cells


def get_cell(cells: dict[tuple[int, int], str | None], row: int, col: int) -> str | None:
    return cells.get((row, col))


def set_nested(obj: dict, dotted: str, value: str) -> None:
    parts = dotted.split(".")
    cur: dict = obj
    for p in parts[:-1]:
        nxt = cur.get(p)
        if not isinstance(nxt, dict):
            raise KeyError(f"Не объект по пути {dotted!r} у сегмента {p!r}")
        cur = nxt
    cur[parts[-1]] = value


def get_nested(obj: dict, dotted: str):
    parts = dotted.split(".")
    cur = obj
    for p in parts:
        if not isinstance(cur, dict) or p not in cur:
            return None
        cur = cur[p]
    return cur


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    xlsx = root / "translations_review (1) (3).xlsx"
    target = root / "frontend" / "messages" / "es-MX.json"
    if not xlsx.is_file():
        print(f"Нет файла: {xlsx}", file=sys.stderr)
        return 1
    if not target.is_file():
        print(f"Нет файла: {target}", file=sys.stderr)
        return 1

    with zipfile.ZipFile(xlsx, "r") as z:
        strings = load_shared_strings(z)
        cells = load_sheet_cells(z, strings)

    # A=0 key, B=1 ru, C=2 es-MX, D=3 corrected_es
    corrections: list[tuple[str, str, str | None]] = []
    max_row = max((r for r, _ in cells.keys()), default=0)
    for r in range(2, max_row + 1):
        key = get_cell(cells, r, 0)
        orig_es = get_cell(cells, r, 2)
        corrected = get_cell(cells, r, 3)
        if not key or not str(key).strip():
            continue
        key = str(key).strip()
        if corrected is None:
            continue
        corrected_stripped = str(corrected).strip()
        if not corrected_stripped:
            continue
        corrections.append((key, corrected_stripped, orig_es))

    data = json.loads(target.read_text(encoding="utf-8"))

    missing: list[str] = []
    mismatch: list[tuple[str, str, str]] = []
    applied = 0

    for key, new_val, orig_es in corrections:
        cur = get_nested(data, key)
        if cur is None:
            missing.append(key)
            continue
        if not isinstance(cur, str):
            missing.append(f"{key} (не строка: {type(cur).__name__})")
            continue
        if orig_es is not None and str(orig_es).strip() != cur:
            mismatch.append((key, cur, str(orig_es).strip()))

    if missing:
        print("ПРОБЛЕМЫ (ключ не найден или не строка):", file=sys.stderr)
        for m in missing[:30]:
            print(f"  {m}", file=sys.stderr)
        if len(missing) > 30:
            print(f"  ... ещё {len(missing) - 30}", file=sys.stderr)
        return 2

    if mismatch:
        print("ПРЕДУПРЕЖДЕНИЕ: es-MX в файле не совпадает с колонкой C в строке ключа:", file=sys.stderr)
        for k, file_val, sheet_val in mismatch[:20]:
            print(f"  {k}", file=sys.stderr)
            print(f"    в JSON: {file_val[:80]!r}...", file=sys.stderr)
            print(f"    в xlsx C: {sheet_val[:80]!r}...", file=sys.stderr)
        if len(mismatch) > 20:
            print(f"  ... ещё {len(mismatch) - 20} несовпадений", file=sys.stderr)
        print("Продолжаем замену по ключу (corrected_es всё равно применяется).", file=sys.stderr)

    for key, new_val, _orig_es in corrections:
        set_nested(data, key, new_val)
        applied += 1

    target.write_text(
        json.dumps(data, ensure_ascii=False, indent=4) + "\n",
        encoding="utf-8",
    )
    print(f"Строк с corrected_es: {len(corrections)}")
    print(f"Применено замен: {applied}")
    print(f"Записано: {target}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
