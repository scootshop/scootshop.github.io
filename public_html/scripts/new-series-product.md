# Alta rapida de producto por serie

Script: `scripts/new-series-product.ps1`

Genera una **ficha canonica completa** (la misma estructura que el resto de fichas, sin
boilerplate a mano) y actualiza el catalogo y el sitemap. Cada ficha generada incluye:

- `<head>` completo: meta SEO, **OG/Twitter estaticos** (las previews de WhatsApp/Facebook
  no ejecutan JS), favicon/PWA, fuentes no-bloqueantes y script de "scroll al tope".
- Set de CSS actual (`icons`, `main`, `partials.mobile-menu`, `tarjetas`).
- Galeria con N miniaturas + bloque de **video** opcional.
- Bloque de precio con wrapper `.price-values` y **badge de descuento calculado** (`-X%`).
- CTA a `/checkout` (con PayPal opcional), envio y acordeon de especificaciones.
- **JSON-LD** completo (Organization + WebSite + WebPage + Product con envio y devoluciones).
- Los scripts criticos: `global-assets.js`, `data/products.js` y `product-enhancements.js`
  (sin estos no se inyectan el sello DGT ni el resto de mejoras).

Tambien actualiza automaticamente:
- la carpeta del producto y su `index.html`
- la imagen placeholder temporal `img/1.jpg`
- `data/products.js` (entrada del catalogo con galeria de N imagenes)
- `sitemap.xml`

## Uso minimo

```powershell
.\scripts\new-series-product.ps1 -SeriesKey n -Slug x5 -Name "X5" -Price 499
```

## Uso recomendado

```powershell
.\scripts\new-series-product.ps1 `
  -SeriesKey n -Slug x5 -Name "X5" `
  -Price 499 -CompareAtPrice 599 `
  -Brand "VIPCOO" -Sku VS6X5 `
  -MotorText "1000 W" -BatteryText "48 V 18 Ah" `
  -RangeText "Hasta 65 km" -TopSpeedText "45 km/h" -WheelText "10 pulgadas" `
  -ImageCount 9 -VideoId "LUEAWEFjcY0" -PayPalId "CFMATL34TKXNQ"
```

## Series soportadas

- `k`, `n`, `gt`, `ix`

## Parametros

Obligatorios: `-SeriesKey`, `-Slug`, `-Name`, `-Price`.

Opcionales:
- `-Brand` (def. = Name), `-Sku` (def. = Name sin espacios en mayusculas)
- `-CompareAtPrice` — si es mayor que `-Price`, genera el precio tachado y el badge `-X%`
- `-MotorText`, `-BatteryText`, `-RangeText`, `-TopSpeedText`, `-WheelText` (def. `Pendiente`)
- `-ImageCount` (def. 1) — nº de miniaturas/galeria (`img/1.ext ... N.ext`)
- `-ImageExt` (def. `webp`) — extension de las imagenes de galeria
- `-VideoId`, `-VideoTitle` — incrusta el bloque de unboxing de YouTube
- `-Description` — copy comercial (admite `<strong>`); si se omite, deja una base editable
- `-Subtitle` — subtitulo bajo el H1 (def. "<Serie> · ficha técnica")
- `-PayPalId` — añade `&paypal=&hid=` al enlace de compra
- `-Stock` — `in_stock` (def.) / `out_of_stock` / `preorder`
- `-NoSitemap`, `-NoPlaceholderImage`

## Que revisar despues de ejecutarlo

1. **Imagenes (obligatorio):** coloca `img/1.<ext> ... N.<ext>` optimizadas (WebP, max 1400px).
   El `1.jpg` que crea es solo un placeholder temporal.
2. **Descripcion** comercial real (`.desc`) y **tabla de especificaciones** completa.
3. Precio / comparativa y, si aplica, el ID de PayPal.

## Notas

- La ficha sale lista y consistente con el resto: el badge de descuento, el sello DGT (si el
  catalogo marca `dgtCertified`) y demas se aplican via reglas globales (CSS en `tarjetas.css`
  / `main.css`) y `product-enhancements.js`. No hay que tocar nada por ficha.
- Si no pasas datos tecnicos, la ficha usa valores `Pendiente`.
- El script no optimiza imagenes (ver memoria de optimizacion de imagenes).
