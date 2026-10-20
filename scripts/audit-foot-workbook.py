"""Read-only OOXML cross-check; Python standard library, no Excel installation."""
import collections
import hashlib
import json
import xml.etree.ElementTree as ET
import zipfile

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
SOURCE = "docs/catalogo_1200_jugadores_futbol_pie_dominante.xlsx"
with open("docs/reclutador_pie_dominante_1200_importacion.json", encoding="utf-8") as stream:
    supplied = json.load(stream)
with open(SOURCE, "rb") as stream:
    assert hashlib.sha256(stream.read()).hexdigest() == supplied["sourceSha256"]

with zipfile.ZipFile(SOURCE) as archive:
    strings = ["".join(node.itertext()) for node in ET.fromstring(archive.read("xl/sharedStrings.xml")).findall("m:si", NS)]

    def sheet(number):
        result = {}
        for row in ET.fromstring(archive.read(f"xl/worksheets/sheet{number}.xml")).findall("m:sheetData/m:row", NS):
            cells = {}
            for cell in row:
                value = cell.find("m:v", NS)
                text = value.text if value is not None else ""
                if cell.get("t") == "s":
                    text = strings[int(text)]
                cells[''.join(c for c in cell.get("r") if c.isalpha())] = text
            result[int(row.get("r"))] = cells
        return result

    unified = sheet(6)
    league_labels = {"Liga Profesional Argentina": "ARG", "Premier League Inglaterra": "ENG", "Brasileirão Série A": "BRA", "LaLiga EA Sports España": "ESP"}
    # Use the actual supplied labels, never player names or clubs, as league identifiers.
    print("Workbook league labels:", sorted({row.get("B", "") for i, row in unified.items() if i >= 4}))
    for record in supplied["records"]:
        row = unified[record["unifiedExcelRow"]]
        assert league_labels[row["B"]] == record["league"]
        assert row["A"] == record["sourceId"]
        assert row["E"] == record["fullName"]
        assert row["I"] == record["dominantFootOriginal"]
        assert int(row["J"]) == record["sourceRating"]
    assert len([i for i in unified if i >= 4]) == 1200
    assert len({record["unifiedExcelRow"] for record in supplied["records"]}) == 1200
    for number, league in [(2, "ARG"), (3, "ENG"), (4, "BRA"), (5, "ESP")]:
        data = [row for i, row in sheet(number).items() if i >= 4]
        assert len(data) == 300
        foot_col, id_col = ("G", "A") if number in (2, 3) else ("J", "B")
        actual = {row[id_col]: row[foot_col] for row in data}
        assert len(actual) == 300
        expected = {r["sourceId"]: r["dominantFootOriginal"] for r in supplied["records"] if r["league"] == league}
        assert actual == expected
    assert collections.Counter(r["I"] for i, r in unified.items() if i >= 4) == {"Diestro": 914, "Zurdo": 275, "Ambidiestro": 11}
print("PASS: 1200 unified rows and all four league sheets agree with JSON; workbook unchanged.")
