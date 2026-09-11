# scripts/qa/variantes.ps1
#
# TODAS las comprobaciones del sistema de variantes, de una vez.
#
# Existe porque estas suites nacieron en carpetas temporales de una sesión y cada
# verificación posterior se hacía "a ojo". Lo que comprueba un guardián que nadie
# puede ejecutar es nada.
#
#   powershell -ExecutionPolicy Bypass -File scripts/qa/variantes.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/qa/variantes.ps1 -BaseUrl https://scootshop.co
#
# Marcador final, y son TRES:
#   VARIANTES_OK        todas se ejecutaron y pasaron        (salida 0)
#   VARIANTES_KO        alguna se ejecuto y fallo            (salida 1)
#   VARIANTES_PARCIAL   alguna NO se pudo ejecutar           (salida 2)
# Una omitida no es un aprobado: dice que esa parte no se ha comprobado.
param(
  [string]$BaseUrl = 'http://127.0.0.1:8000'
)

$ErrorActionPreference = 'Continue'
$qa = Split-Path -Parent $MyInvocation.MyCommand.Path
$raiz = Split-Path -Parent (Split-Path -Parent $qa)

# Datos y núcleo: no hace falta navegador y falla antes que nada si el catálogo miente.
$comprobaciones = @(
  @{ nombre = 'indice de atributos'; script = "$raiz\scripts\build-attributes-index.js"; args = @('--check') },
  @{ nombre = 'catalogo valido';     script = "$qa\catalogo.js";                        args = @() },
  @{ nombre = 'SQL de la API';       script = "$qa\api-sql.js";                         args = @() },
  @{ nombre = 'capa operativa';    script = "$qa\catalogo-overrides.js";              args = @($BaseUrl) },
  @{ nombre = 'casos A-J';           script = "$qa\variantes-casos.js";                 args = @($BaseUrl) },
  @{ nombre = 'fichas multieje';     script = "$qa\variantes-multieje.js";              args = @($BaseUrl) },
  @{ nombre = 'flujo al carrito';    script = "$qa\variantes-flujo.js";                 args = @($BaseUrl) },
  @{ nombre = 'accesibilidad';       script = "$qa\variantes-a11y.js";                  args = @($BaseUrl) },
  @{ nombre = 'globalizacion';       script = "$qa\variantes-globalizacion.js";         args = @($BaseUrl) },
  @{ nombre = 'chips de resumen';    script = "$qa\variantes-chips.js";                 args = @($BaseUrl) },
  @{ nombre = 'readiness';           script = "$qa\variantes-ready.js";                 args = @($BaseUrl) }
)

# TRES RESULTADOS, NO DOS. Una suite que no se puede ejecutar —porque falta
# Playwright o el entorno— sale con 2 y NO cuenta como que paso. Antes salia con 0
# y esto imprimia VARIANTES_OK habiendose saltado ocho de las once comprobaciones:
# un guardian que miente es peor que no tenerlo. Ver scripts/qa/_playwright.js.
#
#   0  paso        1  fallo        2  omitida (no se pudo ejecutar)
$fallos   = @()
$omitidas = @()
$pasadas  = @()
foreach ($c in $comprobaciones) {
  Write-Host ''
  Write-Host ('== ' + $c.nombre + ' ==')
  & node $c.script @($c.args)
  if     ($LASTEXITCODE -eq 0) { $pasadas  += $c.nombre }
  elseif ($LASTEXITCODE -eq 2) { $omitidas += $c.nombre }
  else                         { $fallos   += $c.nombre }
}

Write-Host ''
Write-Host ('resumen: ' + $pasadas.Count + ' pasan, ' + $fallos.Count + ' fallan, ' + $omitidas.Count + ' omitidas (de ' + $comprobaciones.Count + ')')

# Un fallo manda sobre una omision: si algo se ha roto, eso es lo que hay que ver.
if ($fallos.Count -gt 0) {
  Write-Host ('VARIANTES_KO  fallan: ' + ($fallos -join ', '))
  if ($omitidas.Count -gt 0) { Write-Host ('  ademas OMITIDAS: ' + ($omitidas -join ', ')) }
  exit 1
}
if ($omitidas.Count -gt 0) {
  Write-Host ('VARIANTES_PARCIAL  ' + $omitidas.Count + ' omitidas: ' + ($omitidas -join ', '))
  Write-Host '  NO se ha comprobado el sistema entero. Instala lo que falte y vuelve a correrlo:'
  Write-Host '    npm install  &&  npx playwright install chromium'
  exit 2
}
Write-Host ('VARIANTES_OK  ' + $pasadas.Count + ' comprobaciones, todas ejecutadas')
exit 0
