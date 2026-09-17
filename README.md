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

Copyleft-next 0.3.1 — ver [LICENSE](./LICENSE).

### Apoyo

Los servidores no son gratis. Si quieres ayudar: [Ko-fi](https://ko-fi.com/manolitoinfinito)

### Uso Comercial y Licenciamiento Dual (Para Empresas)

**Manolit∞ Aire** es, y siempre será, un proyecto de código abierto, libre y comunitario bajo la licencia **AGPL 3.0**. Creo firmemente en un internet abierto donde el conocimiento se comparte.

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

Copyleft-next 0.3.1 — see [LICENSE](./LICENSE).

### Support

Servers aren't free. If you want to help: [Ko-fi](https://ko-fi.com/manolitoinfinito)

### Commercial Use and Dual Licensing (For Companies)

**Manolit∞ Aire** is, and will always be, an open-source, free, community project under the **AGPL 3.0** license. I firmly believe in an open internet where knowledge is shared.

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

სევილია ზაფხულში არ არის ქალაქი — ეს ღუმელია. არასწორი ქუჩით 10 წუთის სიარული შეიძლება იყოს განსხვავება კარგად მისვლასა და გამომწვარად მისვლას შორის. Manolit∞ Aire დაიბადა მარტივი იდეიდან: თუ Google Maps მანძილის ან საცობების მიხედვით გთავაზობთ ოპტიმიზაციას, რატომ არავინ გთავაზობთ ოპტიმიზაციას ჩრდილის მიხედვით? ეს არის სამოქალაქო კლიმატური ინფრასტრუქტურა, შექმნილი მათ მიერ და მათთვის, ვინც ნამდვილად გრძნობს ასფალტს კანზე.

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

Copyleft-next 0.3.1 — იხილეთ [LICENSE](./LICENSE).

### მხარდაჭერა

სერვერები უფასო არ არის. თუ გსურთ დახმარება: [Ko-fi](https://ko-fi.com/manolitoinfinito)

### კომერციული გამოყენება და ორმაგი ლიცენზირება (კომპანიებისთვის)

**Manolit∞ Aire** არის და ყოველთვის იქნება ღია კოდის, თავისუფალი, სათემო პროექტი **AGPL 3.0** ლიცენზიით. მტკიცედ მჯერა ღია ინტერნეტის, სადაც ცოდნა ზიარდება.

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
Fecha: 28/08/2026 · AGPL-3.0 · Código libre para la humanidad.
