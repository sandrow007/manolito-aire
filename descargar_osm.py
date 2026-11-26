import json, urllib.request, urllib.parse, sys
q = '[out:json][timeout:60];node["natural"="tree"](37.28,-6.12,37.46,-5.80);out body;'
d = urllib.parse.quote(q)
for url in ['https://overpass-api.de/api/interpreter?data=' + d,
            'https://overpass.private.coffee/api/interpreter?data=' + d,
            'https://overpass.kumi.systems/api/interpreter?data=' + d]:
    try:
        print('GET', url.split('/')[2], flush=True)
        r = urllib.request.urlopen(url, timeout=90)
        j = json.load(r)
        n = len(j.get('elements', []))
        print('elementos:', n, flush=True)
        if n:
            open('data/arboles-osm-sevilla.json', 'w').write(json.dumps(j))
            print('guardado', flush=True)
            sys.exit(0)
    except Exception as e:
        print('fallo:', e, flush=True)
sys.exit('sin datos')
