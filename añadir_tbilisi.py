#!/usr/bin/env python3
"""
Añade las 10 zonas administrativas de Tiflis (admin_level 9 o 10) al GeoJSON maestro SIN reescribirlo:
inserta el texto de las 10 features justo antes del "]" de features, así que
todo lo anterior (Andalucía incluida) queda byte a byte igual. Verifica y aborta si algo falla.

Uso:
  python3 anadir_tiflis.py --maestro maestro.geojson --tiflis tiflis_osm.geojson \
      --riesgo riesgo.json --salida maestro_nuevo.geojson

riesgo.json: {"Vake":"bajo","Saburtalo":"medio", ...}  (los 10 nombres, valores tal cual los usa el maestro)
tiflis_osm.geojson: export GeoJSON de Overpass Turbo / osmtogeojson con las relaciones admin_level=9.
"""
import argparse, json, sys

ZONAS = {  # clave canónica -> alias posibles en name / name:en / name:ka
    "Vake": ["vake", "ვაკის რაიონი", "ვაკე"],
    "Saburtalo": ["saburtalo", "საბურთალოს რაიონი", "საბურთალო"],
    "Mtatsminda": ["mtatsminda", "მთაწმინდის რაიონი", "მთაწმინდა"],
    "Krtsanisi": ["krtsanisi", "კრწანისის რაიონი", "კრწანისი"],
    "Isani": ["isani", "ისნის რაიონი", "ისანი"],
    "Samgori": ["samgori", "სამგორის რაიონი", "სამგორი"],
    "Chughureti": ["chughureti", "chugureti", "ჩუღურეთის რაიონი", "ჩუღურეთი"],
    "Didube": ["didube", "დიდუბის რაიონი", "დიდუბე"],
    "Nadzaladevi": ["nadzaladevi", "ნაძალადევის რაიონი", "ნაძალადევი"],
    "Gldani": ["gldani", "გლდანის რაიონი", "გლდანი"],
}


def fail(msg):
    sys.exit("ERROR: " + msg + "\nNo se ha escrito nada.")


def canon(props):
    vals = []
    for k in ("name:en", "name", "name:ka", "int_name", "official_name:en"):
        v = props.get(k)
        if v:
            vals.append(str(v).strip().lower())
    for c, aliases in ZONAS.items():
        for v in vals:
            base = v.replace(" district", "").replace(" raion", "").strip()
            if v in aliases or base in aliases:
                return c
    return None


def find_features_end(t):
    """Devuelve (indice_del_corchete_de_cierre, array_vacio) del "features" de primer nivel."""
    depth, i, n, in_str, esc = 0, 0, len(t), False, False
    start = None
    while i < n:
        ch = t[i]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
        else:
            if ch == '"':
                if depth == 1 and t.startswith('"features"', i):
                    j = i + len('"features"')
                    while t[j] in " \t\r\n":
                        j += 1
                    if t[j] == ":":
                        j += 1
                        while t[j] in " \t\r\n":
                            j += 1
                        if t[j] != "[":
                            fail('"features" no es un array')
                        start = j
                        break
                in_str = True
            elif ch in "{[":
                depth += 1
            elif ch in "}]":
                depth -= 1
        i += 1
    if start is None:
        fail('no encuentro "features" en el maestro')
    depth, i, in_str, esc = 0, start, False, False
    while i < n:
        ch = t[i]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
        else:
            if ch == '"':
                in_str = True
            elif ch in "{[":
                depth += 1
            elif ch in "}]":
                depth -= 1
                if depth == 0:
                    return i, t[start + 1:i].strip() == ""
        i += 1
    fail("array features sin cerrar")


def main():
    a = argparse.ArgumentParser()
    a.add_argument("--maestro", required=True)
    a.add_argument("--tiflis", required=True)
    a.add_argument("--riesgo", required=True)
    a.add_argument("--salida", required=True)
    a = a.parse_args()

    with open(a.maestro, "rb") as f:
        raw = f.read()
    try:
        old = raw.decode("utf-8")
    except UnicodeDecodeError:
        fail("el maestro no es UTF-8")
    m = json.loads(old)
    if m.get("type") != "FeatureCollection":
        fail("el maestro no es un FeatureCollection")
    n_old = len(m["features"])

    riesgo = json.load(open(a.riesgo, encoding="utf-8"))
    faltan = [z for z in ZONAS if z not in riesgo]
    if faltan:
        fail("faltan niveles de riesgo para: " + ", ".join(faltan))

    src = json.load(open(a.tiflis, encoding="utf-8"))
    found = {}
    for f in src.get("features", []):
        p = f.get("properties") or {}
        if str(p.get("admin_level", "")) not in ("9", "10"):
            continue
        if f.get("geometry", {}).get("type") not in ("Polygon", "MultiPolygon"):
            continue
        c = canon(p)
        if c and c not in found:
            found[c] = f
    falt = [z for z in ZONAS if z not in found]
    if len(found) != 10:
        fail("no he encontrado las 10 zonas como Polygon/MultiPolygon. Faltan: " + ", ".join(falt))

    # mismas claves/propiedades que usan las features del maestro
    ejemplo = (m["features"][0].get("properties") or {}) if n_old else {}
    claves = set(ejemplo)
    for k in ("municipio", "area", "risk_level"):
        if claves and k not in claves:
            print(f"AVISO: el maestro no usa la propiedad '{k}' en su primera feature; se añade igualmente.")

    nuevas = []
    for c in ZONAS:  # orden fijo
        g = found[c]["geometry"]
        nuevas.append({
            "type": "Feature",
            "properties": {"municipio": "Tiflis", "area": c, "risk_level": riesgo[c]},
            "geometry": g,
        })
    ins_txt = ",".join(json.dumps(x, ensure_ascii=False, separators=(",", ":")) for x in nuevas)

    end, vacio = find_features_end(old)
    pos = end
    while old[pos - 1] in " \t\r\n":
        pos -= 1
    ins = ins_txt if vacio else "," + ins_txt
    new = old[:pos] + ins + old[pos:]

    # verificaciones
    assert new.encode("utf-8").startswith(old[:pos].encode("utf-8")), "prefijo alterado"
    assert new[pos + len(ins):] == old[pos:], "sufijo alterado"
    nj = json.loads(new)
    if len(nj["features"]) != n_old + 10:
        fail("recuento de features inesperado")
    if nj["features"][:n_old] != m["features"]:
        fail("las features originales han cambiado")
    for x in nj["features"][n_old:]:
        if set(x["properties"]) != {"municipio", "area", "risk_level"}:
            fail("propiedades inesperadas")

    with open(a.salida, "wb") as f:
        f.write(new.encode("utf-8"))
    print(f"OK: {n_old} features originales intactas (byte a byte hasta la inserción) + 10 de Tiflis = {n_old + 10}")


if __name__ == "__main__":
    main()