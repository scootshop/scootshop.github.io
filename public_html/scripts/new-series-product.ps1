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

  # Plantilla / contenido
  [int]$ImageCount = 1,
  [string]$ImageExt = 'webp',
  [string]$VideoId,
  [string]$VideoTitle,
  [string]$Description,
  [string]$Subtitle,
  [string]$PayPalId,

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
    [string]$SeriesLabelValue,
    [string]$ImageBaseRel,
    [string]$ImageExtValue,
    [int]$ImageCountValue
  )

  $homeTitle = "$NameValue - Patinete eléctrico ($SeriesLabelValue)"
  $homeAriaLabel = "$NameValue - $SeriesLabelValue"
  $priceAriaLabel = "Precio $NameValue"

  $galleryItems = @()
  for ($i = 1; $i -le [math]::Max(1, $ImageCountValue); $i++) {
    $src = "$ImageBaseRel$i.$ImageExtValue"
    $alt = "$NameValue vista $i"
    $galleryItems += "        { src: '$(Escape-JsString $src)', alt: '$(Escape-JsString $alt)' }"
  }
  $galleryBlock = ($galleryItems -join ",`r`n")

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
$galleryBlock
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
    [string]$ImageBaseRel,
    [string]$ImageExtValue,
    [int]$ImageCountValue,
    [string]$StockValue,
    [string]$PriceNumber,
    [int]$DiscountPct,
    [string]$DescriptionValue,
    [string]$SubtitleValue,
    [string]$VideoIdValue,
    [string]$VideoTitleValue,
    [string]$PayPalIdValue
  )

  $stockLabel = switch ($StockValue) {
    'out_of_stock' { 'Agotado' }
    'preorder' { 'Reserva disponible' }
    default { 'Disponible en stock' }
  }

  $stockSchema = switch ($StockValue) {
    'out_of_stock' { 'https://schema.org/OutOfStock' }
    'preorder' { 'https://schema.org/PreOrder' }
    default { 'https://schema.org/InStock' }
  }

  $imageMain = "$ImageBaseRel" + "1.$ImageExtValue"
  # Base sin extension, para el srcset responsive del #mainImage. Las variantes
  # -400/-600/-800/-1000 las genera scripts/build-card-shots.py; si aun no
  # existen, global-assets-app.js retira el srcset y usa el original.
  $imageMainBase = "$ImageBaseRel" + "1"
  $count = [math]::Max(1, $ImageCountValue)

  # --- Meta / descripciones ---
  $metaDesc = if ($DescriptionValue) {
    ($DescriptionValue -replace '<[^>]+>', '')
  } else {
    "${NameValue}: ficha técnica y detalles del modelo. Motor $MotorValue, batería $BatteryValue, autonomía $RangeValue. Envío gratis 5-7 días hábiles."
  }
  $subtitle = if ($SubtitleValue) { $SubtitleValue } else { "$SeriesLabelValue · ficha técnica" }

  # --- Descripción comercial (con <strong>) ---
  $descHtml = if ($DescriptionValue) {
    $DescriptionValue
  } else {
    "El <strong>$BrandValue $NameValue</strong> ofrece motor <strong>$MotorValue</strong>, batería <strong>$BatteryValue</strong>, autonomía <strong>$RangeValue</strong> y velocidad máxima <strong>$TopSpeedValue</strong>, con ruedas de <strong>$WheelValue</strong>. (Edita esta descripción con el copy comercial real del producto.)"
  }

  # --- CTA / checkout ---
  $buyHref = "/checkout?name=$([uri]::EscapeDataString($NameValue))&sku=$([uri]::EscapeDataString($SkuValue))&price=$([uri]::EscapeDataString($PriceNumber))&url=$([uri]::EscapeDataString($CanonicalPath))&image=$([uri]::EscapeDataString($imageMain))"
  if ($PayPalIdValue) {
    $buyHref += "&paypal=$([uri]::EscapeDataString($PayPalIdValue))&hid=$([uri]::EscapeDataString($PayPalIdValue))"
  }

  # --- Miniaturas de galería ---
  $thumbItems = @()
  for ($i = 1; $i -le $count; $i++) {
    $cls = if ($i -eq 1) { 'thumb active' } else { 'thumb' }
    $src = "$ImageBaseRel$i.$ImageExtValue"
    $thumbItems += @"
              <button class="$cls" data-img="$src" type="button" aria-label="Ver imagen $i">
                <img src="$src`?v=$AssetVersion" alt="$NameValue vista $i" loading="lazy" decoding="async">
              </button>
"@
  }
  $thumbsBlock = ($thumbItems -join "`r`n")

  # --- Bloque de precio (price-values + badge calculado) ---
  $priceExtra = ''
  if ($DiscountPct -gt 0) {
    $priceExtra = @"

            <span class="price-was">$CompareAtTextValue</span>
            <span class="discount-badge">-$DiscountPct%</span>
"@
  }

  # --- Vídeo unboxing opcional ---
  $videoBlock = ''
  if ($VideoIdValue) {
    $vTitle = if ($VideoTitleValue) { $VideoTitleValue } else { "Unboxing del $NameValue" }
    $videoBlock = @"

          <section class="product-media-block" aria-labelledby="unboxingTitle">
            <div class="product-media-head">
              <div>
                <h2 id="unboxingTitle">Unboxing en video</h2>
                <p>Vista real de $NameValue.</p>
              </div>
            </div>

            <div class="video-embed-frame">
              <iframe
                src="https://www.youtube-nocookie.com/embed/$VideoIdValue`?rel=0"
                title="$vTitle"
                loading="lazy"
                referrerpolicy="strict-origin-when-cross-origin"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen>
              </iframe>
            </div>
          </section>
"@
  }

  # --- JSON-LD: imágenes (máx 4) ---
  $ldMax = [math]::Min($count, 4)
  $ldImageItems = @()
  for ($i = 1; $i -le $ldMax; $i++) {
    $ldImageItems += "          `"https://scootshop.co$ImageBaseRel$i.$ImageExtValue`""
  }
  $ldImages = ($ldImageItems -join ",`r`n")
  $priceValidUntil = "$([DateTime]::Now.Year)-12-31"

@"
<!DOCTYPE html>
<html lang="es-ES">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />

  <title>$NameValue — Ficha técnica | SCOOT SHOP</title>
  <meta name="description" content="$metaDesc" />
  <meta name="robots" content="index,follow,max-image-preview:large" />
  <meta name="format-detection" content="telephone=no" />

  <link rel="canonical" href="https://scootshop.co$CanonicalPath" />

  <meta name="asset-version" content="$AssetVersion" />
  <!-- Ficha SIEMPRE arriba: reset al tope en inline + DOMContentLoaded + 2 frames (vence el carry de scroll del WebView de apps). -->
  <script>(function(){try{if('scrollRestoration' in history)history.scrollRestoration='manual';var t=function(){try{window.scrollTo(0,0);}catch(e){}};t();document.addEventListener('DOMContentLoaded',function(){t();requestAnimationFrame(function(){t();requestAnimationFrame(t);});},{once:true});addEventListener('pageshow',function(e){if(e&&e.persisted)t();});}catch(e){}})();</script>

  <!-- FAVICON -->
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
  <meta name="color-scheme" content="only light" />

  <!-- Open Graph (estatico: las previews de WhatsApp/Facebook/Twitter NO ejecutan JS) -->
  <meta property="og:url" content="https://scootshop.co$CanonicalPath" />
  <meta property="og:title" content="$NameValue — Ficha técnica | SCOOT SHOP" />
  <meta property="og:description" content="$metaDesc" />
  <meta property="og:type" content="product" />
  <meta property="og:site_name" content="SCOOT SHOP" />
  <meta property="og:locale" content="es_ES" />
  <meta property="og:image" content="https://scootshop.co$imageMain" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="$NameValue — Ficha técnica | SCOOT SHOP" />
  <meta name="twitter:description" content="$metaDesc" />
  <meta name="twitter:image" content="https://scootshop.co$imageMain" />

  <!-- Performance -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="dns-prefetch" href="//www.youtube-nocookie.com" />

  <!-- Fonts + Icons (non-blocking) -->
  <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Russo+One&family=Tangerine:wght@700&family=Plus+Jakarta+Sans:wght@400;700;800&display=swap" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Russo+One&family=Tangerine:wght@700&family=Plus+Jakarta+Sans:wght@400;700;800&display=swap" media="print" onload="this.media='all'" />
  <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Russo+One&family=Tangerine:wght@700&family=Plus+Jakarta+Sans:wght@400;700;800&display=swap" /></noscript>
  <link rel="stylesheet" href="/css/icons.css?v=$AssetVersion">

  <!-- Base CSS (fallback for menu + layout) -->
  <link rel="stylesheet" href="/css/main.css?v=$AssetVersion">
  <link rel="stylesheet" href="/css/partials.mobile-menu.css?v=$AssetVersion">
  <link rel="stylesheet" href="/css/tarjetas.css?v=$AssetVersion">

  <!-- Asset loader (partials, cache busting, common UI, mobile menu) -->
  <script src="/js/global-assets.js?v=$AssetVersion" defer></script>
</head>

<body>
  <!-- Header comun -->
  <div id="site-header-slot"></div>

  <!-- Menu movil comun -->
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
          <div class="subtitle">$subtitle</div>
        </div>
        <div class="badge-min">
          <i class="fa-solid fa-bolt" aria-hidden="true"></i> $BrandValue
        </div>
      </div>

      <div class="layout" aria-label="Galería e información técnica $NameValue">
        <div class="layout-media">
          <section class="gallery" aria-label="Imágenes $NameValue">
            <div class="gallery-main">
              <img src="$imageMain`?v=$AssetVersion" srcset="$imageMainBase-400.webp`?v=$AssetVersion 400w, $imageMainBase-600.webp`?v=$AssetVersion 600w, $imageMainBase-800.webp`?v=$AssetVersion 800w, $imageMainBase-1000.webp`?v=$AssetVersion 1000w" sizes="(max-width:980px) 84vw, 33vw" alt="$NameValue vista principal" id="mainImage" loading="eager" fetchpriority="high" decoding="async">
            </div>

            <div class="thumbs" aria-label="Miniaturas $NameValue">
$thumbsBlock
            </div>
          </section>
$videoBlock
        </div>

        <aside class="panel" aria-label="Ficha técnica $NameValue">
          <div class="price-row" aria-label="Precio $NameValue">
            <span class="price-values">
              <span class="price-now">$PriceTextValue</span>$priceExtra
            </span>
            <!-- Aviso de stock. Va vacío de decisiones a propósito: el texto y el
                 estado (--in/--out) los pone ensureStockNote() leyendo el stock del
                 catálogo, y el diseño vive entero en el bloque "AVISO DE STOCK" de
                 css/tarjetas.css. Si la ficha acaba teniendo selector de color, el
                 JS lo mueve solo a la cabecera del selector. No tocar por ficha. -->
            <p class="stock-note stock-note--in">Stock</p>
          </div>

          <div class="panel-inner">
            <p class="desc" data-copy-lock="true">
              $descHtml
            </p>

            <!-- Aquí iba .quick-specs (3 pills: autonomía/motor/batería). Eliminado
                 del sitio entero en agosto 2026: la zona entre .desc y .cta-col queda
                 reservada al bloque de accesorio compatible (elegir modelo + añadir
                 al carrito sin salir de la ficha). NO reintroducir las pills aquí:
                 el CSS de .quick-specs/.pill ya no existe en tarjetas.css. -->

            <div class="cta-col cta-col--with-cart">
              <a href="$buyHref" class="btn-main" aria-label="Comprar $NameValue">
                <i class="fa-solid fa-bag-shopping" aria-hidden="true"></i> Comprar ahora
              </a>

              <button type="button" class="btn-cart" data-add-to-cart="true" data-product-cart-btn="true" data-added-label="Añadido" data-sku="$SkuValue" data-name="$NameValue" data-price="$PriceTextValue" data-url="$CanonicalPath" data-image="$imageMain" data-color-key="" data-color="" data-color-label="" data-stock="in_stock" aria-label="Añadir al carrito $NameValue">
                <i class="fa-solid fa-cart-plus" aria-hidden="true"></i> Añadir
              </button>

              <a href="#" class="btn-reserve" id="reserveBtn" aria-label="Reservar $NameValue por WhatsApp">
                <i class="fab fa-whatsapp" aria-hidden="true"></i> Reservar
              </a>
            </div>

            <div class="shipping-box" aria-label="Envío y preparación">
              <div><strong>Envío gratis</strong> (Península)</div>
              <div>Preparación: <strong>1 día hábil</strong> · Tránsito: <strong>5–7 días hábiles</strong></div>
            </div>

            <div class="spec-acc" aria-label="Especificaciones">
              <button class="spec-acc-btn" type="button" aria-expanded="false" aria-controls="specTable">
                <span>Ficha técnica</span>
                <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
              </button>

              <div id="specTable" class="spec-acc-panel" hidden>
                <div class="spec-table" aria-label="Especificaciones $NameValue">
                  <div class="spec-row"><div class="spec-label">Modelo</div><div class="spec-value">$BrandValue $NameValue ($SeriesLabelValue)</div></div>
                  <div class="spec-row"><div class="spec-label">Velocidad max.</div><div class="spec-value">$TopSpeedValue</div></div>
                  <div class="spec-row"><div class="spec-label">Motor</div><div class="spec-value">$MotorValue</div></div>
                  <div class="spec-row"><div class="spec-label">Autonomía</div><div class="spec-value">$RangeValue</div></div>
                  <div class="spec-row"><div class="spec-label">Batería</div><div class="spec-value">$BatteryValue</div></div>
                  <div class="spec-row"><div class="spec-label">Ruedas</div><div class="spec-value">$WheelValue</div></div>
                  <div class="spec-row"><div class="spec-label">Estado</div><div class="spec-value">$stockLabel</div></div>
                  <div class="spec-row"><div class="spec-label">Nota</div><div class="spec-value">Completar frenos, suspensión, pantalla, peso, dimensiones e iluminación.</div></div>
                </div>
              </div>
            </div>

            <p class="mini-note">
              Garantía legal de conformidad aplicable en España para consumidores. Datos orientativos: el rendimiento real depende de condiciones de uso, mantenimiento y normativa aplicable.
            </p>
          </div>
        </aside>
      </div>
    </section>

    <footer>
      &copy; <span id="y"></span> SCOOT SHOP · <a href="/#legal">Legal</a>
    </footer>
  </main>

  <!-- JSON-LD -->
  <script type="application/ld+json">
  {
    "@context":"https://schema.org",
    "@graph":[
      {
        "@type":"Organization",
        "@id":"https://scootshop.co/#org",
        "name":"SCOOT SHOP",
        "url":"https://scootshop.co/",
        "logo":"https://scootshop.co/img/0-removebg-preview.webp",
        "sameAs":[
          "https://www.instagram.com/scootshopping",
          "https://www.facebook.com/61579248524907"
        ],
        "contactPoint":[
          {
            "@type":"ContactPoint",
            "telephone":"+34-666-318-747",
            "contactType":"customer support",
            "areaServed":"ES",
            "availableLanguage":["es"]
          }
        ]
      },
      {
        "@type":"WebSite",
        "@id":"https://scootshop.co/#website",
        "url":"https://scootshop.co/",
        "name":"SCOOT SHOP",
        "publisher":{"@id":"https://scootshop.co/#org"},
        "inLanguage":"es-ES"
      },
      {
        "@type":"WebPage",
        "@id":"https://scootshop.co$CanonicalPath#webpage",
        "url":"https://scootshop.co$CanonicalPath",
        "name":"$NameValue — Ficha técnica | SCOOT SHOP",
        "isPartOf":{"@id":"https://scootshop.co/#website"},
        "about":{"@id":"https://scootshop.co/#org"},
        "primaryImageOfPage":{"@type":"ImageObject","url":"https://scootshop.co$imageMain"},
        "inLanguage":"es-ES"
      },
      {
        "@type":"Product",
        "@id":"https://scootshop.co$CanonicalPath#product",
        "name":"$NameValue — Patinete eléctrico",
        "image":[
$ldImages
        ],
        "brand":{"@type":"Brand","name":"$BrandValue"},
        "sku":"$SkuValue",
        "description":"$metaDesc",
        "offers":{
          "@type":"Offer",
          "url":"https://scootshop.co$CanonicalPath",
          "price":"$PriceNumber",
          "priceCurrency":"EUR",
          "priceValidUntil":"$priceValidUntil",
          "availability":"$stockSchema",
          "itemCondition":"https://schema.org/NewCondition",
          "seller":{"@id":"https://scootshop.co/#org"},
          "shippingDetails":{
            "@type":"OfferShippingDetails",
            "shippingDestination":{"@type":"DefinedRegion","addressCountry":"ES"},
            "shippingRate":{"@type":"MonetaryAmount","value":"0.00","currency":"EUR"},
            "deliveryTime":{
              "@type":"ShippingDeliveryTime",
              "handlingTime":{"@type":"QuantitativeValue","minValue":1,"maxValue":1,"unitCode":"DAY"},
              "transitTime":{"@type":"QuantitativeValue","minValue":5,"maxValue":7,"unitCode":"DAY"}
            }
          },
          "hasMerchantReturnPolicy":{
            "@type":"MerchantReturnPolicy",
            "applicableCountry":"ES",
            "returnPolicyCategory":"https://schema.org/MerchantReturnFiniteReturnWindow",
            "merchantReturnDays":30,
            "returnMethod":"https://schema.org/ReturnByMail",
            "returnFees":"https://schema.org/ReturnFeesCustomerResponsibility",
            "url":"https://scootshop.co/legal/"
          }
        }
      }
    ]
  }
  </script>

  <script src="/data/products.js?v=$AssetVersion"></script>
  <script src="/js/product-enhancements.js?v=$AssetVersion"></script>
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
$resolvedExt = ($ImageExt.Trim().TrimStart('.')).ToLowerInvariant()
$imageCountSafe = [math]::Max(1, $ImageCount)
$priceText = Format-EuroText -Value $Price
$hasCompare = $PSBoundParameters.ContainsKey('CompareAtPrice') -and ($CompareAtPrice -gt $Price)
$compareText = if ($hasCompare) { Format-EuroText -Value $CompareAtPrice } else { $priceText }
$discountPct = if ($hasCompare) { [int][math]::Round((1 - ($Price / $CompareAtPrice)) * 100) } else { 0 }
$priceNumber = ('{0:0.00}' -f $Price).Replace(',', '.')
$rootRelative = "/patinetes/$seriesFolder/$cleanSlug/"
$imageBaseRel = $rootRelative + 'img/'
$imageRelative = "$imageBaseRel" + "1.$resolvedExt"
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
  # Placeholder temporal (jpg). Sustituir por img/1.$resolvedExt ... N optimizadas.
  Copy-Item -Path $placeholderImage -Destination (Join-Path $productImageFolder '1.jpg') -Force
}

$pageHtml = Build-ProductPage -AssetVersion $assetVersion -NameValue $resolvedName -SeriesLabelValue $seriesLabel -BrandValue $resolvedBrand -PriceTextValue $priceText -CompareAtTextValue $compareText -MotorValue $MotorText.Trim() -BatteryValue $BatteryText.Trim() -RangeValue $RangeText.Trim() -TopSpeedValue $TopSpeedText.Trim() -WheelValue $WheelText.Trim() -SkuValue $resolvedSku -CanonicalPath $rootRelative -ImageBaseRel $imageBaseRel -ImageExtValue $resolvedExt -ImageCountValue $imageCountSafe -StockValue $Stock -PriceNumber $priceNumber -DiscountPct $discountPct -DescriptionValue $Description -SubtitleValue $Subtitle -VideoIdValue $VideoId -VideoTitleValue $VideoTitle -PayPalIdValue $PayPalId
Set-Content -Path $productIndex -Value $pageHtml -Encoding UTF8

$productEntry = Build-ProductEntry -Id $productId -SkuValue $resolvedSku -NameValue $resolvedName -BrandValue $resolvedBrand -SeriesValue $SeriesKey -CategoryValue $CategoryKey -PriceTextValue $priceText -CompareAtTextValue $compareText -StockValue $Stock -HrefValue $rootRelative -ImageValue $imageRelative -AltValue ("Patinete eléctrico " + $resolvedName) -MotorValue $MotorText.Trim() -RangeValue $RangeText.Trim() -BatteryValue $BatteryText.Trim() -SeriesLabelValue $seriesLabel -ImageBaseRel $imageBaseRel -ImageExtValue $resolvedExt -ImageCountValue $imageCountSafe
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

Write-Output 'Alta de producto completada (ficha canonica generada).'
Write-Output ("Producto: {0} ({1})" -f $resolvedName, $resolvedSku)
Write-Output ("Carpeta:  {0}" -f $productFolder)
Write-Output ("Ficha:    {0}" -f $productIndex)
if ($discountPct -gt 0) {
  Write-Output ("Descuento: -{0}% ({1} -> {2})" -f $discountPct, $compareText, $priceText)
}
Write-Output 'Catalogo: data/products.js actualizado'
if (-not $NoSitemap) {
  Write-Output 'Sitemap:  sitemap.xml actualizado'
}
# Variantes responsive de la portada. Aqui normalmente avisara de que falta la
# imagen real (el scaffold solo deja un placeholder), que es justo lo que
# queremos: el aviso forma parte del "siguiente paso".
$cardShotsScript = Join-Path $PSScriptRoot 'build-card-shots.py'
$cardShotsPending = $true
if (Test-Path $cardShotsScript) {
  try {
    & python $cardShotsScript --quiet 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { $cardShotsPending = $false }
  } catch {
    Write-Warning "No se pudo ejecutar build-card-shots.py: $($_.Exception.Message)"
  }
}

Write-Output ''
Write-Output 'SIGUIENTE PASO OBLIGATORIO:'
Write-Output ("  1. Coloca las imagenes optimizadas en {0} como 1.{1} ... {2}.{1} (WebP, max 1400px)." -f $productImageFolder, $resolvedExt, $imageCountSafe)
if ($cardShotsPending) {
  Write-Output '  2. Ejecuta:  python scripts/build-card-shots.py'
  Write-Output '     (genera las variantes -400/-600/-800 de la portada que usa el srcset de la tarjeta;'
  Write-Output '      sin ellas la tarjeta se sirve con la foto grande. El bump tambien las genera solo.)'
  Write-Output '  3. Edita la descripcion comercial (.desc) y la tabla de especificaciones reales.'
  Write-Output '  4. Revisa precio/comparativa y, si aplica, el ID de PayPal (-PayPalId).'
} else {
  Write-Output '  2. Edita la descripcion comercial (.desc) y la tabla de especificaciones reales.'
  Write-Output '  3. Revisa precio/comparativa y, si aplica, el ID de PayPal (-PayPalId).'
  Write-Output '  (Variantes responsive de la portada: generadas.)'
}
