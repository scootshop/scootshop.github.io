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

Smoke / QA (expect terminal markers `LOCAL_START_OK`, `VARIANTES_OK`, `CATALOGO_OK`, `API_SQL_OK`, `ATTRS_INDEX_OK`, `GATE_B_OK`/`GATE_B_KO`, `SMOKE_WEB_OK`, `IMG_CACHE_OK`, `IMG_DUPES_OK`).

`scripts/qa/variantes.ps1` runs the whole variant system in one go — catalog, SQL bindings, attribute index, cases A–J, multi-axis fichas, cart flow, accessibility/responsive at three widths, the globalisation test, summary chips and readiness — against local or production. It exists because these suites were born in a session's temp folder: a guard nobody can run is not a guard. `variantes-capturas.js` takes per-element screenshots to compare a design before/after a CSS change (`SS_SHOTS` picks the folder).

```powershell
powershell -ExecutionPolicy Bypass -File scripts/qa/variantes.ps1                  # TODO el sistema de variantes
python scripts/qa/panel-precio.py https://scootshop.co                             # el panel cambia un precio de verdad
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
python scripts/build-web-fonts.py --check                                          # cada hoja de fuentes, con sus .woff2
python scripts/build-icon-fonts.py --check                                         # ningún icono sin glifo
python scripts/qa/carga-no-bloqueante.py                                           # ningún script bloquea el pintado
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

### .htaccess routing
Apache rewrites give the clean-URL behavior the static pages depend on: `/algo.html` → 301 → `/algo`, and `/algo` internally serves `algo.html`. It also forces HTTPS, sets the cache/security headers above, and blocks direct access to `.env`, `api/config.php`, and the local-only `server.ps1`/`server.py`/`router.php`. Local PHP dev does not run Apache, so URL rewriting differs locally vs. prod — test clean URLs against the deployed/`.htaccess`-aware path when in doubt.

## Conventions & gotchas

- **No build/test runner** — verification is the PowerShell smoke scripts plus manual browser checks, not a unit-test suite.
- `.env`, `.env.local` are gitignored; `.env.example` documents every variable. Never commit secrets or print them in deploy commands.
- External services: PayPal (sandbox/live via `PAYPAL_ENV`), Stripe, Google Sign-In, and a Vercel email relay (`VERCEL_EMAIL_ENDPOINT`) with a PayPal webhook proxy on Vercel. Payment env (sandbox vs live) is driven entirely by env vars.
- The local server scripts at the repo root (`server.ps1`, `server.py`, `router.php`) are dev-only and blocked in production via `.htaccess`.
