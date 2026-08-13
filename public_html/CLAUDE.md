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

Smoke / QA (expect terminal markers `LOCAL_START_OK`, `GATE_B_OK`/`GATE_B_KO`, `SMOKE_WEB_OK`, `IMG_CACHE_OK`, `IMG_DUPES_OK`):

```powershell
node scripts/build-attributes-index.js --check                                     # el índice de atributos, al día
node scripts/qa/legacy-metrics.js                                                  # cuánto queda del modelo viejo
powershell -ExecutionPolicy Bypass -File scripts/gate-b-smoke.ps1                  # cart/order payment flow
powershell -ExecutionPolicy Bypass -File scripts/qa/smoke-web.ps1                  # all sitemap.xml URLs + critical routes
powershell -ExecutionPolicy Bypass -File scripts/qa/smoke-web.ps1 -IncludeApiRoutes
powershell -ExecutionPolicy Bypass -File scripts/qa/check-image-cache.ps1          # images must carry no ?v=
node scripts/qa/check-image-dupes.js                                               # no image downloaded twice
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

Still open, and small: the `.color-variant*` CSS class names are a skin, not semantics — a model pill still carries a class that says "color"; and the `.size-variants` sections of the four two-axis fichas are still painted by their own inline script (stage 4), which is why those fichas call `marcarSeleccion` themselves.

**STAGE 5 (cart/checkout presentation) IS DONE AND LIVE (13 Aug 2026).** Deployed on top of `20260813-8`: `js/product-attributes.js`, `js/pago.js`, `js/global-assets.js`, `checkout/index.html`, `pago.html`. Verified **against production** with a real browser: chips (4 views × with/without a 2.5 s catalog delay), drawer A–F, 8 fichas, 10-step commercial smoke, invariants intact. Repro: `/tmp/final.js`, `/tmp/smoke.js`, `/tmp/reg.js` (all take a base URL).

Closed and proven — do not reopen: load order (`async=false`), `attrs` contract, `renderDrawer`, `renderDrawerNow`, `patchDrawerItems`, semantic fallback, slow-catalog path, persistence, storage, `read()`, `sanitizeItem`, `attrsOf`, line identity, SKU, qty, amounts. `attrs` survives end to end.

The checkout chip printed `Color: G2 PRO VMP` instead of `Modelo: …`. The hypothesis written here before — "the summary renders once before `SS_ATTRS.ready`, await it" — was **wrong**, and worth remembering why: the symptom was permanent, not a race. Measured on the page itself: `SS_ATTRS` true, 44 products, `attrs {model:'vmp'}` in storage, and the core asked directly answered `Modelo: G2 PRO VMP` while the page showed `Color: …`. Three real causes, each fixed at its own layer:

1. **Data lost at the read boundary.** `loadCartItems()` (checkout) and `loadCheckoutCart()` (`pago.js`) rebuilt each line field by field and **dropped `attrs`**. A line without `attrs` is legacy, and legacy means colour — no amount of readiness fixes that. Both now copy `attrs` through a `sanitizeAttrs` like the cart's.
2. **Direct-buy lines had no product to resolve against.** `/checkout?…&color=vmp&colorLabel=…` carries no `attrs`, and the line handed to the core carried no `sku`/`url` either, so there was no catalogue entry to read the axis from. Both pages now build that line with `sku` + `url`, and the core gained `rescatarEjeLegacy()`: for a legacy-shaped line on a product with **no colour axis**, the stored value is looked up among the real axes (by option key *or* label). No match ⇒ behaviour identical to before. This also repairs orders and links written before `attrs` existed.
3. **`SS_ATTRS.ready` was resolving without a catalogue** — the note "proven correct" only held for fichas. `anunciar()` decided "this page has no catalogue" by looking for the `products.js` tag **once, at t=0**. On `/checkout` the catalogue is appended later by `global-assets-app.js` (measured: core 67 ms, tag ~78 ms), so `ready` resolved with 0 products and any repaint hanging off it ran too early. Same class as the two dead ends already burned (transient state read as permanent), third disguise. Now the terminal condition is a document **milestone**: resolve when the catalogue appears, or when `load` fires without it. `load` waits for dynamically inserted scripts (measured with the catalogue delayed 2.5 s: load 2866 ms, catalogue 2876 ms, `ready` 2876 ms with 44 products). Do **not** go back to listening on the tag's own `load`/`error`: the tag is discovered by polling, so its `error` can have fired already — measured with the catalogue aborted, `ready` then never resolved at all and the drawer never repainted.

On top of that both summaries repaint once on `SS_ATTRS.ready` (the single frontier, as in the drawer), rewriting **only the chip text** — never the list HTML, which would re-download the photos that `check-image-dupes.js` guards.

**Migration status (Aug 2026):** stages 1–3, 5, 6 and 7 done and live. Pending: **stage 4** — multi-axis accessories, i.e. generating the `.size-variants` sections of the four two-axis fichas from the catalog instead of their inline scripts, plus structured `accessoryCategory`/compatibility so a helmet or a bag declares its axes the same way. Also open, cosmetic: renaming the `.color-variant*` CSS classes, which lie about the axis on a pill.

Two traps, both hit for real:

- `proyectarLegacyEn()` in `cloneProducts()` derives the old `colorVariants` view for consumers not yet migrated. It lives in `cloneProducts()` and not on the `window.SCOOTSHOP_*` globals because `getHomeCategories()` clones independently. It is temporary — delete it once `index.js` and `pago.js` read `SS_ATTRS`.
- Fichas link `product-enhancements.js` with a static tag while `global-assets.js` appends the core deferred, so the core arrives **after** the ficha runs. Consumers wait for the `ss:attrs` event instead of assuming it is loaded. If a second init event ever appears, centralise on a single `SS_ATTRS.ready` promise rather than growing a web of events.

Do **not** write `data-color-key` from the catalog yet: today it holds the label (`Negro`) while the catalog says `negro`, and changing it would split cart-line identity and break stored orders. That conversion belongs with the cart stage, which carries backwards-compatible reads.

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

### .htaccess routing
Apache rewrites give the clean-URL behavior the static pages depend on: `/algo.html` → 301 → `/algo`, and `/algo` internally serves `algo.html`. It also forces HTTPS, sets the cache/security headers above, and blocks direct access to `.env`, `api/config.php`, and the local-only `server.ps1`/`server.py`/`router.php`. Local PHP dev does not run Apache, so URL rewriting differs locally vs. prod — test clean URLs against the deployed/`.htaccess`-aware path when in doubt.

## Conventions & gotchas

- **No build/test runner** — verification is the PowerShell smoke scripts plus manual browser checks, not a unit-test suite.
- `.env`, `.env.local` are gitignored; `.env.example` documents every variable. Never commit secrets or print them in deploy commands.
- External services: PayPal (sandbox/live via `PAYPAL_ENV`), Stripe, Google Sign-In, and a Vercel email relay (`VERCEL_EMAIL_ENDPOINT`) with a PayPal webhook proxy on Vercel. Payment env (sandbox vs live) is driven entirely by env vars.
- The local server scripts at the repo root (`server.ps1`, `server.py`, `router.php`) are dev-only and blocked in production via `.htaccess`.
