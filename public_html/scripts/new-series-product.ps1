param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('k', 'n', 'gt', 'ix')]
  [string]$SeriesKey,

  [Parameter(Mandatory = $true)]
  [string]$Slug,

  [Parameter(Mandatory = $true)]
  [string]$Name,

  [Parameter(Mandatory = $true)]
  [decimal]$Price,

  [string]$Brand,
  [decimal]$CompareAtPrice,
  [string]$Sku,
  [string]$MotorText = 'Pendiente',
  [string]$BatteryText = 'Pendiente',
  [string]$RangeText = 'Pendiente',
  [string]$TopSpeedText = 'Pendiente',
  [string]$WheelText = 'Pendiente',
  [string]$CategoryKey = 'electric-scooters',
  [ValidateSet('in_stock', 'out_of_stock', 'preorder')]
  [string]$Stock = 'in_stock',
  [switch]$NoSitemap,
  [switch]$NoPlaceholderImage
)

$ErrorActionPreference = 'Stop'

function Get-SeriesLabel {
  param([string]$Key)

  switch ($Key) {
    'k' { 'Serie K' }
    'n' { 'Serie N' }
    'gt' { 'Serie GT' }
    'ix' { 'Serie IX' }
    default { throw "Serie no soportada: $Key" }
  }
}

function Get-SeriesFolder {
  param([string]$Key)
  "series-$Key"
}

function Get-AssetVersion {
  param([string]$ProjectRoot)

  $assetPath = Join-Path $ProjectRoot 'asset-version.json'
  if (-not (Test-Path $assetPath)) {
    return '1'
  }

  try {
    $asset = Get-Content $assetPath -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($asset.v) {
      return [string]$asset.v
    }
  } catch {
  }

  '1'
}

function ConvertTo-AsciiSlug {
  param([string]$Value)

  $normalized = $Value.Normalize([Text.NormalizationForm]::FormD)
  $builder = New-Object System.Text.StringBuilder
  foreach ($char in $normalized.ToCharArray()) {
    $category = [Globalization.CharUnicodeInfo]::GetUnicodeCategory($char)
    if ($category -ne [Globalization.UnicodeCategory]::NonSpacingMark) {
      [void]$builder.Append($char)
    }
  }

  $ascii = $builder.ToString().Normalize([Text.NormalizationForm]::FormC).ToLowerInvariant()
  $ascii = $ascii -replace '[^a-z0-9]+', '-'
  $ascii = $ascii.Trim('-')

  if (-not $ascii) {
    throw 'No se pudo generar un slug ASCII valido.'
  }

  $ascii
}

function Format-EuroText {
  param([decimal]$Value)

  $euroSymbol = [char]0x20AC

  if ($Value -eq [math]::Floor($Value)) {
    return ('{0} {1}' -f [int]$Value, $euroSymbol)
  }

  ('{0:0.##} {1}' -f $Value, $euroSymbol).Replace('.', ',')
}

function Escape-JsString {
  param([string]$Value)

  if ($null -eq $Value) {
    return ''
  }

  $escaped = $Value.Replace('\', '\\')
  $escaped = $escaped.Replace("'", "\'")
  $escaped
}

function Build-ProductEntry {
  param(
    [string]$Id,
    [string]$SkuValue,
    [string]$NameValue,
    [string]$BrandValue,
    [string]$SeriesValue,
    [string]$CategoryValue,
    [string]$PriceTextValue,
    [string]$CompareAtTextValue,
    [string]$StockValue,
    [string]$HrefValue,
    [string]$ImageValue,
    [string]$AltValue,
    [string]$MotorValue,
    [string]$RangeValue,
    [string]$BatteryValue,
    [string]$SeriesLabelValue
  )

  $homeTitle = "$NameValue - Patinete eléctrico ($SeriesLabelValue)"
  $homeAriaLabel = "$NameValue - $SeriesLabelValue"
  $priceAriaLabel = "Precio $NameValue"
  $imageAlt = "$NameValue vista 1"

@"
    {
      id: '$(Escape-JsString $Id)',
      sku: '$(Escape-JsString $SkuValue)',
      name: '$(Escape-JsString $NameValue)',
      menuLabel: '$(Escape-JsString $NameValue)',
      badgeText: '$(Escape-JsString $NameValue)',
      brand: '$(Escape-JsString $BrandValue)',
      series: '$(Escape-JsString $SeriesValue)',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: '$(Escape-JsString $CategoryValue)',
      priceText: '$(Escape-JsString $PriceTextValue)',
      compareAtPriceText: '$(Escape-JsString $CompareAtTextValue)',
      stock: '$(Escape-JsString $StockValue)',
      href: '$(Escape-JsString $HrefValue)',
      image: '$(Escape-JsString $ImageValue)',
      alt: '$(Escape-JsString $AltValue)',
      specs: ['$(Escape-JsString $MotorValue)', '$(Escape-JsString $RangeValue)', '$(Escape-JsString $BatteryValue)'],
      homeOrder: 999,
      homeTitle: '$(Escape-JsString $homeTitle)',
      homeAriaLabel: '$(Escape-JsString $homeAriaLabel)',
      priceAriaLabel: '$(Escape-JsString $priceAriaLabel)',
      gallery: [
        { src: '$(Escape-JsString $ImageValue)', alt: '$(Escape-JsString $imageAlt)' }
      ]
    }
"@
}

function Build-ProductPage {
  param(
    [string]$AssetVersion,
    [string]$NameValue,
    [string]$SeriesLabelValue,
    [string]$BrandValue,
    [string]$PriceTextValue,
    [string]$CompareAtTextValue,
    [string]$MotorValue,
    [string]$BatteryValue,
    [string]$RangeValue,
    [string]$TopSpeedValue,
    [string]$WheelValue,
    [string]$SkuValue,
    [string]$CanonicalPath,
    [string]$ImagePath,
    [string]$StockValue,
    [string]$PriceNumber
  )

  $stockLabel = switch ($StockValue) {
    'out_of_stock' { 'Agotado' }
    'preorder' { 'Reserva disponible' }
    default { 'Disponible' }
  }

  $stockSchema = switch ($StockValue) {
    'out_of_stock' { 'https://schema.org/OutOfStock' }
    'preorder' { 'https://schema.org/PreOrder' }
    default { 'https://schema.org/InStock' }
  }

  $buyHref = "/pago?name=$([uri]::EscapeDataString($NameValue))&sku=$([uri]::EscapeDataString($SkuValue))&price=$([uri]::EscapeDataString($PriceNumber))&url=$([uri]::EscapeDataString($CanonicalPath))&image=$([uri]::EscapeDataString($ImagePath))"
  $description = "${NameValue}: motor $MotorValue, batería $BatteryValue, autonomía $RangeValue, velocidad máxima $TopSpeedValue y ruedas $WheelValue."

@"
<!DOCTYPE html>
<html lang="es-ES">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />

  <title>$NameValue - Ficha técnica | SCOOT SHOP</title>
  <meta name="description" content="$description" />
  <meta name="robots" content="index,follow,max-image-preview:large" />
  <meta name="format-detection" content="telephone=no" />

  <link rel="canonical" href="https://scootshop.co$CanonicalPath" />
  <meta name="asset-version" content="$AssetVersion" />

  <link rel="icon" href="/favicon.ico?v=$AssetVersion" sizes="any">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg?v=$AssetVersion">
  <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png?v=$AssetVersion">
  <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png?v=$AssetVersion">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=$AssetVersion">
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png?v=$AssetVersion">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=$AssetVersion">
  <link rel="manifest" href="/site.webmanifest?v=$AssetVersion">
  <meta name="theme-color" content="#ffffff">
  <meta name="apple-mobile-web-app-title" content="SCOOT SHOP">
  <meta name="application-name" content="SCOOT SHOP">
  <meta name="color-scheme" content="light" />

  <meta property="og:url" content="https://scootshop.co$CanonicalPath" />
  <meta property="og:title" content="$NameValue - Ficha técnica | SCOOT SHOP" />
  <meta property="og:description" content="$description" />
  <meta property="og:type" content="product" />
  <meta property="og:site_name" content="SCOOT SHOP" />
  <meta property="og:locale" content="es_ES" />
  <meta property="og:image" content="https://scootshop.co$ImagePath" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="$NameValue - Ficha técnica | SCOOT SHOP" />
  <meta name="twitter:description" content="$description" />
  <meta name="twitter:image" content="https://scootshop.co$ImagePath" />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

  <link href="https://fonts.googleapis.com/css2?family=Russo+One&family=Tangerine:wght@700&family=Plus+Jakarta+Sans:wght@400;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/icons.css?v=$AssetVersion">

  <link rel="stylesheet" href="/css/main.css?v=$AssetVersion">
  <link rel="stylesheet" href="/css/tarjetas.css?v=$AssetVersion">

  <script src="/js/global-assets.js"></script>
</head>
<body>
  <div id="site-header-slot"></div>
  <div id="mobile-menu-slot"></div>

  <main id="main-content" class="page-wrap">
    <section class="container">
      <nav class="breadcrumb" aria-label="Ruta">
        <a href="/">Inicio</a>
        <span>/</span>
        <a href="/#comprar">$SeriesLabelValue</a>
        <span>/</span>
        <span>$NameValue</span>
      </nav>

      <div class="page-title">
        <div class="title-left">
          <h1>$NameValue</h1>
          <div class="subtitle">$SeriesLabelValue | $MotorValue | $BatteryValue | $RangeValue</div>
        </div>
        <div class="badge-min">
          <i class="fa-solid fa-bolt" aria-hidden="true"></i> $BrandValue
        </div>
      </div>

      <div class="layout" aria-label="Galería e información técnica $NameValue">
        <section class="gallery" aria-label="Imágenes $NameValue">
          <div class="gallery-main">
            <img src="$ImagePath?v=$AssetVersion" alt="$NameValue vista principal" id="mainImage" loading="eager" fetchpriority="high" decoding="async">
          </div>

          <div class="thumbs" aria-label="Miniaturas $NameValue">
            <button class="thumb active" data-img="$ImagePath" type="button" aria-label="Ver imagen 1">
              <img src="$ImagePath?v=$AssetVersion" alt="$NameValue vista 1" loading="lazy" decoding="async">
            </button>
          </div>
        </section>

        <aside class="panel" aria-label="Ficha técnica $NameValue">
          <div class="price-row" aria-label="Precio $NameValue">
            <span class="price-now">$PriceTextValue</span>
            <span class="price-was">$CompareAtTextValue</span>
          </div>

          <div class="panel-inner">
            <p class="desc">
              El <strong>$NameValue</strong> es un patinete eléctrico de <strong>$SeriesLabelValue</strong>.
              Esta ficha se ha generado como base para que completes los datos técnicos reales del modelo.
            </p>

            <div class="quick-specs" aria-label="Resumen técnico">
              <div class="pill"><span class="pill-label">Autonomía</span><span class="pill-value">$RangeValue</span></div>
              <div class="pill"><span class="pill-label">Motor</span><span class="pill-value">$MotorValue</span></div>
              <div class="pill"><span class="pill-label">Batería</span><span class="pill-value">$BatteryValue</span></div>
            </div>

            <div class="cta-col">
              <a href="$buyHref" class="btn-main" aria-label="Comprar $NameValue">
                <i class="fa-solid fa-bag-shopping" aria-hidden="true"></i> Comprar
              </a>

              <p class="stock-note" aria-live="polite">$stockLabel. Revisa y completa la ficha antes de publicar campañas.</p>

              <a href="#" class="btn-reserve" id="reserveBtn" aria-label="Reservar $NameValue por WhatsApp">
                <i class="fab fa-whatsapp" aria-hidden="true"></i> Reservar
              </a>
            </div>

            <div class="shipping-box" aria-label="Envío y preparación">
              <div><strong>Envío gratis</strong> (Península)</div>
              <div>Preparación: <strong>1 día hábil</strong> | Tránsito: <strong>5-7 días hábiles</strong></div>
            </div>

            <div class="spec-acc" aria-label="Especificaciones">
              <button class="spec-acc-btn" type="button" aria-expanded="false" aria-controls="specTable">
                <span>Ficha técnica</span>
                <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
              </button>

              <div id="specTable" class="spec-acc-panel" hidden>
                <div class="spec-table" aria-label="Especificaciones $NameValue">
                  <div class="spec-row"><div class="spec-label">Modelo</div><div class="spec-value">$NameValue ($SeriesLabelValue)</div></div>
                  <div class="spec-row"><div class="spec-label">Marca</div><div class="spec-value">$BrandValue</div></div>
                  <div class="spec-row"><div class="spec-label">Estado</div><div class="spec-value">$stockLabel</div></div>
                  <div class="spec-row"><div class="spec-label">Motor</div><div class="spec-value">$MotorValue</div></div>
                  <div class="spec-row"><div class="spec-label">Batería</div><div class="spec-value">$BatteryValue</div></div>
                  <div class="spec-row"><div class="spec-label">Autonomía</div><div class="spec-value">$RangeValue</div></div>
                  <div class="spec-row"><div class="spec-label">Velocidad max.</div><div class="spec-value">$TopSpeedValue</div></div>
                  <div class="spec-row"><div class="spec-label">Ruedas</div><div class="spec-value">$WheelValue</div></div>
                  <div class="spec-row"><div class="spec-label">Nota</div><div class="spec-value">Completar medidas, peso, frenos, suspensión e iluminación.</div></div>
                </div>
              </div>
            </div>

            <p class="mini-note">
              Garantía legal de conformidad aplicable en España para consumidores. Completa la ficha técnica antes de lanzar tráfico o campañas.
            </p>
          </div>
        </aside>
      </div>
    </section>

    <footer>
      &copy; <span id="y"></span> SCOOT SHOP | <a href="/#legal">Legal</a>
    </footer>
  </main>

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://scootshop.co/#org",
        "name": "SCOOT SHOP",
        "url": "https://scootshop.co/",
        "logo": "https://scootshop.co/img/0-removebg-preview.png"
      },
      {
        "@type": "Product",
        "@id": "https://scootshop.co$CanonicalPath#product",
        "name": "$NameValue",
        "image": ["https://scootshop.co$ImagePath"],
        "brand": {"@type": "Brand", "name": "$BrandValue"},
        "sku": "$SkuValue",
        "description": "$description",
        "offers": {
          "@type": "Offer",
          "url": "https://scootshop.co$CanonicalPath",
          "price": "$PriceNumber",
          "priceCurrency": "EUR",
          "availability": "$stockSchema",
          "itemCondition": "https://schema.org/NewCondition",
          "seller": {"@id": "https://scootshop.co/#org"}
        }
      }
    ]
  }
  </script>
</body>
</html>
"@
}

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$dataFile = Join-Path $projectRoot 'data\products.js'
$sitemapFile = Join-Path $projectRoot 'sitemap.xml'
$placeholderImage = Join-Path $projectRoot 'img\0.jpg'
$assetVersion = Get-AssetVersion -ProjectRoot $projectRoot
$seriesLabel = Get-SeriesLabel -Key $SeriesKey
$seriesFolder = Get-SeriesFolder -Key $SeriesKey
$cleanSlug = ConvertTo-AsciiSlug -Value $Slug
$resolvedName = $Name.Trim()
$resolvedBrand = if ($Brand) { $Brand.Trim() } else { $resolvedName }
$resolvedSku = if ($Sku) { $Sku.Trim() } else { ($resolvedName -replace '\s+', '').ToUpperInvariant() }
$priceText = Format-EuroText -Value $Price
$compareText = if ($PSBoundParameters.ContainsKey('CompareAtPrice')) { Format-EuroText -Value $CompareAtPrice } else { $priceText }
$priceNumber = ('{0:0.00}' -f $Price).Replace(',', '.')
$rootRelative = "/patinetes/$seriesFolder/$cleanSlug/"
$imageRelative = $rootRelative + 'img/1.jpg'
$productFolder = Join-Path $projectRoot ("patinetes\$seriesFolder\$cleanSlug")
$productImageFolder = Join-Path $productFolder 'img'
$productIndex = Join-Path $productFolder 'index.html'
$productId = $cleanSlug

if (Test-Path $productFolder) {
  throw "La carpeta del producto ya existe: $productFolder"
}
if (-not (Test-Path $dataFile)) {
  throw 'No se encontró data/products.js'
}
if (-not (Test-Path $sitemapFile)) {
  throw 'No se encontró sitemap.xml'
}
if (-not $NoPlaceholderImage -and -not (Test-Path $placeholderImage)) {
  throw 'No se encontró la imagen placeholder en img/0.jpg'
}

$dataContent = Get-Content $dataFile -Raw -Encoding UTF8
if ($dataContent.Contains("href: '$rootRelative'")) {
  throw "Ya existe un producto con href $rootRelative en data/products.js"
}
if ($dataContent.Contains("sku: '$resolvedSku'")) {
  throw "Ya existe un producto con sku $resolvedSku en data/products.js"
}

New-Item -ItemType Directory -Path $productImageFolder -Force | Out-Null
if (-not $NoPlaceholderImage) {
  Copy-Item -Path $placeholderImage -Destination (Join-Path $productImageFolder '1.jpg') -Force
}

$pageHtml = Build-ProductPage -AssetVersion $assetVersion -NameValue $resolvedName -SeriesLabelValue $seriesLabel -BrandValue $resolvedBrand -PriceTextValue $priceText -CompareAtTextValue $compareText -MotorValue $MotorText.Trim() -BatteryValue $BatteryText.Trim() -RangeValue $RangeText.Trim() -TopSpeedValue $TopSpeedText.Trim() -WheelValue $WheelText.Trim() -SkuValue $resolvedSku -CanonicalPath $rootRelative -ImagePath $imageRelative -StockValue $Stock -PriceNumber $priceNumber
Set-Content -Path $productIndex -Value $pageHtml -Encoding UTF8

$productEntry = Build-ProductEntry -Id $productId -SkuValue $resolvedSku -NameValue $resolvedName -BrandValue $resolvedBrand -SeriesValue $SeriesKey -CategoryValue $CategoryKey -PriceTextValue $priceText -CompareAtTextValue $compareText -StockValue $Stock -HrefValue $rootRelative -ImageValue $imageRelative -AltValue ("Patinete eléctrico " + $resolvedName) -MotorValue $MotorText.Trim() -RangeValue $RangeText.Trim() -BatteryValue $BatteryText.Trim() -SeriesLabelValue $seriesLabel
$cloneGalleryIndex = $dataContent.IndexOf('function cloneGallery')
if ($cloneGalleryIndex -lt 0) {
  throw 'No se encontró el marcador function cloneGallery en data/products.js'
}

$arrayCloseIndex = $dataContent.LastIndexOf('];', $cloneGalleryIndex)
if ($arrayCloseIndex -lt 0) {
  throw 'No se encontró el cierre del array products en data/products.js'
}

$dataUpdated = $dataContent.Insert($arrayCloseIndex, ",`r`n$productEntry")
if ($dataUpdated -eq $dataContent) {
  throw 'No se pudo insertar el nuevo producto en data/products.js'
}
Set-Content -Path $dataFile -Value $dataUpdated -Encoding UTF8

if (-not $NoSitemap) {
  $today = Get-Date -Format 'yyyy-MM-dd'
  $urlNode = @"
  <url>
    <loc>https://scootshop.co$rootRelative</loc>
    <lastmod>$today</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
"@
  $sitemapContent = Get-Content $sitemapFile -Raw -Encoding UTF8
  $sitemapUpdated = $sitemapContent -replace '</urlset>', ($urlNode + "`r`n</urlset>")
  if ($sitemapUpdated -eq $sitemapContent) {
    throw 'No se pudo insertar la URL en sitemap.xml'
  }
  Set-Content -Path $sitemapFile -Value $sitemapUpdated -Encoding UTF8
}

Write-Output 'Alta base completada.'
Write-Output ("Producto: {0}" -f $resolvedName)
Write-Output ("Carpeta: {0}" -f $productFolder)
Write-Output ("Ficha: {0}" -f $productIndex)
Write-Output 'Catalogo: data/products.js actualizado'
if (-not $NoSitemap) {
  Write-Output 'Sitemap: sitemap.xml actualizado'
}
Write-Output 'Siguiente paso: completar la ficha técnica real, la galeria y la descripción final.'
