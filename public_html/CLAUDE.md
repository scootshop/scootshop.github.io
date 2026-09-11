# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

SCOOT SHOP storefront — e-scooters, mopeds and bikes for the Spanish market. It is a **static-first site** (plain HTML/CSS/vanilla JS, no build step, no framework, no bundler) backed by a single PHP API monolith, deployed to Hostinger shared hosting (Apache + PHP + MariaDB/MySQL). The git working root is `public_html/`; one level up holds `public_html.zip` and a `_cleanup_quarantine/` folder that are not part of the deployable site.

All UI copy, comments and commit messages are in Spanish — match that convention.

## Commands

PowerShell is the primary shell. Scripts live in `scripts/`.

```powershell
# Local dev: starts MariaDB (port 3307) + PHP built-in server (port 8083), runs healthchecks.
# Requires .env.local with APP_ENV=local and MariaDB 12.2 installed.
powershell -ExecutionPolicy Bypass -File scripts/local-start.ps1

# Bump the global asset version (cache-busting). Updates asset-version.json + meta tags.
powershell -ExecutionPolicy Bypass -File scripts/bump-assets-version.ps1

# Scaffold a new product in an existing series (creates folder, index.html, placeholder img,
# and patches data/products.js + sitemap.xml). Series: k, n, gt, ix.
.\scripts\new-series-product.ps1 -SeriesKey n -Slug x5 -Name "X5" -Price 499
```

Smoke / QA (expect terminal markers `LOCAL_START_OK`, `VARIANTES_OK`, `CATALOGO_OK`, `API_SQL_OK`, `ATTRS_INDEX_OK`, `GATE_B_OK`/`GATE_B_KO`, `PANEL_REFRESCO_OK`, `PAGO_METODO_OK`, `PEDIDO_UNICO_OK`, `SMOKE_WEB_OK`, `IMG_CACHE_OK`, `IMG_DUPES_OK`).

`scripts/qa/variantes.ps1` runs the whole variant system in one go — catalog, SQL bindings, attribute index, cases A–J, multi-axis fichas, cart flow, accessibility/responsive at three widths, the globalisation test, summary chips and readiness — against local or production. It exists because these suites were born in a session's temp folder: a guard nobody can run is not a guard. `variantes-capturas.js` takes per-element screenshots to compare a design before/after a CSS change (`SS_SHOTS` picks the folder).

```powershell
powershell -ExecutionPolicy Bypass -File scripts/qa/variantes.ps1                  # TODO el sistema de variantes
python scripts/qa/panel-precio.py https://scootshop.co                             # el panel cambia un precio de verdad
node scripts/qa/panel-refresco.js [base]                                           # el panel se entera solo, y no te borra lo escrito
node scripts/qa/pago-metodo.js [base]                                              # elegir metodo deja el pedido con SU metodo y SU importe
node scripts/qa/pedido-unico.js [base]                                             # corregir la direccion actualiza el pedido, no crea otro
powershell -ExecutionPolicy Bypass -File scripts/qa/variantes.ps1 -BaseUrl https://scootshop.co
node scripts/qa/catalogo.js                                                        # el catálogo se ejecuta y es válido
node scripts/qa/api-sql.js                                                         # cada SQL cuadra con sus bindings
node scripts/build-attributes-index.js --check                                     # el índice de atributos, al día
node scripts/qa/legacy-metrics.js                                                  # cuánto queda del modelo viejo
powershell -ExecutionPolicy Bypass -File scripts/gate-b-smoke.ps1                  # cart/order payment flow
powershell -ExecutionPolicy Bypass -File scripts/qa/smoke-web.ps1                  # all sitemap.xml URLs + critical routes
powershell -ExecutionPolicy Bypass -File scripts/qa/smoke-web.ps1 -IncludeApiRoutes
powershell -ExecutionPolicy Bypass -File scripts/qa/check-image-cache.ps1          # images must carry no ?v=
node scripts/qa/check-image-dupes.js                                               # no image downloaded twice
node scripts/qa/rutas-img.js                                                      # ninguna ruta /img/ rota ni huerfana
node scripts/qa/logo-piezas.js                                                    # las piezas del logotipo, y que el CSS y ellas cuadren
node scripts/build-logo-pie.js --check                                            # la marca negra del pie, recortada del original
python scripts/optimiza-imagenes-fijas.py --check                                 # las imagenes que no son de producto, dentro de su presupuesto
node scripts/qa/fotos-mini.js                                                     # toda portada tiene su medida pequeña
node scripts/build-filtros.js --check                                             # cada patinete, con sus numeros de filtro al dia
python scripts/build-web-fonts.py --check                                          # cada hoja de fuentes, con sus .woff2
python scripts/build-icon-fonts.py --check                                         # ningún icono sin glifo
node scripts/build-mail-track-icons.js --check                                      # los hitos del correo, iguales a los de /pedido
python scripts/qa/carga-no-bloqueante.py                                           # ningún script bloquea el pintado
node scripts/qa/volver-atras.js [base]                                             # volver atrás deja donde tocaba
node scripts/qa/compat-variantes.js [base]                                         # nadie con ejes se añade de un clic
node scripts/qa/fotos-por-variante.js                                              # mover un color cambia la foto
node scripts/qa/portada-click.js [base]                                            # la portada se pulsa y se arrastra
node scripts/qa/paginas-categoria.js [base]                                       # cada categoria en su pagina, y solo la suya
python scripts/build-categorias.py --check                                        # /patinetes, /accesorios y /repuestos al dia
python scripts/build-cabecera.py --check                                          # la cabecera, horneada en las 91 paginas que la pedian aparte
```

Deploy is FTP via `deploy.py` (also wired into VS Code tasks: "Deploy dry-run", "Deploy whitelist", "Deploy selected files"). **Deploy selectively** — `--all-changed` is intentionally gated behind `--allow-bulk`. Secrets come from `.env`/`.env.local` (`SCOOTSHOP_FTP_PASSWORD`), never the command line.

```powershell
# Always dry-run first.
python deploy.py --host srv1049-files.hstgr.io --remote-base /domains/scootshop.co/public_html `
  --env-files .env.local .env --files "index.html,css/index.css" --dry-run --no-prompt
```

## Architecture

### Backend — one file
`api/index.php` (~350 KB) is the entire backend. There is no framework. Requests are dispatched by a single `switch ($route)` on `$_GET['route']` (`index.php?route=health`, `?route=orders_create`, …). To add an endpoint, add a `case` in that switch and return via the `json_out()` helper. Route families:
- `auth_*` — Google Sign-In + session (`auth_dev_login` is gated by `ALLOW_DEV_LOGIN`/`ALLOW_DEV_AUTH`, off in prod)
- `paypal_*` / `stripe_*` — payment intent creation, capture, webhooks/IPN
- `orders_*` / `account_*` — order create/get/resume, customer order history
- `admin_*` — dashboard, customers, orders, product stock/price/create, discounts (guarded by `ADMIN_KEY`)
- `discount_*` / `order_pricing_preview` — discounts are **feature-flagged**: with `DISCOUNTS_ENABLED=false` (default) these return `503 feature_disabled` and never touch discount tables.

Config is assembled into the `$CFG` array at the top of the file, sourced entirely from env (`.env`, `.env.local`, then `env`/`env.local`). DB credentials must only come from env — never hardcode. DB connection is lazy (only routes that need it connect). Per-route rate limiting runs before dispatch (`enforce_route_rate_limit`).

### Frontend — static pages + global catalog
Each page is a hand-written `index.html` under a path folder (`patinetes/series-n/n7/`, `motos/ev05m/`, `checkout/`, `cuenta/`, `pago.html`, etc.) that maps directly to a clean URL.

The product catalog is **not** fetched from the API for browsing — it lives in `data/products.js`, an IIFE that exposes `window.SCOOTSHOP_PRODUCTS`, `window.SCOOTSHOP_CATEGORIES`, `window.SCOOTSHOP_SERIES` and `window.SCOOTSHOP_get*` accessors. It is the **only** catalog: the backend reads the same file, plus `data/attributes-index.json`, which is *generated* from it (`node scripts/build-attributes-index.js`) — regenerate it whenever product data changes, and re-run the relevant scaffolding/sitemap steps.

Shared runtime modules in `js/` are appended dynamically (not statically tagged) by the bootstrap layer: `cart-runtime.js` (cart state), `auth-ui.js` (login UI), `global-assets-app.js`, `mobile-menu.js`, `index.js` (home), plus page-specific files (`account.js` for `/cuenta`, `pago.js` for checkout).

### Product attributes (single source of truth, migration in progress)

Variant axes are declared in `data/products.js` as `attributes` and resolved by `js/product-attributes.js` (`window.SS_ATTRS`). **Nothing may infer an axis from CSS classes or HTML.**

```js
attributes: [
  { key: 'model', label: 'Modelo', type: 'pill',   options: [{ key, label, images:[1,2], default, allows, desc }] },
  { key: 'color', label: 'Color',  type: 'swatch', options: [{ key, label, swatch, imagesBy }] }
]
```

`key` is the stable identity (it reaches the cart and orders — never rename it); `label` is display text; `type` picks the control (`pill` = named button, `swatch` = colour circle); `allows` gates cross-axis availability and is checked in **both** directions. A missing `label` falls back to the axis type via `ETIQUETAS` — never assume "Color".

The bug this replaced: the KUKIRIN G2 PRO declared a *model* axis as `class="color-variant size-variant"` with a hand-written `MODELOS:` label. Its ficha looked right; the home rendered colour circles, because axis identity lived in markup.

### Where the architecture stands (13 Aug 2026, live as `20260813-9`)

One core — `js/product-attributes.js` (`SS_ATTRS`) — reads `attributes` from `data/products.js` and every consumer goes through it. **No consumer decides any more what a variant *means*.** Verified in production with a real browser: 4-view chip suite (with and without a 2.5 s catalog delay), drawer A–F, 8 fichas, 10-step commercial smoke with invariants intact, a full order created and read back through the API, and a globalization test.

**The globalization test is the real acceptance criterion** (`/tmp` scripts + scratchpad `globalizacion.js`): a steering damper with three axes that exist nowhere in the code (`length`, `hardness`, `mount`) is injected into the live catalog response, and core, home bubble, cart and checkout all describe it correctly — labels, defaults, per-option images, cart attrs, chip text — with zero code changes. Adding a product is declaring data.

Flow, end to end, with the semantics intact at every hop:

```
attributes (data/products.js)
  → SS_ATTRS.ejes()            quién es cada eje, cómo se llama, cómo se pinta
  → selección (ficha / burbuja) → SS_ATTRS.marcarSeleccion() escribe data-attrs
  → línea de carrito            attrs: { model:'vmp', size:'720' }  (+ color/colorLabel, identidad)
  → checkout / pago             SS_ATTRS.describirTexto()
  → payload                     attrs + variant_text (lo que el cliente vio)
  → orders (cart_items_json, product_attrs_json, product_variant_text)
  → email / admin / pedido      imprimen variant_text; NO interpretan ejes
```

Two artefacts keep client and server from drifting apart, and neither is hand-written:
- `data/attributes-index.json` — generated by `node scripts/build-attributes-index.js`, which **runs the real catalog against the real core** in a sandbox and dumps what it resolves. `--check` fails if it is stale. Regenerate it whenever `data/products.js` changes.
- `order_item_variant_text()` in PHP — the same rule as the core (sealed text → attrs → legacy rescue → stored value), reading that index. It has **no semantics of its own** and only ever runs for orders written before `attrs` existed.

`data/products-server.js` (the second catalog the backend used to read, resynced from admin with regexes) **is deleted**, locally and on the server.

Legacy metrics, before → after this block: `colorVariants` runtime readers 80 → 0 (26 mentions left, all historical comments), `proyectarLegacyEn` 2 → 0 (deleted), `desdeLegacy()` deleted, `ss:attrs` event 8 → 0 (deleted; the readiness promise `window.SS_READY` is published by the loader before it fetches anything, so the four copies of "if the core exists use its promise, else listen for the event" collapsed into one line each), DOM axis reader in `variant-pop.js` −142 lines, products declaring `attributes` 7 → 12 (all of them). What stays on purpose: `color`/`colorLabel` (line identity in live carts and orders) and `rescatarEjeLegacy()`/`order_item_variant_text()` (reading orders written before August 2026).

**El sistema visual también es único.** Los tokens `--variant-*` (`css/main.css`, junto a `--summary-*`) son los únicos números del selector: tamaño del círculo, radio, bordes, anillo del elegido, punto blanco, elevación del hover, transiciones y opacidad de lo agotado. El círculo tenía dos definiciones —una en `tarjetas.css` para la ficha y otra en `main.css` para la burbuja— con números que habían derivado (anillo 4px/3px, punto 8px/7px, hover 1,05/1,06); ahora hay un bloque y el tamaño se cambia redefiniendo `--variant-size` en el contexto. La píldora ya estaba unificada y ahora consume los mismos tokens. Comprobado con capturas: las cuatro vistas de ficha a 1440 y 390 px salen **idénticas al píxel** antes y después.

**Multi-axis fichas are data-driven too (stage 4).** The four two-axis fichas (WAKE, LUNJE, UNO, KOCEVLO) had ~120 lines of inline script each — four copies of the same dance: recombine the key, move the photos of the chosen size, rewrite the cart button and the buy links. All four are deleted; `createVariantSelector()` now renders N axes: it pairs the catalog's axes, in order, with the `.size-variants` sections the ficha provides, and every choice on any axis goes through one `aplicarSeleccion()` that resolves cross-axis availability (`allows`), the photo of the *combination* (`imagenesDe`), the named `attrs`, the buy links and the legacy combined key. A ficha with no swatch axis at all (model + size) takes the same path.

Two things that had to be declared as data for that to work, both documented in `data/products.js`:
- `legacyKeyAxes` — the order in which option keys are joined into the cart line's identity (`negro-780`). It used to be implicit in each ficha's script; it lives in the catalog so live carts and stored orders keep matching. It disappears when line identity becomes `attrs`.
- `shortLabel` — a compact label for the control when the long one repeats the unit already shown in the axis header (`MEDIDA: 720 mm` over pills `640 · 680 · 720`). The long label still travels to cart, checkout and order.

**Classes name the control, not the axis.** `.color-variant`/`.size-variant`/`.acc-pop-pill`/`.acc-pop-swatch` are now `.variant-option` + `.variant-option--swatch|--pill`, in CSS, JS and the 12 fichas' markup. With that the `.color-variant:not(.size-variant)` trick — which existed only to tell a pill from a circle — is gone, and a model pill no longer carries a class that says "color".

**STAGE 5 (cart/checkout presentation) IS DONE AND LIVE (13 Aug 2026).** Deployed on top of `20260813-8`: `js/product-attributes.js`, `js/pago.js`, `js/global-assets.js`, `checkout/index.html`, `pago.html`. Verified **against production** with a real browser: chips (4 views × with/without a 2.5 s catalog delay), drawer A–F, 8 fichas, 10-step commercial smoke, invariants intact. Repro: `/tmp/final.js`, `/tmp/smoke.js`, `/tmp/reg.js` (all take a base URL).

Closed and proven — do not reopen: load order (`async=false`), `attrs` contract, `renderDrawer`, `renderDrawerNow`, `patchDrawerItems`, semantic fallback, slow-catalog path, persistence, storage, `read()`, `sanitizeItem`, `attrsOf`, line identity, SKU, qty, amounts. `attrs` survives end to end.

The checkout chip printed `Color: G2 PRO VMP` instead of `Modelo: …`. The hypothesis written here before — "the summary renders once before `SS_ATTRS.ready`, await it" — was **wrong**, and worth remembering why: the symptom was permanent, not a race. Measured on the page itself: `SS_ATTRS` true, 44 products, `attrs {model:'vmp'}` in storage, and the core asked directly answered `Modelo: G2 PRO VMP` while the page showed `Color: …`. Three real causes, each fixed at its own layer:

1. **Data lost at the read boundary.** `loadCartItems()` (checkout) and `loadCheckoutCart()` (`pago.js`) rebuilt each line field by field and **dropped `attrs`**. A line without `attrs` is legacy, and legacy means colour — no amount of readiness fixes that. Both now copy `attrs` through a `sanitizeAttrs` like the cart's.
2. **Direct-buy lines had no product to resolve against.** `/checkout?…&color=vmp&colorLabel=…` carries no `attrs`, and the line handed to the core carried no `sku`/`url` either, so there was no catalogue entry to read the axis from. Both pages now build that line with `sku` + `url`, and the core gained `rescatarEjeLegacy()`: for a legacy-shaped line on a product with **no colour axis**, the stored value is looked up among the real axes (by option key *or* label). No match ⇒ behaviour identical to before. This also repairs orders and links written before `attrs` existed.
3. **`SS_ATTRS.ready` was resolving without a catalogue** — the note "proven correct" only held for fichas. `anunciar()` decided "this page has no catalogue" by looking for the `products.js` tag **once, at t=0**. On `/checkout` the catalogue is appended later by `global-assets-app.js` (measured: core 67 ms, tag ~78 ms), so `ready` resolved with 0 products and any repaint hanging off it ran too early. Same class as the two dead ends already burned (transient state read as permanent), third disguise. Now the terminal condition is a document **milestone**: resolve when the catalogue appears, or when `load` fires without it. `load` waits for dynamically inserted scripts (measured with the catalogue delayed 2.5 s: load 2866 ms, catalogue 2876 ms, `ready` 2876 ms with 44 products). Do **not** go back to listening on the tag's own `load`/`error`: the tag is discovered by polling, so its `error` can have fired already — measured with the catalogue aborted, `ready` then never resolved at all and the drawer never repainted.

On top of that both summaries repaint once on `SS_ATTRS.ready` (the single frontier, as in the drawer), rewriting **only the chip text** — never the list HTML, which would re-download the photos that `check-image-dupes.js` guards.

**Una opción sin `images` dejaba el selector MUDO, no solo sin foto.** En
`applyVariant` había un `if (!selectedItems.length) return;` y se llevaba por delante
todo lo que venía después: el rótulo del valor elegido, el contenido de la variante y el
acento de serie. El manillar WAKE Downhill y el NANLIO —los dos únicos productos cuyo eje
principal no declaraba `images`— se veían así: pulsabas «Azul», el círculo se marcaba, y
el rótulo seguía diciendo «Negro y blanco» con la misma foto. Dos arreglos, porque eran
dos fallos: el dato (cada opción declara su foto) y el código (sin foto solo se deja de
cambiar la foto). Ojo con el respaldo del núcleo: `fotoDe()` cae a la foto de portada, así
que "hay foto" no basta como comprobación — la regla es que **mover un círculo cambie la
foto**, y eso es lo que mide `scripts/qa/fotos-por-variante.js` (solo ejes `swatch`: una
medida puede compartir foto con toda legitimidad).

**Preguntarle al núcleo antes de que exista devuelve "no hay ejes", y eso vende mal.**
En una ficha, `product-enhancements.js` se enlaza con etiqueta estática y el núcleo lo
añade `global-assets.js` de forma diferida: medido, el archivo corre a los 380 ms y
`SS_ATTRS` llega a los 586. El selector de variantes ya esperaba con `ssListo()`; la caja
de "Añade algo más" **no**, y por eso decidía con cero ejes que un accesorio no tenía nada
que elegir. El manillar WAKE Downhill —siete colores— salía con el botón «+» de añadir
directo: un pedido sin saber qué color enviar. Los demás accesorios con ejes se libraban
por casualidad, porque declaran `variantHint`, que es texto plano del catálogo y no
necesita núcleo; ese campo estaba TAPANDO el fallo, no arreglándolo. Regla: **todo lo que
pregunte por ejes va dentro de `ssListo().then(...)`**, y `scripts/qa/compat-variantes.js`
lo comprueba contra el DOM ya pintado (`COMPAT_OK`).

**Compatibility and accessory families are declared too.** `UNIVERSAL_ACCESSORIES_BY_CATEGORY` — a table inside `data/products.js` listing which SKUs are offered for each product category — is gone: an accessory now declares `fitsCategories: ['electric-scooters', …]` and `getCompatibleAccessories()` asks the accessories instead of consulting a list nobody remembers to update. All 15 accessories declare `accessoryCategory`, there is a real table of families (`accessoryCategoryDefinitions` + `SCOOTSHOP_getAccessoryCategories()`), and the catalog validator now fails if an accessory has no family, names one that doesn't exist, or points `compatibleSkus`/`fitsCategories` at something that isn't in the catalog. Verified invariant: the compatible list of all 26 products is identical before and after.

**Class names, containers included.** `.color-variants*`/`.size-variants*` are now `.variant-axis`, `-box`, `-head`, `-label`, `-value`, `-grid`. Two consequences worth knowing, both hit for real: code that used to identify "the colour axis" by its class name now has to identify it by **what it contains** (`.variant-option--swatch`) or by **its position** (sections pair in order with the catalog's axes) — that's `seccionDeSwatches()` in `global-assets-app.js` and `indicePrincipal` in `product-enhancements.js`; and the four fichas' inline `<style>` blocks, which used to override `.size-variants` freely because the name was theirs alone, suddenly collided with `tarjetas.css` — so the "two axes read as one card" rule moved to `tarjetas.css`, once, for any ficha with two or more axes.

**Migration status (Aug 2026):** stages 1–7 done and live (`20260813-12`), plus the visual system, the class rename and the compatibility model. Nothing of the variant architecture is pending.

Two traps, both hit for real:

- `proyectarLegacyEn()` in `cloneProducts()` derives the old `colorVariants` view for consumers not yet migrated. It lives in `cloneProducts()` and not on the `window.SCOOTSHOP_*` globals because `getHomeCategories()` clones independently. It is temporary — delete it once `index.js` and `pago.js` read `SS_ATTRS`.
- Fichas link `product-enhancements.js` with a static tag while `global-assets.js` appends the core deferred, so the core arrives **after** the ficha runs. Consumers wait for the `ss:attrs` event instead of assuming it is loaded. If a second init event ever appears, centralise on a single `SS_ATTRS.ready` promise rather than growing a web of events.

Do **not** write `data-color-key` from the catalog yet: today it holds the label (`Negro`) while the catalog says `negro`, and changing it would split cart-line identity and break stored orders. That conversion belongs with the cart stage, which carries backwards-compatible reads.

### El catálogo tiene UN solo escritor (desde 13 Aug 2026)

`data/products.js` es la **estructura** del catálogo —qué productos hay, sus fotos, sus ejes de variante, sus textos— y la edita una persona. Lo que cambia a diario —precio, precio tachado, stock, altas y bajas desde el panel— vive en `data/product-overrides.js` (+ su gemelo `.json` para el backend), que **genera el panel entero** con `json_encode` y escritura atómica.

Por qué: hasta hoy el panel reescribía `products.js` con expresiones regulares (`preg_replace('/id: "x" .*? priceText: "([^"]*)"/s')`). Con `/s` y `.*?` esas expresiones cruzan bloques —un producto sin ese campo hace que la sustitución caiga en el siguiente— y el bloque a insertar iba como cadena de reemplazo, así que un `$` o un `\` en un nombre corrompía el fichero. Lo que se rompía no era una página: era el catálogo del que dependen home, menús, las 44 fichas, el carrito y el checkout, y la recuperación era restaurar por FTP.

Reglas:
- **PHP no abre `data/products.js` para escribir.** `scripts/qa/catalogo.js` falla si alguien vuelve a hacerlo.
- El navegador carga `product-overrides.js` **antes** que el catálogo (`async=false`, en los cuatro cargadores). Si no llega, se ven los precios de `products.js`: viejos quizá, nunca rotos — comprobado en `scripts/qa/catalogo-overrides.js`.
- El backend lee el catálogo *mezclado* con `catalog_products_merged()` (índice generado + capa operativa): el listado del panel, la validación de precios de los pedidos y el catálogo de descuentos salen de ahí, ya sin una sola expresión regular.
- Solo se aceptan tres campos operativos (`priceText`, `compareAtPriceText`, `stock`). Que el panel pudiera tocar `href` o los ejes sería volver a tener dos escritores de la misma verdad.
- Un producto creado desde el panel vive en `extras` hasta que alguien lo redacta en condiciones (fotos, ejes, textos) y lo mueve a mano a `products.js`.
- Una baja se marca en `ocultos`: desaparece de la web al instante y es reversible.

`python scripts/qa/panel-precio.py [base]` hace el viaje completo contra el sitio real: cambia un precio por la ruta del panel, comprueba que la web lo refleja y que `products.js` no ha cambiado, y lo devuelve a su valor. **Ojo con el formato al probar**: el backend normaliza `1.111 €` a `1,11 €`.

### Va a haber MUCHOS más productos: qué escala y qué no

Hoy son 44. Las decisiones de arriba están medidas con 44, y varias cambian de signo al
crecer. Lo que se sabe, con números reales:

| pieza | hoy (44 productos) | qué pasa al multiplicar |
|---|---|---|
| `data/products.js` | 121 KB (19,7 KB gz) | **ya resuelto**: se cachea con revalidación (304) |
| parrilla de la home | 90 KB de marcado, 12 600 px, ~800 ms de pintado | crece lineal: el velo de la vuelta atrás también |
| fotos de la home | 32 imágenes, 513 KB en la vista por defecto | crece lineal; el `loading="lazy"` no basta en redes lentas |
| hornear el HTML | cuesta 4 puntos | cuesta MÁS: la decisión no se invierte, empeora |
| `scroll-memoria.js` | ancla por `id` | escala bien: es O(1), no depende de cuántos haya |
| `attributes-index.json` | generado | crece, pero es del backend y no viaja al cliente |

**`data/products.js` era la línea que peor escalaba y ya está arreglada.** Estaba en el
grupo `no-store` del `.htaccess` desde cuando el panel lo reescribía con expresiones
regulares. Desde el cambio a un solo escritor el panel toca `product-overrides.js` y no
este fichero, así que prohibir guardarlo solo servía para reenviar 121 KB en **cada vista
de cada página** — lo carga el sitio entero. Ahora es `no-cache`: el navegador lo guarda
y pregunta siempre, y el servidor contesta **304 con el cuerpo vacío**. Medido: home
121 046 B → ficha 0 B → checkout 0 B. `product-overrides.js` (535 B) y
`asset-version.json` (30 B) siguen en `no-store`, que es donde tienen que estar.
Comprobado con `panel-precio.py` que un precio cambiado desde el panel se sigue viendo al
instante (`PANEL_E2E_OK`).

**Hecho el 1 de septiembre de 2026: la portada dejó de pintar el catálogo entero.**
Era lo que quedaba anotado aquí como «lo que habrá que hacer y todavía no toca», y el
eje para hacerlo resultó ser el que ya estaba previsto: las categorías. Ver la sección
siguiente.

### Cada categoría, en su página (1 Sep 2026)

La portada pintaba **las tres categorías a la vez** —59 patinetes + 22 accesorios + 1
repuesto, 82 tarjetas y 22 342 px— porque las píldoras de categoría **solo llevaban el
scroll** de una sección a otra: no cambiaban lo pintado. Ahora hay tres páginas:

| | tarjetas | alto |
|---|---|---|
| portada, antes | 82 | 22 342 px |
| portada, ahora | 12 (8 del escaparate + 4 del pack) | 8 551 px |
| `/patinetes` | 59 | 9 909 px |
| `/accesorios` | 22 | 5 620 px |
| `/repuestos` | 1 | 1 573 px |

**No hay un motor nuevo.** Las tres páginas las pinta el mismo `js/index.js`; lo único
que cambia es que su root declara `data-solo-categoria="electric-scooters"`, y
`getOrderedHomeCategories()` filtra por ahí. La portada no lo declara y se comporta como
siempre. `normalizeHomeCategoryKey()` devuelve esa clave sin mirar nada más: en
`/patinetes` no hay píldoras que pulsar ni categoría guardada que recuperar.

**El HTML de las tres lo genera `scripts/build-categorias.py`** (`--check` falla si están
desfasadas). La cabecera, el menú móvil y el pie se **leen de `index.html`**, y el panel
de filtros de `partials/filtros.html`: copiados a mano, cada arreglo en la portada habría
que repetirlo en cuatro sitios y el cuarto se olvidaría. Lo propio de cada página son sus
textos y su clave.

Cinco cosas que costaron, todas medidas:

- **`boot()` preguntaba «¿soy index.html?» mirando `[data-hero-carousel]`.** Valía
  mientras la portada fuese la única página con catálogo. `/patinetes` cargaba sus diez
  scripts y se quedaba con el hueco vacío, sin un solo error en consola. Ahora son dos
  marcadores, porque son dos trabajos: el carrusel es la portada, `#comprar` es una
  parrilla. Y `#comprar` y no `[data-home-catalog-root]` a secas: ese atributo es el
  contrato de estilo de la tarjeta y lo llevan también el escaparate y los relacionados.
- **`initMarcasRiel()` estaba detrás del `return` de `initHomeCategoryNav()`**, que sale
  si no hay barra de píldoras. En una página de categoría —que no las tiene— elegir una
  marca no hacía nada.
- **La cabecera de categoría NO puede ser un `<header>`.** Ya estaba avisado aquí por los
  rótulos de tramo: `header{position:fixed; z-index:80}` en `main.css` **es** la cabecera
  del sitio y convierte en barra fija cualquier `<header>` del documento. Con uno, la caja
  tapaba el botón de filtros y el clic no llegaba nunca.
- **El ancla de la URL se calculaba restando solo el alto de la cabecera** y se saltaba
  **una** vez. Debajo hay otra barra pegajosa (60 px), así que el rótulo quedaba tapado; y
  lo que hay por encima sigue creciendo un rato, así que `/patinetes/#ecoxtrem` acababa
  95 px por debajo. Ahora se resta `getHomeStickyOffset()` y se re-ancla 900 ms o hasta
  que el cliente toque la página. Esto empezó a importar de verdad porque el menú de
  Productos pasó a usar ese camino.
- **Los menús enlazaban a `/#series-joyor`**, un ancla de la portada. La ruta de cada
  categoría se declara ahora en `data/products.js` (`pageUrl`) y se pregunta con
  `SCOOTSHOP_getCategoryUrl()`: un solo sitio donde está escrita.

La portada dejó de titularse «Patinetes eléctricos»: ese término ya tiene su página y dos
URL del mismo sitio compitiendo por la misma búsqueda se estorban.

**El menú son las categorías.** Donde había «Productos · Preguntas · Legal» hay
**Patinetes · Accesorios · Repuestos**, con la actual marcada (`aria-current="page"`, que
es la píldora roja que antes llevaba «Inicio»). Preguntas y Legal siguen enteras en el
pie, que es donde se buscan; sus enlaces del menú eran anclas de la portada. En **móvil**
cada categoría es una fila con **dos objetivos**: el nombre navega a la página y la flecha
abre el cajón con sus marcas (`data-mm-cat` → `SS_PRODUCT_MENUS.panelDeCategoria()`), cuya
primera fila es «Ver todos». Antes había un solo cajón, «Productos», con las tres
categorías apiladas dentro: ese nivel intermedio dejó de tener sentido el día que cada una
tuvo página.

Dos cosas que costaron aquí:

- **El menú móvil está DOS VECES**: la portada lo lleva en línea (`data-inline="true"`) y
  las demás páginas lo piden a `partials/mobile-menu.html`. Se cambió uno y no el otro, y
  la portada se quedó con el menú viejo mientras las fichas ya tenían el nuevo, **sin que
  fallara nada**. Ahora `build-categorias.py --check` compara los dos y falla si divergen.
- **El desplegable de escritorio ya no se monta** (`[data-products-desktop-root]` no existe
  en ningún HTML). `initDesktop()` está delegado en `document`, así que no rompe nada, pero
  `renderDesktop()` en `products-menu.js` quedó sin consumidores.

**Motos y bicicletas siguen apagadas y NO tienen página.** `podarCategoriasOcultas()`
borra sus tarjetas al arrancar. El día que se enciendan son dos líneas en `CATEGORIAS`
(dentro de `build-categorias.py`) más su `pageUrl` en el catálogo.

**La parte alta de cada categoría, en orden (2 Sep 2026):** migas → titular → riel de
marcas → barra de filtros → parrilla, y la entradilla **al final** de la página. Antes la
barra de filtros iba *antes* del riel —se pedía filtrar sin haber enseñado todavía entre
qué se elige— y la entradilla eran tres líneas entre el titular y las marcas.

- El titular va en **Russo One**, versalitas e inclinado. La inclinación es `skewX(-7deg)`
  sobre un `<span>` interior, **no `font-style:italic`**: Russo One no tiene cursiva, así
  que el navegador se la inventa y cada uno de forma distinta. El `<span>` existe porque el
  skew necesita una caja propia; sobre el `<h1>` arrastraría su margen y su ancho de bloque.
- **El riel se MUEVE, no se repinta.** `colocarBarraTrasElRiel()` traslada la barra al DOM
  una vez pintado el catálogo. El riel tiene que seguir colgando de
  `.home-category-section`, que es donde `aplicarFiltroDeMarca()` busca sus placas y su
  línea de descripción; sacarlo de ahí lo deja sin filtro.
- Arriba hay **una sola franja blanca** (titular + marcas + barra). El riel es transparente
  y dejaba ver el gris del `body`, así que la página salía a rayas justo donde más se mira.
  Solo en categoría: en la portada ese gris es lo que separa una categoría de la siguiente.
- Y por eso mismo la placa elegida lleva ahí un filo `inset`: es blanca al 68 %
  (`#ffffffad`, elegido a mano) y sobre blanco se quedaba sin contorno — «TODOS» flotaba.

**La miga de pan es UNA pieza, y su segundo eslabón es una PÁGINA.** Estaba definida dos
veces —`.breadcrumb` (tarjetas.css, fichas) y `.cat-miga` (index.css, categorías)— y habían
derivado: 16 px y peso 800 contra 13,1 px y peso normal, la misma navegación con dos voces.
Todo lo suyo vive ahora en `main.css`, que lo cargan todas las páginas (**las fichas no
cargan `index.css`**): la letra y también el hueco. El reparto es el de la ficha —26 px
arriba, 10 abajo—, porque la miga **pertenece al titular**: tiene que estar más cerca de él
que del borde de la cabecera. Con 17/15, como estaba la categoría, flotaba a medio camino
sin pertenecer a nada, y eso es lo que se leía como «está más arriba».

Los 26 son UN número (`--miga-arriba`), pero cada página llega por su lado: la ficha cuelga
de un `.page-wrap` que ya pone 8 px y solo necesita 18; la categoría no tiene ese envoltorio
y los pone todos. Se descuenta en el propio CSS, no a ojo en cada hoja.

En **móvil la miga cabe en una línea siempre**: lo que cede es el último eslabón, que se
recorta con puntos suspensivos. No es un enlace —solo dice dónde estás, y eso lo repite el
titular justo debajo—, y con un nombre largo rompía en dos líneas dejando el separador
colgando solo al final de la primera (54 px de alto contra 23).

Y el contenido estaba peor: **las 87 fichas apuntaban a anclas de la portada que murieron**
cuando dejó de pintar el catálogo (`/#comprar` ×74, `/#series-motos` ×3, `/#series-k` ×2), y
el segundo eslabón decía lo que le parecía — «ROVORON» (una marca), «Serie N» (una serie),
«Productos» (nada). Ahora dice la **categoría**, que es la única con página propia, y la
categoría sale del catálogo, no de la ruta del fichero. Motos y bicicletas, apagadas y sin
página, se quedan en dos niveles: no se inventa un eslabón que no lleva a ningún sitio.

`node scripts/qa/paginas-categoria.js [base]` es el guardián (`CATPAG_OK`): una sola
sección por página, todos sus productos, sin píldoras, canonical y h1 propios, el riel
filtrando, el panel diciendo de quién es y con los mandos que tocan, el carrito, y que la
**portada no vuelva a pintar catálogo**. Comprueba además **la barra a 12 anchos**, con los
dos lados de cada corte: el menú crece cada vez que cambia un nombre o la letra, y cuando
ya no cabe no falla de forma visible — se monta encima del logotipo y ahí se queda. Y
comprueba, leyendo el disco sin navegador, que **ninguna miga de ficha apunte a algo que no
sea una de las tres páginas de categoría**.

**Lo que sigue sin tocar: dentro de una categoría se siguen pintando todos de una vez.**
59 caben; 200 no. La salida es la misma de siempre —paginar o cargar por tramos— y la
memoria de scroll está preparada: ancla a un `id` de producto, no a un píxel, así que
sobrevive a que la lista cambie de tamaño; solo habrá que guardar en `history.state`
cuántos tramos había cargados.

### Los packs: una oferta con precio REAL, no un cupon (5 Sep 2026)

Un **pack** es un conjunto de articulos que, comprados juntos, valen otra cosa. Se
declara en `data/products.js` (`SCOOTSHOP_PACKS`) y lo lee **todo el mundo desde ahi**:

```
data/products.js  (PACKS + SCOOTSHOP_resolverPacks)
  -> portada, cajon del carrito, /checkout, /pago     lo PINTAN
  -> scripts/build-attributes-index.js  ->  data/attributes-index.json
       -> api/index.php  packs_apply_to_cart()        lo COBRA
```

Reglas, escritas una vez y aplicadas en los dos lados: el pack se aplica solo si estan
**todos** sus articulos con su cantidad; `precioPack` es por unidad y `precioPackTotal`
por el lote entero («3 por 10 €» no es «a 3,33»); lo que sobre de una linea se cobra al
precio de siempre; y un articulo puede valer **0 dentro del pack** aunque como precio de
catalogo el 0 este prohibido (*«nunca precio 0 silencioso»*).

**Antes esto era un codigo de descuento** (`PACKTANKDUAL`, ya desactivado), porque el
backend tarifa con el precio de catalogo y descarta el del navegador. Cuadraba el total,
pero convertia una oferta en un vale: el resumen decia «Descuento −36,99 €» en vez de
enseñar la bolsa GRATIS y el manillar a 32,99, el pedido guardaba un descuento en vez de
una oferta, y bastaba que el cupon no validara para cobrar el precio suelto — que es
justo lo que pasaba.

Dos trampas, las dos pisadas:

- **`attributes_index()` tiene una LISTA BLANCA.** Copia `labels`, `products`, `byHref`
  (y ahora `packs`) y **tira en silencio todo lo demas**. El indice del servidor traia
  los packs, `catalog_packs()` veia una lista vacia y el pedido se cobraba a 849,98 €
  con la pantalla diciendo 812,99. Al añadir algo al indice hay que añadirlo *tambien*
  a esa lista.
- **`/checkout` y `/pago` se pintan ANTES de que llegue el catalogo** (lo añade
  `global-assets-app.js` de forma diferida), asi que el pack no se puede resolver al
  cargar. Las dos repintan sus cifras al cumplirse `SS_READY` — solo cifras y chips,
  nunca el HTML de la lista, que volveria a pedir las fotos.

Y una que NO es trampa sino diseño: **`order_pricing_preview` ignora `cart_items`**
(tarifa solo el `sku` suelto), asi que no sirve para comprobar lo que se va a cobrar por
un carrito. Quien tarifa de verdad es `resolve_order_pricing()`.

### Asset versioning & cache-busting (important, easy to break)
There is no content hashing. Cache-busting is a single global version string in `asset-version.json` (`{"v":"YYYYMMDD-N"}`) mirrored into each page's `<meta name="asset-version">`.

`js/index-head.js` (home) and `js/global-assets.js` (other pages) implement the same protocol:
1. Paint immediately using the meta-tag version, appending `?v=<ver>` to dynamically loaded scripts/assets.
2. Fetch `asset-version.json` (no-store) in the background; cache it in `sessionStorage` for 10 min.
3. If the server version is newer, reload the page once with an `__av=<ver>` marker so stale HTML refreshes.
4. A cross-tab `storage` event (`scootshop_asset_bust`) forces other open tabs to reload to the new version (driven by the `admin_bust_cache` routes).

When editing CSS/JS, bump the version (`bump-assets-version.ps1`) so clients pick it up — the `.htaccess` serves `.css`/`.js` as `immutable, max-age=1yr`, while HTML and the bootstrap files (`products.js`, `asset-version.json`, `index-head.js`, `global-assets.js`, `asset-sync.js`) are `no-store`.

**Localised bust, to avoid a global bump for one JS file.** A bump invalidates every asset for every visitor *and* forces deploying all HTML together (a page whose `<meta>` disagrees with `asset-version.json` reloads on every visit). So a JS file loaded from a `no-store` file carries its own `&r=<rev>` suffix, bumped by hand when that file changes: `cart-runtime.js`, `global-assets-app.js` and `product-attributes.js` from `global-assets.js`, `pago.js` from its static tag in `pago.html`. This works for JS only — **never for CSS**, whose stylesheet URLs the runtime re-seals from `asset-version.json`. A file linked statically by many pages (`product-enhancements.js`: 44 fichas) is not worth busting this way; it rides the next global bump.

**Images are NOT part of this scheme — never version them.** Image URLs must carry no `?v=`: not in HTML, not written from JS, not appended at runtime. Two separate failures come from breaking this, both measured on the M41 Armored Dual page (Aug 2026):

- Every bump invalidates them. The page is 1652 KB, of which 1554 KB are photos, so a bump for 46 KB of CSS forced a 1.1 MB re-download. Cached the page paints in 136 ms; cold, 576 ms.
- **Duplicate downloads.** When HTML and JS disagree on the URL shape (one with `?v=`, one without), the browser starts fetching one, some code rewrites the `src`, it discards the in-flight request and fetches the other. The image goes blank in between — that is the flicker users report. It peaked at 25 photos downloaded twice on a single page.

The bump script leaves images alone by default (`-ConImagenes` re-versions them, and reintroduces the mismatch above). Two guards enforce this, both listed under Smoke / QA: `check-image-cache.ps1` (static) and `check-image-dupes.js` (drives a real browser and watches traffic — needed because the worst offender never contained the string `?v=`; it was a generic `bumpAttr(img, "src", ver)` in `global-assets-app.js`). Run both after touching anything that emits image URLs.

### Volver atrás: `js/scroll-memoria.js` es el ÚNICO que mueve el scroll (14 Aug 2026)

Antes había **cinco** trozos de código tocando la posición, cada uno colgado de un
evento distinto y sin nadie que arbitrase: un `<script>` en línea que escondía la home
entera si existía `sessionStorage.ss_scrollY`; un bloque de 68 líneas en `index.js` que
saltaba al píxel guardado y lo re-aplicaba diez frames; el inline de cada ficha, que
forzaba el tope cuatro veces; `global-assets.js`, con `scrollRestoration='manual'`
global más otro tope forzado en `pageshow`; y dos comprobadores de versión que pueden
hacer `location.reload()`. Ganaba el que llegase más tarde, y de ahí las quejas: unas
veces volvías a tu sitio, otras arriba, otras a un sitio cualquiera.

Todo eso está **borrado**. Ahora manda un módulo, con tres decisiones:

1. **La posición vive en `history.state`, no en una marca global de la pestaña.** Ese
   estado viaja con SU entrada del historial: al pulsar "atrás" está, en una visita
   nueva no está. Antes era imposible distinguirlo y entrar por el logo te devolvía a
   mitad del catálogo — medido, y ahora es un caso del guardián.
2. **Se guarda un ELEMENTO, no un píxel** (`{id, dy}` con el desplazamiento respecto al
   borde superior). Las tarjetas ya traen identidad estable (`id="p-s3"`). El píxel se
   aplica igualmente al instante como aproximación, y el elemento manda en cuanto
   existe: en la home lo pinta el JS del catálogo ~800 ms después de la aproximación.
3. **Se re-ancla hasta agotar el plazo (3 s), no hasta que la altura parezca quieta.**
   Parar en cuanto la altura llevaba tres frames igual estaba mal: se queda quieta un
   instante mientras las fotos siguen cargando. Medido: paraba a 853 px del sitio.

Reglas que no se pueden romper:

- **Nadie más llama a `window.scrollTo()` para posicionar una página.** El ancla de la
  URL (`/#faq`) sí sigue en `index.js`, porque el destino no existe hasta que el
  catálogo se pinta; es la única excepción y está comentada allí.
- **Si `pageshow.persisted` es true no se hace nada**: el navegador ya ha restaurado, y
  lo hace mejor. Forzar el tope ahí era justo lo contrario de lo que el cliente quiere.
- **Una zona cuyo contenido cambia en cada carga se marca con `data-scroll-volatil`.**
  "También te puede interesar" hace `shuffle(related)`: su `id` no es una posición, y
  anclar ahí te lleva a otro producto. Está puesto en `product-enhancements.js`.
- El velo (`html.ss-volviendo`) lo pone el inline del `<head>` —hay que decidirlo antes
  del primer pintado— y lo quita el módulo en cuanto la posición es creíble. Solo
  aparece en una vuelta real, y dura ~670 ms en móvil lento (antes 816 ms en TODA carga
  de la home). Desaparecerá del todo el día que la parrilla venga en el HTML.

**Hornear la parrilla de la home: probado, medido y DESCARTADO (por ahora).** La causa
raíz de todo esto es que `index.html` trae `[data-home-catalog-root]` **vacío** y los 44
productos —12 600 px— los pinta el JS. `scripts/build-home-catalog.js` los mete en el
HTML pidiéndole el marcado al mismo código que lo pinta, y `renderHomeCatalog()` se
salta el repintado cuando la firma coincide (reescribir `innerHTML` con lo mismo tira
las `<img>` y las vuelve a pedir). Funciona: primer frame con 44 tarjetas y 12 489 px de
alto, cero fotos duplicadas, animación de entrada intacta, y el velo de la vuelta baja
de 670 a 340 ms. **Y aun así sale perdiendo**, A/B con servidores concurrentes, 4 tomas:

| | score | FCP | LCP | SI |
|---|---|---|---|---|
| sin hornear | 72/71/69/69 | 2418 | 10704 | 2959 |
| horneada | 69/66/67/67 | 2865 | 12613 | 4393 |

84 KB más de HTML, 44 subárboles más que maquetar y una decena de fotos de tarjeta que
el navegador descubre a los 220 ms y le disputan el ancho de banda a la portada, que es
el LCP. Como la vuelta atrás YA acierta al píxel sin esto, no compensa. Se conserva el
generador —y el `ss-sin-entrada` que necesita— por si algún día el SEO de la home pesa
más que cuatro puntos: es un comando y desplegar `index.html`.

`node scripts/qa/volver-atras.js [base]` recorre los cinco caminos con un navegador de
verdad y dice `VOLVER_OK`. Dos trampas al escribir pruebas de scroll, las dos pisadas:
`elemento.click()` de Playwright **centra el elemento antes de pulsarlo** y mueve el
scroll que estás midiendo (parecía un fallo de 1 488 px y era la prueba); y la tarjeta
de la home **no es un enlace**, es un `<article>` con `location.href` en el manejador,
así que buscar `a.card` no encuentra nada.

### Rendimiento: qué se hizo y qué NO se puede tocar (13 Aug 2026)

Medido con Lighthouse contra producción, antes → después. Móvil: home 65 → **91**, ficha
66 → **88**, checkout 72 → **89**. Escritorio: home 97 → **100**, ficha **96**, checkout
**100**. Nada de esto cambió el diseño: las 10 capturas por elemento del selector (1440 y
390 px) salen idénticas al píxel, `ICONOS_WEB_OK` y `VARIANTES_OK` siguen en verde, y la
tipografía se comprobó midiendo el ancho de una frase con canvas en cada familia y peso
(`GLIFOS_IDENTICOS`) — no basta con que "se vea parecido".

Tres cosas, en orden de lo que costaban:

1. **Los `<script>` de la ficha ya no bloquean el primer pintado.** `data/products.js` y
   `js/product-enhancements.js` iban SÍNCRONOS al final del body: 522 ms de evaluación solo
   el segundo, con el CSS ya listo a los 434 ms y el primer pintado esperando hasta los
   2 711 ms. Ahora los dos llevan `defer` — y la etiqueta de `global-assets.js` se movió del
   `<head>` al final del body para que el ORDEN DE EJECUCIÓN no cambie: hoy es
   products → enhancements → global-assets (los dos primeros eran síncronos y el tercero ya
   era `defer`), y con las tres en `defer` el orden lo da el orden del documento. Medido en
   la ficha del M41: FCP 4 832 → 2 032 ms, LCP 4 952 → 2 380 ms. **Si algún día se añade un
   script a una ficha, va con `defer` y después de esos tres**, o vuelve el bloqueo — de eso
   se encarga `scripts/qa/carga-no-bloqueante.py`, que vigila el atributo y el orden.
2. **Las fuentes de texto se sirven desde el propio dominio** (`scripts/build-web-fonts.py`,
   `css/fuentes*.css`, `fonts/*.woff2`). Son los MISMOS `.woff2` que sirve Google, con sus
   `unicode-range` intactos; lo que desaparece son dos orígenes con su DNS y su TLS
   (`fonts.googleapis.com` para la hoja, `fonts.gstatic.com` para los ficheros). Con la
   precarga de los dos ficheros de arriba, el intercambio de tipografía deja de ocurrir
   tarde: **CLS 0,0515 → 0,0024** y FCP 2 032 → 1 792 ms.
   Hay **seis hojas** porque hay seis combinaciones de pesos declaradas por el sitio, y eso
   es a propósito: una página que no declara el 500 pinta ese texto con el 400, y
   declarárselo lo engordaría. Unificarlas es una decisión de diseño, no de rendimiento.
3. **Las fuentes de iconos, recortadas** (`scripts/build-icon-fonts.py`): 267 KB desde cdnjs
   → 5 KB desde aquí, solo con los glifos que `icons.css` declara. Su `--check` es el
   guardián: añadir un icono al CSS sin regenerar deja un hueco en blanco.

Lo que se probó y **no** vale la pena: bloquear las 24 miniaturas de la galería o las fotos
de accesorios ahorra 30 ms de LCP (medido, no estimado); el prefetch de la galería ya está
acotado a 4 fotos y va en tiempo de inactividad. Lo que Lighthouse sigue pidiendo —minificar
JS y CSS, 320 + 140 ms— exigiría un paso de compilación, y este sitio no tiene ninguno a
propósito: lo que se lee en el repositorio es lo que corre en producción.

### Rendimiento: la cuarta tanda (4 Sep 2026)

Medido con Lighthouse móvil contra producción, **antes → después**. El *score* de esta
máquina oscila 63–94 entre pasadas por el artefacto de TBT ya conocido
(`_lighthouse-eval.js`, ~1 850 ms, sale también en páginas que no llevan el módulo que se
esté midiendo), así que lo que se mira aquí es **LCP y peso**, que sí son estables:

| | peso | LCP |
|---|---|---|
| portada | 1 593 → **957 KiB** (−40 %) | 4,1 → **3,5 s** |
| /patinetes | 524 → **498 KiB** | 2,7 → 2,7 s |
| ficha M41 Armored | 1 797 → **1 401 KiB** (−22 %) | 4,1 → **3,5 s** |

Nada de esto exigió un paso de compilación: lo que Lighthouse sigue pidiendo —minificar
JS y CSS— se sigue descartando por lo mismo de siempre.

**1. Tangerine, recortada a la palabra que escribe (−21,6 KB en TODAS las páginas).**
Esa familia pinta UNA cosa en todo el sitio: el «Versátil» de la cabecera
(`.brand span`). Su `.woff2` completo pesaba 24,8 KB y viajaba en todas partes; el
recorte con `text=` pesa 3,2 KB. Se pide **aparte** en `build-web-fonts.py`, porque
`text=` se aplica a todas las familias de la consulta y metido en la grande recortaría
también Plus Jakarta Sans y Russo One, que sí pintan texto variable. Su URL no acaba en
`.woff2` (Google la sirve desde `/l/font?kit=`), así que necesita su propia expresión.
Se **conserva** el `unicode-range` que devuelve Google: si algún día se pinta en
Tangerine otro texto, el navegador cae a la cursiva de reserva en vez de dibujar huecos.

**2. `scripts/optimiza-imagenes-fijas.py` — las imágenes que no son de producto.** Las de
producto las cuida `convert-to-webp.py`; estas otras no las miraba nadie y por eso
engordaban. Cada entrada declara de dónde sale, a qué tamaño se sirve, con qué calidad y
su **presupuesto** en bytes, y `--check` es el guardián. Es idempotente: varios trabajos
leen del mismo fichero que escriben, y sin eso cada pasada recomprimía sobre lo ya
comprimido.

- **Los dos grafitis de la oferta: 234 → 39 KB.** No cedían recomprimiendo (7 % a lo
  sumo) porque lo que pesaba era el **canal alfa**. Se **precomponen sobre `#1c1c1c`** y
  se guardan sin alfa: se ve idéntico, y es aritmética, no un apaño — el navegador pinta
  `0,17·imagen + 0,83·fondo`, y donde la imagen era transparente el resultado ya era el
  fondo. **Si cambia el fondo de `.home-featured` hay que cambiar `FONDO_OFERTA` y
  regenerar**, o aparecen dos rectángulos.
- **Las tres tarjetas de categoría: 262 → 141 KB.** Se ven a 421×360 y estaban a 860×750.
  A 700 siguen siendo 2× en el móvil. **Se rehacen desde el WebP y NO desde el PNG
  original**: el original es 4:3 y el WebP es un recorte 7:6 hecho a mano cuyo encuadre
  nadie apuntó — partir del PNG cambia el encuadre de las tres (probado).
- **Los logos de marca: 155 → 68 KB.** Se pintan como mucho a 240 px y venían a
  1 000–1 561. Conservan el alfa (son recortes sobre la placa), así que el script no los
  aplana. Al cambiar de tamaño hay que actualizar las medidas intrínsecas que declaran
  16 HTML y `js/index.js` (`logoW`/`logoH` de rovoron y dualtron).

**3. `SCOOTSHOP_miniatura()` — la foto pequeña (−620 KB en la ficha).** Una miniatura de
56 px estaba bajando la foto original: en la caja de «Añade algo más» del M41 había
620 KB de foto para nueve cuadraditos, la mayor de 107 KB para 3 136 píxeles de pantalla.
El accesor vive en `data/products.js` —quien sabe cómo se llaman las fotos de un producto
es el catálogo— y lo usan la caja de compatibles (56×56), el cajón del carrito (70×70) y
los resúmenes de `/checkout` y `/pago`. Cambia `…/img/N.webp` por `…/img/N-400.webp` solo
en rutas de carpeta de producto, y **`node scripts/qa/fotos-mini.js` comprueba que las 87
portadas tienen su medida**, porque desde el navegador no se puede preguntar al disco.

**4. La cartelera ya no baja las ocho creatividades (−320 KB en móvil).** Pesaban 547 KB y
se bajaban **todas** al abrir para enseñar una. `loading="lazy"` no las paraba: el raíl es
horizontal, las ocho están a la misma altura y para el navegador entran todas en el margen
de carga. De la tercera en adelante la foto va en `data-src`/`data-srcset` y la pone el
carrusel cuando la diapositiva se acerca (`hidratarLoVisible`, `js/index.js`). Se hidrata
**por geometría y sobre todos los hijos del raíl, clones incluidos** —un clon se copia con
su `data-src`, así que sabe hidratarse solo; sin eso, los clones que asoman por la
izquierda en escritorio salían en blanco—. El margen es **medio** ancho de ventana: con
uno entero, en escritorio se volvían a pedir las ocho. No añade un modo de fallo nuevo:
sin JS el carrusel no se mueve de todas formas. Medido: móvil 7 creatividades → 3, cero
huecos en blanco, `PORTADA_CLICK_OK`.

**5. La precarga de galería se salta también el 3g.** Son cuatro fotos completas (326 KB
en el M41) y su único premio es que pulsar una miniatura sea instantáneo; en 3g tardan más
en llegar de lo que el cliente tarda en pulsar. Ya se saltaba `saveData` y 2g.

**Lo que sigue pendiente y es lo próximo que más pesa:** solo **96 de las 747 fotos de
galería** tienen medidas responsive, así que pulsar una miniatura baja el original de
1 400 px incluso en el móvil (`setMainImageSrc` quita el `srcset` a propósito, porque el
inicial describe la portada). Generarlas para todas son ~650 ficheros y ~29 MB de
despliegue; hasta entonces, la precarga acotada es la mitigación.

**Limpieza de la misma tanda:** fuera `.section-header`, `.feature-*`, `.f-icon`,
`.about-*`, `.cat-showcase-grid` y `.home-catalog-*` (muertas desde que las categorías
tuvieron página y desde la fusión de secciones de hoy), y seis glifos de Font Awesome sin
consumidor —regenerando las fuentes de icono, que quedan en 3,5 KB—. El detector deja seis
avisos y **los seis son falsos positivos ya conocidos**: `.btn-hosted-pay--*` y
`.header-account-dot--*` se componen por concatenación, y `.menu-products-host` es el
desplegable de escritorio que ya no se monta (2,2 KB; se deja, quitarlo es una decisión de
producto, no de rendimiento).

### La cabecera se ve desde el primer fotograma (8 Sep 2026)

El menu «se distorsionaba» al cambiar de pagina. Eran **tres** fallos distintos, no
uno, y solo se ven con la red lenta (medido a 900 kbps y 150 ms de latencia):

**1. Tangerine no se precargaba.** Es la fuente que escribe el «Versatil» de la
cabecera, y de las tres que usa el sitio era la unica sin `<link rel=preload>`: el
navegador no la descubria hasta despues de leer el CSS. Con `font-display:swap` eso
significa pintar la palabra con la cursiva de reserva y cambiarla despues. Medido en
`/accesorios/`, el ancho de «Versatil» iba **49 -> 102 -> 60 px**: tres formas en dos
segundos. Ahora va precargada en las 105 paginas y su `@font-face` es el unico con
**`font-display: block`** — no se pinta hasta tenerla. Se puede hacer *solo* con esta
porque escribe UNA palabra y pesa 3,2 KB desde este dominio (llega a los 781 ms con la
red frenada); en un parrafo, `block` seria texto invisible. Lo pone
`scripts/build-web-fonts.py`, asi que sobrevive a regenerar las hojas.

**2. Treinta y cinco fichas seguian pidiendole las fuentes a Google**, y ademas con la
hoja aplazada a proposito (`media="print" onload=...`), asi que su cabecera se pintaba
con la letra de reserva hasta que respondian dos origenes externos con su DNS y su
TLS. No era una chapuza suelta: **la plantilla las emitia asi**, de modo que cada
producto nuevo nacia roto. Migradas las 35 y arreglada `new-series-product.ps1`.

**3. Noventa y una paginas pintaban la cabecera con JavaScript.** Traian
`<div id="site-header-slot"></div>` vacio y lo rellenaba `loadPartial()` tras pedir
`/partials/site-header`. Medido en una ficha:

| | la cabecera aparece |
|---|---|
| primera visita | **no aparece en 4,5 s** (el hueco mide 0 px) |
| segunda visita (cache de sesion) | 946 ms |

`scripts/build-cabecera.py` mete el parcial dentro del hueco. **El parcial sigue
siendo la unica fuente**: el script copia, no escribe; cambiar la cabecera es cambiar
`partials/site-header.html` y volver a correrlo, y `--check` falla si alguna pagina se
quedo atras.

Por que esto si compensa y **hornear la parrilla de la portada no** (ver mas arriba):
aquella eran 84 KB y 44 subarboles disputandole el ancho de banda a la foto de
portada, que es el LCP. Esta son 3,5 KB de marcado que ya se pedia igual —como una
peticion aparte y mas tarde— y encima ahorra esa peticion.

Dos trampas, las dos pisadas:

- **`loadPartial()` habria repintado la cabecera horneada.** Su guard de «no repintes
  si es identico» compara contra la cache de **sesion**, que en la primera visita esta
  vacia; asi que pedia el parcial y sustituia la barra por otra igual, destruyendola y
  recreandola — justo el parpadeo que se venia a quitar. El hueco lleva ahora
  `data-horneado` y con esa marca no se pide nada: solo se hidrata. Sube el `&r=` de
  `global-assets-app.js` al tocarlo.
- **Buscar el hueco con `</div>` no vale**: la cabecera lleva cinco dentro, y una
  expresion no-avara «cerraba» el hueco en el primero. Se cierra con una marca propia
  (`<!-- /site-header-slot -->`).

Resultado, con la red frenada: la cabecera se pinta en **2 fotogramas** (vacio -> final)
y no vuelve a cambiar; **0 peticiones** del parcial; «Versatil» mide 60 px desde el
principio en ficha, categoria y checkout. Comprobado ademas que el menu sigue vivo:
cajon del carrito, chapa de 0 -> 1 y menu movil con sus tres categorias.

La cabecera en linea de `index.html` y el parcial coinciden salvo en 7 lineas, y las
7 son correctas: la portada usa anclas relativas y `aria-current="page"` porque **es**
el inicio.

**Lo que queda igual a proposito:** `mobile-menu-slot` se sigue pidiendo aparte. No se
ve hasta que se pulsa la hamburguesa, asi que su retraso no distorsiona nada; el dia
que se hornee, va por el mismo camino.

### `img/` — una carpeta por oficio (25 Aug 2026)

`img/` es el almacén de las imágenes que NO son de un producto (las de producto viven
en la carpeta del producto: `patinetes/series-n/n7/img/1.webp`). Tenía 65 ficheros
sueltos en la raíz y ahora tiene seis carpetas y tres ficheros:

| carpeta | quién la pide |
|---|---|
| `img/portada/` | el carrusel de la home (`index.html`, 6 creatividades × 4 anchos) |
| `img/pago/` | los logos de método de pago (`pago.html`, `js/pago.js`) |
| `img/marcas/` | logos de serie y el sello DGT (`js/index.js`, `js/product-enhancements.js`, 10 fichas) |
| `img/deco/` | texturas de fondo del CSS (`css/index.css`) |
| `img/limitadores/` | las fotos compartidas por los 4 mandos limitadores |
| `img/mail/track/` | los hitos del correo, generados por `build-mail-track-icons.js` |
| `img/logo/` | el logotipo: `marca-barra.webp` (cabecera), `marca-pie.webp` (la marca en negro que firma el pie) y las dos piezas que escriben el nombre en el titular de la bienvenida |
| `img/cart-collage/` | **caché** que escribe el backend (miniatura del carrito en Stripe); gitignorada |

En la raíz quedan solo tres, y ninguno por descuido: `0-removebg-preview.png` (lo
enlazan los correos YA ENVIADOS), `0-removebg-preview.webp` (es el `og:image` de varias
páginas, y una URL social cacheada no se puede mover) y `0.jpg` (la foto de relleno que
copia `new-series-product.ps1`).

Se borraron 20 ficheros que no pedía nadie: las creatividades anchas 2,33:1 de la
portada (`portada_1..4` con sus ‑480/‑800/‑1200), sustituidas por el arte 4:5, y cuatro
huérfanos —`0.webp`, `card.svg` y, ojo, `logo.webp` y `favicon.ico`, que eran **copias
byte a byte de `0.jpg`**: un JPEG con la extensión cambiada. El favicon de verdad está
en la raíz del sitio (`/favicon.ico`), que es lo que enlazan las 65 páginas.

Dos cosas que hay que saber antes de volver a mover una imagen de aquí:

- **Mover una imagen de `img/` obliga a un bump global.** `css/index.css` y los `js/`
  se sirven `immutable`: un visitante con el CSS viejo en caché sigue pidiendo la ruta
  vieja, así que borrarla le rompe el fondo. Y para CSS **no hay bust localizado** (el
  runtime resella los stylesheet desde `asset-version.json`). Por eso este cambio fue
  bump + los 65 HTML + CSS + JS + las imágenes nuevas, y solo después el borrado.
- **Nunca se mueve lo que ya salió por correo o como `og:image`.** Ese enlace está en
  buzones y en cachés de terceros; no hay redespliegue que lo arregle.

**El nombre de la marca son DOS RECORTES del logotipo original.** `img/logo/scoot-foto.webp`
y `shop-foto.webp` escriben «SCOOT SHOP» en el titular de la bienvenida, y salen de
`img/logo/letras-perfectas.png` — el logotipo en alta resolución, que se queda ahí como
material de partida aunque ninguna página lo pida (declarado en `SIN_CONSUMIDOR` de
`rutas-img.js`, y **no se despliega**).

Antes esto eran trazados SVG hechos siguiendo el contorno de un bitmap de 400 px
(`scripts/logo-a-trazados.js` y `logo-regulariza.js`, que siguen en el repo pero ya no se
usan). Se descartaron porque el material de partida era pobre: por bien que se regularicen
los bordes, un trazado calcado nunca recupera los cortes y muescas propios de estas letras.
Con el original en condiciones, recortar gana de calle.

Tres cosas que hay que saber antes de volver a tocarlas:

- **El fondo del original NO es transparente** (es `#f6f7f8`), así que no vale con borrar un
  color: cada píxel del borde es una mezcla de tinta y fondo. El recorte recupera la tinta
  pura y calcula la opacidad por la distancia al fondo; sin eso queda una orla gris
  alrededor de las letras. `logo-piezas.js` la mide y falla si aparece.
- **Las dos piezas no admiten las mismas medidas.** En SCOOT el dibujo son solo letras; SHOP
  lleva la barra roja debajo, así que 60 de sus 192 px cuelgan por debajo de la línea base.
  De ahí las dos fracciones del CSS —`192/132` de alto y `-60/132` de caída—, escritas sin
  redondear: con 1,4545 el apoyo se iba 1 px. `vertical-align: baseline` apoya el borde
  inferior de la imagen; el margen negativo baja justo la barra, de modo que lo que queda
  apoyado son las LETRAS.
- **Se sirven al doble de lo que se ven** (368 y 313 px en el titular): 760 y 650 px de
  ancho, 61 KB entre las dos. Guardar los 1122 px del original sería pagar peso por píxeles
  que nadie llega a ver.

`node scripts/qa/logo-piezas.js` es el guardián: comprueba que las piezas existen, que SHOP
conserva sus dos tintas, que no hay orla de recorte y —lo importante— que **las fracciones
que el CSS declara son las que las imágenes miden**. Si alguien vuelve a recortar con otro
encuadre, salta ahí y no en producción.

**La marca del pie sale del mismo original y en NEGRO** (`img/logo/marca-pie.webp`, 18 KB),
con `node scripts/build-logo-pie.js`. No vale el fichero de la cabecera: `marca-barra.webp`
es rojo y negro, está hecho para la barra, y en un pie que ya no es oscuro la marca tiene que
firmar, no navegar. El recorte es el problema de siempre —fondo `#f6f7f8`, ningún píxel de
borde es tinta pura—, así que el script **despeja la opacidad**: sabe que cada píxel es
`a·tinta + (1−a)·fondo` con la tinta siendo el rojo o el negro del logotipo, saca la `a` y lo
repinta en `#0b0c0f`. Borrar un color dejaría una orla gris alrededor de cada letra. Su
`--check` regenera y compara byte a byte, así que es su propio guardián.

`node scripts/qa/rutas-img.js` es el guardián: cruza toda ruta `/img/...` escrita en
HTML/CSS/JS/PHP/PS1/PY contra el disco, en los dos sentidos (rota y huérfana). Su
trampa, ya pisada: `"/patinetes/series-n/n7/img/1.webp"` **termina en** `/img/1.webp`, así
que sin un límite por delante las 44 fichas salen todas rotas.

### .htaccess routing
Apache rewrites give the clean-URL behavior the static pages depend on: `/algo.html` → 301 → `/algo`, and `/algo` internally serves `algo.html`. It also forces HTTPS, sets the cache/security headers above, and blocks direct access to `.env`, `api/config.php`, and the local-only `server.ps1`/`server.py`/`router.php`. Local PHP dev does not run Apache, so URL rewriting differs locally vs. prod — test clean URLs against the deployed/`.htaccess`-aware path when in doubt.

## Conventions & gotchas

- **No build/test runner** — verification is the PowerShell smoke scripts plus manual browser checks, not a unit-test suite.
- `.env`, `.env.local` are gitignored; `.env.example` documents every variable. Never commit secrets or print them in deploy commands.
- External services: PayPal (sandbox/live via `PAYPAL_ENV`), Stripe, Google Sign-In, and a Vercel email relay (`VERCEL_EMAIL_ENDPOINT`) with a PayPal webhook proxy on Vercel. Payment env (sandbox vs live) is driven entirely by env vars.
- The local server scripts at the repo root (`server.ps1`, `server.py`, `router.php`) are dev-only and blocked in production via `.htaccess`.
