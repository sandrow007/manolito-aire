<img width="2160" height="2700" alt="manolit_instagram_layers_EN_2160x2700" src="https://github.com/user-attachments/assets/591af2ba-cd28-47e5-8f21-616aa284a6a1" />

# Manolit∞ Aire

**The first turn-by-turn walking router that optimizes for shade, not distance — like Google Maps, but so you don't melt.**

🔗 [manolitoaire.com](https://manolitoaire.com)

---

## 🇪🇸 ESPAÑOL

Mapa 3D de sombras urbanas, rutas peatonales frescas, calidad del aire en tiempo real e histórico de irradiación solar (NASA POWER). Proyecto ciudadano, gratuito, sin registro y sin publicidad.

### Por qué existe

Sevilla en verano no es una ciudad, es un horno. Caminar 10 minutos por la calle equivocada puede ser la diferencia entre llegar bien o llegar frito. Manolit∞ Aire nació de una idea simple: si Google Maps te optimiza por distancia o tráfico, ¿por qué nadie te optimiza por sombra? Esto es infraestructura climática ciudadana, hecha por y para quien sufre el asfalto de verdad.

### Qué hace

- 🗺️ Mapa 3D con sombras dinámicas en tiempo real
- 🚶 Ruta peatonal optimizada por sombra (Dijkstra térmico) — no la más corta, la más fresca
- ☁️ Nubosidad real (OpenWeatherMap)
- 🌬️ Calidad del aire (Copernicus CAMS vía Open-Meteo)
- ☀️ Histórico de irradiación solar desde 1984 (NASA POWER)

### Transporte público y bicicleta (capas y regiones)

La capa de transporte público usa la API pública de [Transitous](https://transitous.org/api/) (sin clave). La capa de carriles bici usa la infraestructura ciclista de OpenStreetMap vía Overpass (ODbL), y las rutas en bicicleta usan [BRouter](https://brouter.de/brouter) con respaldo en OSRM/FOSSGIS. Las regiones se deciden por el centro del mapa desde el archivo `transit-regions.json` (compartido por transporte y bici).

Para añadir una ciudad o país:

1. Abre `transit-regions.json`.
2. Añade una entrada en `regions` con `id`, `name`, `provider`, `attribution` y `polygons` (cada polígono es un array de pares `[lon, lat]`).
3. Para un país usa un polígono simplificado real (no un rectángulo que invada vecinos); para una ciudad basta un polígono pequeño alrededor de su casco.
4. Si la nueva región es española, su `id` debe empezar por `es-` para que se reconozca como tal.
5. Guarda el JSON (válido) y recarga: la selección automática ya la tendrá en cuenta.

Fuera de las regiones definidas, las capas usan la región por defecto (`defaultRegion`, normalmente `global`).

### Clima 2050: fuente de datos TARGET (opcional)

La capa "Clima 2050" funciona por defecto con una **emulación** en cliente (inspirada en Sola-Caraballo et al.; los días >40 °C se derivan con una fórmula documentada, no son datos reales). Opcionalmente puede consumir un GeoJSON **precalculado con TARGET/UMEP fuera de la web**. **TARGET no se ejecuta en el navegador** (sin Python ni WASM en el frontend): la web solo lee el archivo ya generado.

**Cómo activar cada modo** (`CLIMA_2050_SOURCE = auto | emulated | target`, por defecto `auto`), por orden de prioridad:

1. Parámetro de URL: `?clima2050source=target` (o `emulated`, `auto`).
2. `localStorage["manolito_clima2050_source"]`.
3. `window.MANOLIT_CLIMA_2050_SOURCE` antes de cargar el módulo.

**Cómo generar los datos TARGET:** el archivo se crea fuera de la web con TARGET (Python) o UMEP/QGIS y se copia a `data/clima2050/target/clima_2050_target.geojson`. Pipeline, datos de entrada y comando de importación: [`scripts/target/README.md`](./scripts/target/README.md). Esquema mínimo y comportamiento de fallback: [`data/clima2050/target/README.md`](./data/clima2050/target/README.md). Validación (sin dependencias): `node scripts/validate-target-geojson.mjs`.

**Cómo volver a emulated:** borra el archivo `data/clima2050/target/clima_2050_target.geojson` o usa `?clima2050source=emulated`. Si el archivo falta, está corrupto o no cumple el esquema, la web **cae automáticamente a la emulación actual** con un aviso discreto en consola: nada se rompe.

**Limitaciones:** si al archivo TARGET le falta `dias40` (u otro opcional) para una zona, se muestra "no disponible" y **nunca se deriva con la fórmula emulada**. El popup, el informe PDF y una etiqueta junto a la casilla indican siempre la fuente activa ("Datos simulados TARGET" o "Emulación inspirada en Sola-Caraballo et al.").

### Stack técnico

- JavaScript (ES6+), sin frameworks pesados
- WebGL (OpenGlobus / Three.js)
- Turf.js, SunCalc
- Cloudflare Workers como proxy de API

### Privacidad

100% cálculo en cliente. No se envían datos de rutas ni ubicación a servidores. Ver [Privacidad](https://manolitoaire.com/privacidad.html).

### Accesibilidad

Diseñado para WCAG 2.1 AA — compatible con lectores de pantalla (NVDA, VoiceOver, JAWS) y modo de alto contraste integrado.

### Licencia

GNU AGPL-3.0 con condiciones éticas adicionales (sección 7). Ver [LICENSE](./LICENSE).

Las condiciones adicionales prohíben la publicidad, el rastreo, los muros de pago sobre lo esencial y cualquier uso con fines de vigilancia. Si algún día se aceptan contribuciones externas, hará falta un acuerdo de contribuidor (CLA) firmado para poder mantener el licenciamiento dual.

### Apoyo

Los servidores no son gratis. Si quieres ayudar: [Ko-fi](https://ko-fi.com/manolitoinfinito)

### Uso Comercial y Licenciamiento Dual (Para Empresas)

**Manolit∞ Aire** es, y siempre será, un proyecto de código abierto, libre y comunitario bajo la licencia **AGPL 3.0 con condiciones éticas adicionales**. Creo firmemente en un internet abierto donde el conocimiento se comparte.

Sin embargo, las grandes compañías y plataformas comerciales operan bajo dinámicas de software cerrado. Debido a los estrictos términos de copyleft de la AGPL 3.0, **cualquier plataforma comercial que integre este código está obligada legalmente a liberar todo su propio código fuente**.

Si representas a una empresa y quieres desplegar, integrar o explotar el motor de rutas en sistemas cerrados sin comprometer vuestra propiedad intelectual, ofrezco **acuerdos de licencia comercial privada y adaptada**:

- **Licencia Comercial Exclusiva:** motor de sombras e integración de mapas sin las obligaciones de la AGPL 3.0.
- **Modularidad a medida:** funciones específicas del "Core" (motor geométrico), excluyendo módulos experimentales o capas de datos según necesidad.
- **Integración y Soporte:** consultoría directa para adaptar el algoritmo a vuestra infraestructura urbana o de reparto.

Contacto: 📬 **sandro.a007@gmail.com**

---

## 🇬🇧 ENGLISH

3D map of urban shade, cool walking routes, real-time air quality, and historical solar irradiation data (NASA POWER). A free, citizen-run project — no sign-up, no ads.

### Why it exists

Seville in summer isn't a city, it's an oven. Walking 10 minutes down the wrong street can be the difference between arriving fine or arriving fried. Manolit∞ Aire was born from a simple idea: if Google Maps optimizes you by distance or traffic, why does nobody optimize you by shade? This is citizen climate infrastructure, built by and for the people who actually feel the asphalt.

### What it does

- 🗺️ 3D map with real-time dynamic shade
- 🚶 Shade-optimized walking route (thermal Dijkstra) — not the shortest, the coolest
- ☁️ Real cloud cover (OpenWeatherMap)
- 🌬️ Air quality (Copernicus CAMS via Open-Meteo)
- ☀️ Solar irradiation history since 1984 (NASA POWER)

### Clima 2050: optional TARGET data source

The "Clima 2050" layer runs by default on a **client-side emulation** (inspired by Sola-Caraballo et al.; days >40 °C are derived with a documented formula — they are not real data). Optionally it can consume a GeoJSON **precomputed with TARGET/UMEP outside the website**. **TARGET never runs in the browser** (no Python/WASM in the frontend): the site only reads the already-generated file.

**How to switch modes** (`CLIMA_2050_SOURCE = auto | emulated | target`, default `auto`), in priority order:

1. URL parameter: `?clima2050source=target` (or `emulated`, `auto`).
2. `localStorage["manolito_clima2050_source"]`.
3. `window.MANOLIT_CLIMA_2050_SOURCE` before the module loads.

**How to generate TARGET data:** the file is produced outside the website with TARGET (Python) or UMEP/QGIS and copied to `data/clima2050/target/clima_2050_target.geojson`. Pipeline, input data and import command: [`scripts/target/README.md`](./scripts/target/README.md). Minimal schema and fallback behaviour: [`data/clima2050/target/README.md`](./data/clima2050/target/README.md). Validation (no dependencies): `node scripts/validate-target-geojson.mjs`.

**How to go back to emulated:** delete `data/clima2050/target/clima_2050_target.geojson` or use `?clima2050source=emulated`. If the file is missing, corrupt or fails the schema check, the site **automatically falls back to the current emulation** with a discreet console notice — nothing breaks.

**Limitations:** if the TARGET file lacks `dias40` (or another optional field) for a zone, the UI shows "no disponible" and **never derives it with the emulated formula**. The popup, the PDF report and a small badge next to the layer toggle always state the active source ("Datos simulados TARGET" or "Emulación inspirada en Sola-Caraballo et al.").

### Tech stack

- JavaScript (ES6+), no heavy frameworks
- WebGL (OpenGlobus / Three.js)
- Turf.js, SunCalc
- Cloudflare Workers as API proxy

### Privacy

100% client-side computation. No route or location data is sent to servers. See [Privacy](https://manolitoaire.com/privacidad.html).

### Accessibility

Designed for WCAG 2.1 AA — compatible with screen readers (NVDA, VoiceOver, JAWS) and a built-in high-contrast mode.

### License

GNU AGPL-3.0 with additional ethical terms (section 7). See [LICENSE](./LICENSE).

The additional terms forbid advertising, user tracking, paywalls on essential features, and any surveillance use. If external contributions are ever accepted, a signed contributor agreement (CLA) will be required to keep dual licensing possible.

### Support

Servers aren't free. If you want to help: [Ko-fi](https://ko-fi.com/manolitoinfinito)

### Commercial Use and Dual Licensing (For Companies)

**Manolit∞ Aire** is, and will always be, an open-source, free, community project under the **AGPL 3.0 license with additional ethical terms**. I firmly believe in an open internet where knowledge is shared.

However, large companies and commercial platforms operate under closed-software dynamics. Due to the strict copyleft terms of AGPL 3.0, **any commercial platform that integrates this code is legally required to release its own full source code**.

If you represent a company and want to deploy, integrate, or exploit this routing engine's features in your closed systems without compromising your intellectual property, I offer **private, tailored commercial licensing agreements**:

- **Exclusive Commercial License:** shade engine and map integration without AGPL 3.0 obligations.
- **Custom modularity:** specific "Core" (geometric engine) features, excluding experimental modules or data layers as needed.
- **Integration and Support:** direct consulting to adapt the algorithm to your urban or delivery infrastructure.

Contact: 📬 **sandro.a007@gmail.com**

---

## 🇬🇪 ქართული

ურბანული ჩრდილების 3D რუკა, გრილი ფეხით სავალი მარშრუტები, ჰაერის ხარისხი რეალურ დროში და მზის რადიაციის ისტორიული მონაცემები (NASA POWER). სამოქალაქო, უფასო პროექტი — რეგისტრაციისა და რეკლამის გარეშე.

### რატომ არსებობს

სევილია ზაფხულში არ არის ქალაქი, ღუმელია. არასწორი ქუჩით 10 წუთის სიარული შეიძლება იყოს განსხვავება კარგად მისვლასა და გამომწვარად მისვლას შორის. Manolit∞ Aire დაიბადა მარტივი იდეიდან: თუ Google Maps მანძილის ან საცობების მიხედვით გთავაზობთ ოპტიმიზაციას, რატომ არავინ გთავაზობთ ოპტიმიზაციას ჩრდილის მიხედვით? ეს არის სამოქალაქო კლიმატური ინფრასტრუქტურა, შექმნილი მათ მიერ და მათთვის, ვინც ნამდვილად გრძნობს ასფალტს კანზე.

### რას აკეთებს

- 🗺️ 3D რუკა რეალურ დროში დინამიური ჩრდილებით
- 🚶 ჩრდილზე ოპტიმიზირებული ფეხით სავალი მარშრუტი (თერმული დაიკსტრა) — არა უმოკლესი, არამედ ყველაზე გრილი
- ☁️ რეალური ღრუბლიანობა (OpenWeatherMap)
- 🌬️ ჰაერის ხარისხი (Copernicus CAMS, Open-Meteo-ს მეშვეობით)
- ☀️ მზის რადიაციის ისტორია 1984 წლიდან (NASA POWER)

### ტექნოლოგიური სტეკი

- JavaScript (ES6+), მძიმე ფრეიმვორკების გარეშე
- WebGL (OpenGlobus / Three.js)
- Turf.js, SunCalc
- Cloudflare Workers, როგორც API პროქსი

### კონფიდენციალურობა

100% გამოთვლა ხდება მომხმარებლის მოწყობილობაზე. მარშრუტისა და მდებარეობის მონაცემები სერვერზე არ იგზავნება. იხილეთ [კონფიდენციალურობა](https://manolitoaire.com/privacidad.html).

### ხელმისაწვდომობა

შექმნილია WCAG 2.1 AA სტანდარტით — თავსებადია ეკრანის წამკითხველებთან (NVDA, VoiceOver, JAWS) და აქვს ჩაშენებული მაღალი კონტრასტის რეჟიმი.

### ლიცენზია

GNU AGPL-3.0 დამატებითი ეთიკური პირობებით (მე-7 მუხლი). იხილეთ [LICENSE](./LICENSE).

დამატებითი პირობები კრძალავს რეკლამას, მომხმარებლის თვალთვალს, აუცილებელ ფუნქციებზე ფასიან კედლებს და ზედამხედველობის ნებისმიერ გამოყენებას. თუ როდესმე გარეშე წვლილი მიიღება, ორმაგი ლიცენზირების შესანარჩუნებლად საჭირო იქნება ხელმოწერილი შემწირველის შეთანხმება (CLA).

### მხარდაჭერა

სერვერები უფასო არ არის. თუ გსურთ დახმარება: [Ko-fi](https://ko-fi.com/manolitoinfinito)

### კომერციული გამოყენება და ორმაგი ლიცენზირება (კომპანიებისთვის)

**Manolit∞ Aire** არის და ყოველთვის იქნება ღია კოდის, თავისუფალი, სათემო პროექტი **AGPL 3.0 ლიცენზიით დამატებითი ეთიკური პირობებით**. მტკიცედ მჯერა ღია ინტერნეტის, სადაც ცოდნა ზიარდება.

თუმცა, დიდი კომპანიები და კომერციული პლატფორმები მუშაობენ დახურული პროგრამული უზრუნველყოფის დინამიკით. AGPL 3.0-ის მკაცრი copyleft პირობების გამო, **ნებისმიერი კომერციული პლატფორმა, რომელიც აინტეგრირებს ამ კოდს, სამართლებრივად ვალდებულია გახსნას თავისი მთელი საწყისი კოდი**.

თუ წარმოადგენთ კომპანიას და გსურთ ამ მარშრუტების ძრავის ფუნქციების დანერგვა, ინტეგრირება ან გამოყენება თქვენს დახურულ სისტემებში ინტელექტუალური საკუთრების კომპრომისის გარეშე, გთავაზობთ **კერძო, მორგებულ კომერციული ლიცენზირების შეთანხმებებს**:

- **ექსკლუზიური კომერციული ლიცენზია:** ჩრდილის ძრავა და რუკების ინტეგრაცია AGPL 3.0-ის ვალდებულებების გარეშე.
- **მორგებული მოდულარულობა:** "Core" (გეომეტრიული ძრავის) კონკრეტული ფუნქციები, საჭიროებისამებრ ექსპერიმენტული მოდულების ან მონაცემთა შრეების გამორიცხვით.
- **ინტეგრაცია და მხარდაჭერა:** პირდაპირი კონსულტაცია ალგორითმის ადაპტირებისთვის თქვენს ურბანულ ან საკურიერო ინფრასტრუქტურასთან.

კონტაქტი: 📬 **sandro.a007@gmail.com**

---

© 2026 Sandro
Obra registrada · Propiedad Intelectual
Junta de Andalucía — Consejería de Cultura y Deporte
Nº Expediente: RTA-3147-26 · Nº Registro: 2026999010353785
Fecha: 28/08/2026 · AGPL-3.0 con condiciones éticas adicionales · Código libre para la humanidad.
