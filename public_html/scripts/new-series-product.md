# Alta rapida de producto por serie

Script: `scripts/new-series-product.ps1`

Crea la base de un nuevo producto en series existentes y actualiza automaticamente:
- la carpeta del producto
- la ficha `index.html`
- la imagen placeholder `img/1.jpg`
- `data/products.js`
- `sitemap.xml`

## Uso minimo

```powershell
.\scripts\new-series-product.ps1 -SeriesKey n -Slug x5 -Name "X5" -Price 499
```

## Uso recomendado

```powershell
.\scripts\new-series-product.ps1 \
  -SeriesKey n \
  -Slug x5 \
  -Name "X5" \
  -Price 499 \
  -Brand "TODIMART" \
  -CompareAtPrice 599 \
  -MotorText "800 W" \
  -BatteryText "48 V 13 Ah" \
  -RangeText "Hasta 45 km" \
  -TopSpeedText "45 km/h" \
  -WheelText "10 pulgadas"
```

## Series soportadas

- `k`
- `n`
- `gt`
- `ix`

## Que revisar despues de ejecutarlo

- texto comercial y descripción final
- galeria real del producto
- ficha técnica completa
- marca si no coincide con el nombre
- precio anterior si aplica

## Notas

- Si no pasas `-Brand`, usa el nombre del producto como marca.
- Si no pasas `-CompareAtPrice`, deja el mismo precio actual.
- Si no pasas datos técnicos, la ficha se crea con valores `Pendiente`.
- Puedes omitir sitemap con `-NoSitemap`.
- Puedes omitir la imagen placeholder con `-NoPlaceholderImage`.
